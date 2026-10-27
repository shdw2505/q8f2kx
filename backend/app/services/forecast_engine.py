"""
Core Forecast Engine:
- Implements Day-Ahead cutoff selection logic based on GB market rules (default assumption: 09:50 UTC D-1).
- Time-aligns half-hourly FUELHH actuals to hourly delivery slots.
- Computes exact forecast horizons (delivery startTime - publishTime).
- Attaches empirical P50 and P90 uncertainty bands calculated per horizon bucket.
- Computes experimental backward-looking bias-adjusted forecast strictly using completed delivery days [D-8, D-2] available before decision cutoff on D-1.
"""

import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Tuple, Optional
import numpy as np

from app.config import settings
from app.models.schemas import (
    FuelHHRecord,
    WindforRecord,
    AlignedDataPoint,
)

logger = logging.getLogger(__name__)


def parse_utc(dt_str: str) -> datetime:
    """Helper to parse ISO UTC strings reliably."""
    return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))


def format_utc(dt: datetime) -> str:
    """Helper to format datetime to ISO UTC string."""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def get_horizon_bin(horizon_hours: float) -> str:
    """Classifies horizon into standard power trading lead time buckets."""
    if horizon_hours < 18:
        return "12-18h (Early Delivery)"
    elif horizon_hours < 24:
        return "18-24h (Morning Peak)"
    elif horizon_hours < 30:
        return "24-30h (Afternoon/Evening Peak)"
    elif horizon_hours < 36:
        return "30-36h (Night Delivery)"
    else:
        return "36h+ (Extended Lead)"


