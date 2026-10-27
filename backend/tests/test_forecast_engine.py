"""
Unit tests for ForecastEngine:
- Hourly aggregation of 30-min actuals
- Day-ahead gate closure cutoff selection
- Lead time horizon calculation
- P50 / P90 uncertainty bands
- Strict leakage prevention in rolling bias-adjusted forecast
"""

import pytest
from datetime import date
from app.services.forecast_engine import ForecastEngine, get_horizon_bin
from app.models.schemas import FuelHHRecord, WindforRecord


@pytest.fixture
def engine():
    return ForecastEngine()


def test_aggregate_fuelhh_to_hourly(engine):
    records = [
        FuelHHRecord(
            dataset="FUELHH",
            publishTime="2026-01-02T14:30:00Z",
            startTime="2026-01-02T14:00:00Z",
            settlementDate="2026-01-02",
            settlementPeriod=29,
            fuelType="WIND",
            generation=10000.0,
        ),
        FuelHHRecord(
            dataset="FUELHH",
            publishTime="2026-01-02T15:00:00Z",
            startTime="2026-01-02T14:30:00Z",
            settlementDate="2026-01-02",
            settlementPeriod=30,
            fuelType="WIND",
            generation=12000.0,
        ),
    ]

    result = engine.aggregate_fuelhh_to_hourly(records)
    key = "2026-01-02T14:00:00Z"
    assert key in result
    assert result[key]["avg_generation"] == 11000.0
    assert result[key]["val_00"] == 10000.0
    assert result[key]["val_30"] == 12000.0
    assert result[key]["date"] == "2026-01-02"
    assert result[key]["hour"] == 14


def test_select_day_ahead_forecasts_cutoff(engine):
    forecasts = [
        WindforRecord(publishTime="2026-01-01T07:30:00Z", startTime="2026-01-02T14:00:00Z", generation=8000.0),
        WindforRecord(publishTime="2026-01-01T09:30:00Z", startTime="2026-01-02T14:00:00Z", generation=8500.0),
        WindforRecord(publishTime="2026-01-01T15:30:00Z", startTime="2026-01-02T14:00:00Z", generation=9500.0),
    ]

    selected = engine.select_day_ahead_forecasts(forecasts, cutoff_hour=11, cutoff_minute=0)
    target_key = "2026-01-02T14:00:00Z"
    assert target_key in selected

    chosen = selected[target_key]
    assert chosen.publishTime == "2026-01-01T09:30:00Z"
    assert chosen.generation == 8500.0


def test_forecast_horizon_calculation(engine):
    actuals = [
        FuelHHRecord(
            dataset="FUELHH",
            publishTime="2026-01-02T14:30:00Z",
            startTime="2026-01-02T14:00:00Z",
            settlementDate="2026-01-02",
            settlementPeriod=29,
            fuelType="WIND",
            generation=8000.0,
        )
    ]
    forecasts = [
        WindforRecord(publishTime="2026-01-01T09:30:00Z", startTime="2026-01-02T14:00:00Z", generation=8500.0)
    ]

    aligned = engine.align_and_evaluate(actuals, forecasts, cutoff_hour=11, cutoff_minute=0)
    assert len(aligned) == 1
    pt = aligned[0]
    assert pt.forecastHorizonHours == 28.5
    assert pt.error == 500.0
    assert pt.absError == 500.0
    assert pt.uncertaintyP50Lower <= pt.forecastGeneration <= pt.uncertaintyP50Upper
    assert pt.uncertaintyP90Lower <= pt.forecastGeneration <= pt.uncertaintyP90Upper


def test_horizon_bin_classification():
    assert get_horizon_bin(14.0) == "12-18h (Early Delivery)"
    assert get_horizon_bin(20.0) == "18-24h (Morning Peak)"
    assert get_horizon_bin(26.0) == "24-30h (Afternoon/Evening Peak)"
    assert get_horizon_bin(32.0) == "30-36h (Night Delivery)"
    assert get_horizon_bin(40.0) == "36h+ (Extended Lead)"


def test_no_leakage_in_rolling_bias(engine):
    """
    Unit test ensuring the rolling bias offset never uses any actual timestamp
    at or after the decision cutoff.
    Target delivery date: 2026-01-15.
    Cutoff on D-1: 2026-01-14 11:00 UTC.
    The rolling offset window [D-8, D-2] spans 2026-01-07 to 2026-01-13.
    Day D-2 ends at 2026-01-13 23:00 UTC (11 hours before cutoff).
    
    Verifies:
    1. Days D-1 (2026-01-14) and D (2026-01-15) are NEVER included in the offset window.
    2. Any error on D-1 or D does NOT affect the rolling bias.
    3. Delivery dates D < 2026-01-09 return None (insufficient history), never silent zero.
    """
    daily_errors = {}
    for day in range(1, 16):
        d_str = f"2026-01-{day:02d}"
        daily_errors[d_str] = [100.0 * day] * 24

    # Target 2026-01-15: Window [D-8, D-2] = days 7, 8, 9, 10, 11, 12, 13
    # Mean = (700 + 800 + 900 + 1000 + 1100 + 1200 + 1300) / 7 = 1000.0 MW
    bias_15 = engine.compute_rolling_historical_bias(
        daily_errors, "2026-01-15", cutoff_hour=11, cutoff_minute=0, window_days=7
    )
    assert bias_15 == 1000.0

    # Inject extreme poison error on D-1 (2026-01-14) and D (2026-01-15)
    daily_errors["2026-01-14"] = [999999.0] * 24
    daily_errors["2026-01-15"] = [999999.0] * 24

    # Compute bias again: MUST remain exactly 1000.0 because D-1 and D are after cutoff and excluded
    bias_leak_test = engine.compute_rolling_historical_bias(
        daily_errors, "2026-01-15", cutoff_hour=11, cutoff_minute=0, window_days=7
    )
    assert bias_leak_test == 1000.0, "LEAKAGE DETECTED: Data from D-1 or D was used in rolling bias calculation!"

    # Test days with insufficient history (< 7 completed delivery days in January):
    for d in range(1, 9):
        insufficient_date = f"2026-01-{d:02d}"
        res = engine.compute_rolling_historical_bias(
            daily_errors, insufficient_date, cutoff_hour=11, cutoff_minute=0, window_days=7
        )
        assert res is None, f"Expected None for {insufficient_date} due to insufficient history, but got {res}"
