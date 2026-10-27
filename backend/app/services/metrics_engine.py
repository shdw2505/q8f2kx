"""
Metrics Engine:
Computes MAE, RMSE, Bias, WAPE, P50, P90, P99, hourly and horizon breakdowns,
error distribution histogram, and strictly number-grounded trader summaries.
"""

from typing import List, Dict, Optional
import numpy as np

from app.config import settings
from app.models.schemas import (
    AlignedDataPoint,
    ErrorMetrics,
    HourlyMetrics,
    HorizonMetrics,
    HistogramBin,
    MetricsBreakdownResponse,
    TraderSummary,
)


class MetricsEngine:
    def compute_summary_metrics(self, points: List[AlignedDataPoint]) -> ErrorMetrics:
        if not points:
            return ErrorMetrics(
                count=0,
                mae=0.0,
                rmse=0.0,
                bias=0.0,
                wape=0.0,
                mape=0.0,
                p50=0.0,
                p90=0.0,
                p99=0.0,
                maxUnderforecast=0.0,
                maxOverforecast=0.0,
                avgActual=0.0,
                avgForecast=0.0,
                avgHorizonHours=0.0,
                adjustedMae=None,
                adjustedWape=None,
            )

        errors = np.array([p.error for p in points], dtype=float)
        abs_errors = np.array([p.absError for p in points], dtype=float)
        actuals = np.array([p.actualGeneration for p in points], dtype=float)
        forecasts = np.array([p.forecastGeneration for p in points], dtype=float)
        horizons = np.array([p.forecastHorizonHours for p in points], dtype=float)

        mae = float(np.mean(abs_errors))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        bias = float(np.mean(errors))

        # WAPE: Exactly Sum(|e|) / Sum(Actual) * 100%
        sum_actual = float(np.sum(actuals))
        wape = float((np.sum(abs_errors) / sum_actual * 100.0)) if sum_actual > 0 else 0.0

        # Guarded MAPE for comparison
        floored_actuals = np.maximum(actuals, settings.MAPE_FLOOR_MW)
        mape = float(np.mean(abs_errors / floored_actuals) * 100.0)

        p50 = float(np.percentile(abs_errors, 50))
        p90 = float(np.percentile(abs_errors, 90))
        p99 = float(np.percentile(abs_errors, 99))

        # Adjusted metrics for experimental bias-adjusted forecast (evaluated on active adjusted hours)
        adj_pts = [p for p in points if p.adjustedError is not None]
        adj_mae = None
        adj_wape = None
        if adj_pts:
            adj_abs = np.abs(np.array([p.adjustedError for p in adj_pts], dtype=float))
            adj_acts = np.array([p.actualGeneration for p in adj_pts], dtype=float)
            adj_mae = round(float(np.mean(adj_abs)), 1)
            sum_adj_acts = float(np.sum(adj_acts))
            adj_wape = round(float(np.sum(adj_abs) / sum_adj_acts * 100.0), 2) if sum_adj_acts > 0 else 0.0

        return ErrorMetrics(
            count=len(points),
            mae=round(mae, 1),
            rmse=round(rmse, 1),
            bias=round(bias, 1),
            wape=round(wape, 2),
            mape=round(mape, 2),
            p50=round(p50, 1),
            p90=round(p90, 1),
            p99=round(p99, 1),
            maxUnderforecast=round(float(np.min(errors)), 1),
            maxOverforecast=round(float(np.max(errors)), 1),
            avgActual=round(float(np.mean(actuals)), 1),
            avgForecast=round(float(np.mean(forecasts)), 1),
            avgHorizonHours=round(float(np.mean(horizons)), 1),
            adjustedMae=adj_mae,
            adjustedWape=adj_wape,
        )

    def compute_hourly_breakdown(self, points: List[AlignedDataPoint]) -> List[HourlyMetrics]:
        by_hour: Dict[int, List[AlignedDataPoint]] = {h: [] for h in range(24)}
        for p in points:
            by_hour[p.deliveryHour].append(p)

        results: List[HourlyMetrics] = []
        for h in range(24):
            pts = by_hour[h]
            if not pts:
                continue
            m = self.compute_summary_metrics(pts)
            results.append(
                HourlyMetrics(
                    hour=h,
                    count=m.count,
                    mae=m.mae,
                    rmse=m.rmse,
                    bias=m.bias,
                    wape=m.wape,
                    p50=m.p50,
                    p90=m.p90,
                    avgActual=m.avgActual,
                    avgForecast=m.avgForecast,
                    avgHorizonHours=m.avgHorizonHours,
                )
            )
        return results

    def compute_horizon_breakdown(self, points: List[AlignedDataPoint]) -> List[HorizonMetrics]:
        buckets = [
            ("12-18h (Early Delivery)", 12.0, 18.0),
            ("18-24h (Morning Peak)", 18.0, 24.0),
            ("24-30h (Afternoon/Evening Peak)", 24.0, 30.0),
            ("30-36h (Night Delivery)", 30.0, 36.0),
            ("36h+ (Extended Lead)", 36.0, 100.0),
        ]

        results: List[HorizonMetrics] = []
        for label, min_h, max_h in buckets:
            subset = [
                p for p in points
                if (p.forecastHorizonHours >= min_h and p.forecastHorizonHours < max_h)
                or (max_h >= 100.0 and p.forecastHorizonHours >= min_h)
            ]
            if not subset:
                continue
            m = self.compute_summary_metrics(subset)
            results.append(
                HorizonMetrics(
                    horizonBin=label,
                    minHours=min_h,
                    maxHours=max_h,
                    count=m.count,
                    mae=m.mae,
                    rmse=m.rmse,
                    bias=m.bias,
                    wape=m.wape,
                    p50=m.p50,
                    p90=m.p90,
                )
            )
        return results

    def compute_error_distribution(
        self, points: List[AlignedDataPoint], num_bins: int = 15
    ) -> List[HistogramBin]:
        if not points:
            return []

        errors = [p.error for p in points]
        counts, bin_edges = np.histogram(errors, bins=num_bins)

        bins: List[HistogramBin] = []
        for i in range(len(counts)):
            b_start = round(float(bin_edges[i]), 0)
            b_end = round(float(bin_edges[i + 1]), 0)
            bins.append(
                HistogramBin(
                    binStart=b_start,
                    binEnd=b_end,
                    binLabel=f"{int(b_start)} to {int(b_end)} MW",
                    count=int(counts[i]),
                )
            )
        return bins

    def generate_trader_summary(
        self,
        overall: ErrorMetrics,
        hourly: List[HourlyMetrics],
        horizon: List[HorizonMetrics],
        cutoff_name: str,
    ) -> TraderSummary:
        # 1. Bias direction and quantified values
        if overall.bias > 50.0:
            bias_dir = "OVER_FORECAST"
            bias_desc = f"Systematic positive bias of +{overall.bias:,.0f} MW (+{overall.bias / overall.avgActual * 100.0:.1f}% of mean actual generation)"
        elif overall.bias < -50.0:
            bias_dir = "UNDER_FORECAST"
            bias_desc = f"Systematic negative bias of {overall.bias:,.0f} MW ({overall.bias / overall.avgActual * 100.0:.1f}% of mean actual generation)"
        else:
            bias_dir = "BALANCED"
            bias_desc = f"Near-zero bias ({overall.bias:+,.0f} MW)"

        # 2. Peak hour analysis (16:00 to 20:00 UTC)
        peak_hours = [h for h in hourly if 16 <= h.hour <= 20]
        if peak_hours:
            sum_abs_err = sum(h.mae * h.count for h in peak_hours)
            sum_act = sum(h.avgActual * h.count for h in peak_hours)
            total_count = sum(h.count for h in peak_hours)
            peak_mae = sum_abs_err / total_count if total_count > 0 else 0.0
            peak_bias = sum(h.bias * h.count for h in peak_hours) / total_count if total_count > 0 else 0.0
            peak_wape = (sum_abs_err / sum_act * 100.0) if sum_act > 0 else 0.0
            peak_desc = (
                f"16-20 UTC: average MAE is {peak_mae:,.0f} MW "
                f"(WAPE {peak_wape:.1f}%) with an average bias of {peak_bias:+,.0f} MW."
            )
        else:
            peak_desc = "Diurnal variation consistent across trading periods."

        # 3. Grounded findings strictly from numbers
        findings = [
            f"Evaluated with assumption: {cutoff_name}.",
            f"Overall MAE is {overall.mae:,.0f} MW, with WAPE at {overall.wape:.1f}% across {overall.count} delivery hours evaluated.",
            bias_desc + ". Note: Possible explanations: curtailment, scope differences between WINDFOR and FUELHH; not verified.",
            f"Median absolute error (P50) is {overall.p50:,.0f} MW, expanding to {overall.p90:,.0f} MW at P90 and {overall.p99:,.0f} MW at P99 (in-sample, whole-month retrospective evaluation; not available to a trader in real time).",
        ]

        if len(horizon) >= 2:
            earliest_h = horizon[0]
            latest_h = horizon[-1]
            findings.append(
                f"Horizon metrics: Lead times of {earliest_h.horizonBin} show MAE of {earliest_h.mae:,.0f} MW ({earliest_h.wape:.1f}% WAPE), "
                f"compared to {latest_h.mae:,.0f} MW ({latest_h.wape:.1f}% WAPE) at {latest_h.horizonBin}."
            )

        # 4. Actionable trader recommendation
        rec = (
            f"At the assumed {cutoff_name} gate: factoring a baseline uncertainty buffer of +{overall.p50:,.0f} MW (P50) "
            f"for typical operations, and up to +{overall.p90:,.0f} MW (P90) for high-risk delivery hours, "
            f"mitigates the risk of shortfall against unconstrained WINDFOR forecasts. "
            f"Limitations note: The bias adjustment is based on one month (January 2026) in which the bias was persistent and may not generalize."
        )

        return TraderSummary(
            decisionCutoffUsed=cutoff_name,
            overallBiasDirection=bias_dir,
            biasValueMW=overall.bias,
            biasHypothesisNote="Possible explanations: curtailment, scope differences between WINDFOR and FUELHH; not verified.",
            inSampleEvaluationNote="In-sample, whole-month retrospective evaluation; not available to a trader in real time.",
            generalizationLimitationNote="The bias adjustment is based on one month (January 2026) in which the bias was persistent and may not generalize.",
            keyFindings=findings,
            tradingRecommendation=rec,
            peakHourRisk=peak_desc,
            recommendedSafetyBufferMW=overall.p90,
            worstCaseScenarioMW=overall.p99,
        )

    def compute_all_metrics(
        self, points: List[AlignedDataPoint], cutoff_name: str
    ) -> MetricsBreakdownResponse:
        overall = self.compute_summary_metrics(points)
        hourly = self.compute_hourly_breakdown(points)
        horizon = self.compute_horizon_breakdown(points)
        dist = self.compute_error_distribution(points)
        return MetricsBreakdownResponse(
            overall=overall,
            hourlyBreakdown=hourly,
            horizonBreakdown=horizon,
            errorDistribution=dist,
        )


metrics_engine = MetricsEngine()
