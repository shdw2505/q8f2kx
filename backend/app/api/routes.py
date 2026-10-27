"""
FastAPI router for GridBricks Day-Ahead Wind Evaluation endpoints.
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.schemas import (
    DayAheadResponse,
    MetricsBreakdownResponse,
    TraderSummary,
    CutoffComparisonItem,
)
from app.services.elexon_client import elexon_client
from app.services.forecast_engine import forecast_engine
from app.services.metrics_engine import metrics_engine

router = APIRouter(prefix="/api/v1")

CUTOFF_PRESETS = [
    (9, 20, "09:20 UTC (EPEX SPOT GB 60-min Auction Gate)"),
    (9, 50, "09:50 UTC (N2EX Day-Ahead Hourly Auction Gate - Assumed Default)"),
    (11, 0, "11:00 UTC (Continental SDAC Close, for comparison only)"),
    (12, 0, "12:00 UTC (Later cutoff, comparison only - not a GB auction gate)"),
]

ASSUMPTION_NOTE = (
    "Assumption: 09:50 UTC on D-1 is the assumed default gate closure based on "
    "published schedules for the N2EX GB Day-Ahead Hourly auction (Nord Pool 'About the N2EX day-ahead auction' support page; Modo Energy GB wholesale markets explainer). "
    "These are secondary industry sources rather than an official rulebook; "
    "users can select alternative gates (e.g. 09:20 EPEX SPOT GB 60-min, 11:00 SDAC, 12:00 later comparison) or custom hours."
)


def get_cutoff_label(hour: int, minute: int) -> str:
    for h, m, label in CUTOFF_PRESETS:
        if h == hour and m == minute:
            return label
    return f"{hour:02d}:{minute:02d} UTC on D-1"


def compute_cutoff_comparisons() -> List[CutoffComparisonItem]:
    actuals = elexon_client.get_fuelhh_actuals()
    forecasts = elexon_client.get_windfor_forecasts()
    comparisons: List[CutoffComparisonItem] = []

    for h, m, label in CUTOFF_PRESETS:
        aligned = forecast_engine.align_and_evaluate(actuals, forecasts, cutoff_hour=h, cutoff_minute=m)
        stats = metrics_engine.compute_summary_metrics(aligned)
        comparisons.append(
            CutoffComparisonItem(
                cutoffLabel=label,
                cutoffHour=h,
                cutoffMinute=m,
                mae=stats.mae,
                rmse=stats.rmse,
                bias=stats.bias,
                wape=stats.wape,
                p50=stats.p50,
                p90=stats.p90,
                avgHorizonHours=stats.avgHorizonHours,
                isAssumedDefault=(h == 9 and m == 50),
            )
        )
    return comparisons


@router.get("/health")
def health_check():
    actuals = elexon_client.get_fuelhh_actuals()
    forecasts = elexon_client.get_windfor_forecasts()
    return {
        "status": "healthy",
        "service": "GridBricks Day-Ahead Wind Evaluation API",
        "targetMonth": "January 2026",
        "fuelhhActualsLoaded": len(actuals),
        "windforForecastsLoaded": len(forecasts),
    }


@router.get("/cutoffs/comparison", response_model=List[CutoffComparisonItem])
def get_cutoff_comparison_table():
    try:
        return compute_cutoff_comparisons()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute cutoff comparisons: {str(e)}")


@router.get("/forecasts/day-ahead", response_model=DayAheadResponse)
def get_day_ahead_forecasts(
    cutoff_hour: int = Query(settings.DEFAULT_CUTOFF_HOUR, ge=0, le=23, description="Decision cutoff hour on D-1 (UTC)"),
    cutoff_minute: int = Query(settings.DEFAULT_CUTOFF_MINUTE, ge=0, le=59, description="Decision cutoff minute on D-1 (UTC)"),
    start_date: Optional[str] = Query(default=None, description="Filter start date YYYY-MM-DD (e.g. 2026-01-01)"),
    end_date: Optional[str] = Query(default=None, description="Filter end date YYYY-MM-DD (e.g. 2026-01-31)"),
    force_refresh: bool = Query(default=False, description="Force re-fetch from live Elexon API"),
):
    c_hour = int(cutoff_hour.default if hasattr(cutoff_hour, "default") else cutoff_hour)
    c_min = int(cutoff_minute.default if hasattr(cutoff_minute, "default") else cutoff_minute)
    s_date = (start_date.default if hasattr(start_date, "default") else start_date)
    e_date = (end_date.default if hasattr(end_date, "default") else end_date)
    f_refresh = bool(force_refresh.default if hasattr(force_refresh, "default") else force_refresh)

    try:
        actuals = elexon_client.get_fuelhh_actuals(force_refresh=f_refresh)
        forecasts = elexon_client.get_windfor_forecasts(force_refresh=f_refresh)

        aligned = forecast_engine.align_and_evaluate(
            fuelhh_records=actuals,
            windfor_records=forecasts,
            cutoff_hour=c_hour,
            cutoff_minute=c_min,
            filter_start_date=s_date,
            filter_end_date=e_date,
        )

        cutoff_label = get_cutoff_label(c_hour, c_min)
        metrics = metrics_engine.compute_summary_metrics(aligned)
        hourly = metrics_engine.compute_hourly_breakdown(aligned)
        horizon = metrics_engine.compute_horizon_breakdown(aligned)
        summary = metrics_engine.generate_trader_summary(metrics, hourly, horizon, cutoff_label)
        comparisons = compute_cutoff_comparisons()

        ret_s_date = s_date or (aligned[0].deliveryDate if aligned else settings.JAN_2026_START)
        ret_e_date = e_date or (aligned[-1].deliveryDate if aligned else settings.JAN_2026_END)

        return DayAheadResponse(
            selectedCutoffHour=c_hour,
            selectedCutoffMinute=c_min,
            cutoffDescription=cutoff_label,
            cutoffAssumptionNote=ASSUMPTION_NOTE,
            startDate=ret_s_date,
            endDate=ret_e_date,
            totalHours=len(aligned),
            dataPoints=aligned,
            metricsSummary=metrics,
            traderSummary=summary,
            cutoffComparisons=comparisons,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute day-ahead forecasts: {str(e)}")


@router.get("/metrics/breakdown", response_model=MetricsBreakdownResponse)
def get_metrics_breakdown(
    cutoff_hour: int = Query(settings.DEFAULT_CUTOFF_HOUR, ge=0, le=23),
    cutoff_minute: int = Query(settings.DEFAULT_CUTOFF_MINUTE, ge=0, le=59),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
):
    c_hour = int(cutoff_hour.default if hasattr(cutoff_hour, "default") else cutoff_hour)
    c_min = int(cutoff_minute.default if hasattr(cutoff_minute, "default") else cutoff_minute)
    s_date = (start_date.default if hasattr(start_date, "default") else start_date)
    e_date = (end_date.default if hasattr(end_date, "default") else end_date)

    try:
        actuals = elexon_client.get_fuelhh_actuals()
        forecasts = elexon_client.get_windfor_forecasts()

        aligned = forecast_engine.align_and_evaluate(
            fuelhh_records=actuals,
            windfor_records=forecasts,
            cutoff_hour=c_hour,
            cutoff_minute=c_min,
            filter_start_date=s_date,
            filter_end_date=e_date,
        )
        cutoff_label = get_cutoff_label(c_hour, c_min)
        return metrics_engine.compute_all_metrics(aligned, cutoff_label)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute breakdown: {str(e)}")


@router.get("/trader-summary", response_model=TraderSummary)
def get_trader_summary(
    cutoff_hour: int = Query(settings.DEFAULT_CUTOFF_HOUR, ge=0, le=23),
    cutoff_minute: int = Query(settings.DEFAULT_CUTOFF_MINUTE, ge=0, le=59),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
):
    c_hour = int(cutoff_hour.default if hasattr(cutoff_hour, "default") else cutoff_hour)
    c_min = int(cutoff_minute.default if hasattr(cutoff_minute, "default") else cutoff_minute)
    s_date = (start_date.default if hasattr(start_date, "default") else start_date)
    e_date = (end_date.default if hasattr(end_date, "default") else end_date)

    try:
        actuals = elexon_client.get_fuelhh_actuals()
        forecasts = elexon_client.get_windfor_forecasts()

        aligned = forecast_engine.align_and_evaluate(
            fuelhh_records=actuals,
            windfor_records=forecasts,
            cutoff_hour=c_hour,
            cutoff_minute=c_min,
            filter_start_date=s_date,
            filter_end_date=e_date,
        )
        cutoff_label = get_cutoff_label(c_hour, c_min)
        metrics = metrics_engine.compute_summary_metrics(aligned)
        hourly = metrics_engine.compute_hourly_breakdown(aligned)
        horizon = metrics_engine.compute_horizon_breakdown(aligned)
        return metrics_engine.generate_trader_summary(metrics, hourly, horizon, cutoff_label)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")