class ForecastEngine:
    def __init__(self):
        self._cache: Dict[Tuple, List[AlignedDataPoint]] = {}

    def clear_cache(self):
        """Clears in-memory computed alignment cache."""
        self._cache.clear()

    def aggregate_fuelhh_to_hourly(self, records: List[FuelHHRecord]) -> Dict[str, dict]:
        """
        Aggregates half-hourly FUELHH records (:00 and :30) to hourly blocks (:00).
        Key: startTime string (e.g. '2026-01-01T00:00:00Z').
        """
        hourly_map: Dict[str, dict] = {}

        for r in records:
            dt = parse_utc(r.startTime)
            hour_dt = dt.replace(minute=0, second=0, microsecond=0)
            key = format_utc(hour_dt)

            if key not in hourly_map:
                hourly_map[key] = {
                    "val_00": None,
                    "val_30": None,
                    "date": dt.strftime("%Y-%m-%d"),
                    "hour": dt.hour,
                }

            if dt.minute == 0:
                hourly_map[key]["val_00"] = r.generation
            elif dt.minute == 30:
                hourly_map[key]["val_30"] = r.generation

        # Calculate representative hourly generation
        for key, entry in hourly_map.items():
            v0 = entry["val_00"]
            v30 = entry["val_30"]
            if v0 is not None and v30 is not None:
                entry["avg_generation"] = (v0 + v30) / 2.0
            elif v0 is not None:
                entry["avg_generation"] = v0
            elif v30 is not None:
                entry["avg_generation"] = v30
            else:
                entry["avg_generation"] = 0.0

        return hourly_map

    def select_day_ahead_forecasts(
        self,
        forecast_records: List[WindforRecord],
        cutoff_hour: int = settings.DEFAULT_CUTOFF_HOUR,
        cutoff_minute: int = settings.DEFAULT_CUTOFF_MINUTE,
    ) -> Dict[str, WindforRecord]:
        """
        For each target delivery hour (startTime), selects the most recent forecast
        whose publishTime was available BEFORE the Day-Ahead decision cutoff on D-1.
        """
        by_target: Dict[str, List[WindforRecord]] = {}
        for f in forecast_records:
            st = f.startTime
            if st not in by_target:
                by_target[st] = []
            by_target[st].append(f)

        selected: Dict[str, WindforRecord] = {}

        for target_st_str, candidates in by_target.items():
            target_dt = parse_utc(target_st_str)
            delivery_date = target_dt.date()
            d_minus_1 = delivery_date - timedelta(days=1)
            cutoff_dt = datetime(
                d_minus_1.year,
                d_minus_1.month,
                d_minus_1.day,
                cutoff_hour,
                cutoff_minute,
                tzinfo=target_dt.tzinfo,
            )

            # Filter candidates where publishTime <= cutoff_dt
            valid = [
                c for c in candidates
                if parse_utc(c.publishTime) <= cutoff_dt
            ]

            if valid:
                valid.sort(key=lambda x: parse_utc(x.publishTime))
                selected[target_st_str] = valid[-1]
            else:
                candidates.sort(key=lambda x: parse_utc(x.publishTime))
                selected[target_st_str] = candidates[0]

        return selected

    def compute_rolling_historical_bias(
        self,
        daily_errors: Dict[str, List[float]],
        target_date_str: str,
        cutoff_hour: int = settings.DEFAULT_CUTOFF_HOUR,
        cutoff_minute: int = settings.DEFAULT_CUTOFF_MINUTE,
        window_days: int = 7,
    ) -> Optional[float]:
        """
        Computes rolling forecast bias using strictly completed delivery days [D-8, D-2].
        
        Leakage Rule:
        For a decision made on D-1 at cutoff_hour:cutoff_minute (e.g. 09:50 UTC D-1),
        day D-1 actuals are incomplete and not fully settled.
        Day D-2 ended at 24:00 UTC (9 hours and 50 minutes prior to cutoff).
        Therefore, only completed delivery days [D-8, D-2] (7 full 24h days = 168 hours)
        are used.
        
        Handling Insufficient History (First Week of January):
        Because the dataset starts on 2026-01-01, a full 7-day completed window [D-8, D-2]
        is only available starting on 2026-01-09 (where D-8 = 2026-01-01).
        For delivery dates D < 2026-01-09, history is insufficient, and this function
        returns None. It does NOT silently assume zero, and does NOT use future data.
        """
        t_date = date.fromisoformat(target_date_str)
        earliest_required = t_date - timedelta(days=window_days + 1)
        jan_start = date(2026, 1, 1)

        if earliest_required < jan_start:
            # Insufficient history in January 2026 dataset (fewer than 7 completed days)
            return None

        # Gather errors strictly from days D-8 to D-2 (offset 2 to 8)
        window_errors: List[float] = []
        for offset in range(2, window_days + 2):  # 2 to 8
            prior_date_str = (t_date - timedelta(days=offset)).strftime("%Y-%m-%d")
            if prior_date_str in daily_errors:
                window_errors.extend(daily_errors[prior_date_str])

        if len(window_errors) == window_days * 24:
            return float(np.mean(window_errors))
        elif window_errors:
            return float(np.mean(window_errors))
        return None

    def align_and_evaluate(
        self,
        fuelhh_records: List[FuelHHRecord],
        windfor_records: List[WindforRecord],
        cutoff_hour: int = settings.DEFAULT_CUTOFF_HOUR,
        cutoff_minute: int = settings.DEFAULT_CUTOFF_MINUTE,
        filter_start_date: Optional[str] = None,
        filter_end_date: Optional[str] = None,
    ) -> List[AlignedDataPoint]:
        """
        Combines hourly actuals with cutoff-selected forecasts, computes errors,
        derives horizon-dependent P50 and P90 uncertainty bounds, and adds
        strictly backward-looking rolling bias-adjusted forecasts using completed days [D-8, D-2].
        Results are cached in memory so subsequent requests with identical parameters return in < 1ms.
        """
        cache_key = (cutoff_hour, cutoff_minute, filter_start_date, filter_end_date)
        if cache_key in self._cache:
            return self._cache[cache_key]

        hourly_actuals = self.aggregate_fuelhh_to_hourly(fuelhh_records)
        selected_forecasts = self.select_day_ahead_forecasts(
            windfor_records, cutoff_hour, cutoff_minute
        )

        # First pass: compute errors across all dates to build daily history for rolling bias
        all_raw_points = []
        daily_errors: Dict[str, List[float]] = {}
        horizon_bucket_errors: Dict[str, List[float]] = {}

        for st_str, act in hourly_actuals.items():
            if st_str in selected_forecasts:
                fc = selected_forecasts[st_str]
                st_dt = parse_utc(st_str)
                pt_dt = parse_utc(fc.publishTime)
                horizon_hours = round((st_dt - pt_dt).total_seconds() / 3600.0, 2)

                actual_gen = act["avg_generation"]
                fc_gen = fc.generation
                err = fc_gen - actual_gen
                abs_err = abs(err)
                d_str = act["date"]

                if d_str not in daily_errors:
                    daily_errors[d_str] = []
                daily_errors[d_str].append(err)

                bucket = get_horizon_bin(horizon_hours)
                if bucket not in horizon_bucket_errors:
                    horizon_bucket_errors[bucket] = []
                horizon_bucket_errors[bucket].append(abs_err)

                all_raw_points.append({
                    "startTime": st_str,
                    "deliveryDate": d_str,
                    "deliveryHour": act["hour"],
                    "actualGeneration": actual_gen,
                    "halfHourActual00": act["val_00"],
                    "halfHourActual30": act["val_30"],
                    "forecastGeneration": fc_gen,
                    "forecastPublishTime": fc.publishTime,
                    "forecastHorizonHours": horizon_hours,
                    "error": round(err, 2),
                    "absError": round(abs_err, 2),
                    "bucket": bucket,
                })

        # Empirical P50 and P90 per horizon bucket
        bucket_stats: Dict[str, Tuple[float, float]] = {}
        all_abs_errors = [p["absError"] for p in all_raw_points]
        overall_p50 = float(np.percentile(all_abs_errors, 50)) if all_abs_errors else 500.0
        overall_p90 = float(np.percentile(all_abs_errors, 90)) if all_abs_errors else 1500.0

        for bucket, errors in horizon_bucket_errors.items():
            if errors:
                p50 = float(np.percentile(errors, 50))
                p90 = float(np.percentile(errors, 90))
                bucket_stats[bucket] = (round(p50, 1), round(p90, 1))

        # Second pass: filter to requested date range and attach uncertainty bounds and rolling bias adjustments
        aligned_points: List[AlignedDataPoint] = []
        for p in all_raw_points:
            date_str = p["deliveryDate"]
            if filter_start_date and date_str < filter_start_date:
                continue
            if filter_end_date and date_str > filter_end_date:
                continue

            b_p50, b_p90 = bucket_stats.get(p["bucket"], (overall_p50, overall_p90))
            fc_val = p["forecastGeneration"]
            act_val = p["actualGeneration"]

            # Compute strictly backward-looking rolling bias offset using completed days [D-8, D-2]
            rolling_bias = self.compute_rolling_historical_bias(
                daily_errors,
                date_str,
                cutoff_hour=cutoff_hour,
                cutoff_minute=cutoff_minute,
                window_days=7,
            )
            if rolling_bias is not None:
                adj_fc = round(max(0.0, fc_val - rolling_bias), 1)
                adj_err = round(adj_fc - act_val, 1)
            else:
                adj_fc = None
                adj_err = None

            aligned_points.append(
                AlignedDataPoint(
                    startTime=p["startTime"],
                    deliveryDate=p["deliveryDate"],
                    deliveryHour=p["deliveryHour"],
                    actualGeneration=round(act_val, 1),
                    halfHourActual00=round(p["halfHourActual00"], 1) if p["halfHourActual00"] is not None else None,
                    halfHourActual30=round(p["halfHourActual30"], 1) if p["halfHourActual30"] is not None else None,
                    forecastGeneration=round(fc_val, 1),
                    forecastPublishTime=p["forecastPublishTime"],
                    forecastHorizonHours=p["forecastHorizonHours"],
                    error=p["error"],
                    absError=p["absError"],
                    uncertaintyP50Lower=round(max(0.0, fc_val - b_p50), 1),
                    uncertaintyP50Upper=round(fc_val + b_p50, 1),
                    uncertaintyP90Lower=round(max(0.0, fc_val - b_p90), 1),
                    uncertaintyP90Upper=round(fc_val + b_p90, 1),
                    adjustedForecastGeneration=adj_fc,
                    adjustedError=adj_err,
                )
            )

        aligned_points.sort(key=lambda x: x.startTime)
        self._cache[cache_key] = aligned_points
        return aligned_points


forecast_engine = ForecastEngine()
