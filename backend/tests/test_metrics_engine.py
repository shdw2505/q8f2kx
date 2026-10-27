"""
Unit tests for MetricsEngine:
- MAE, RMSE, Bias, MAPE, WAPE
- Percentiles (P50, P90, P99)
- Hourly and horizon breakdowns
- Trader recommendation synthesis
"""

import pytest
from app.services.metrics_engine import MetricsEngine
from app.models.schemas import AlignedDataPoint


@pytest.fixture
def metrics_svc():
    return MetricsEngine()


def create_point(hour: int, actual: float, forecast: float, horizon: float) -> AlignedDataPoint:
    err = forecast - actual
    abs_err = abs(err)
    return AlignedDataPoint(
        startTime=f"2026-01-02T{hour:02d}:00:00Z",
        deliveryDate="2026-01-02",
        deliveryHour=hour,
        actualGeneration=actual,
        forecastGeneration=forecast,
        forecastPublishTime="2026-01-01T09:30:00Z",
        forecastHorizonHours=horizon,
        error=err,
        absError=abs_err,
        uncertaintyP50Lower=max(0.0, forecast - 200.0),
        uncertaintyP50Upper=forecast + 200.0,
        uncertaintyP90Lower=max(0.0, forecast - 500.0),
        uncertaintyP90Upper=forecast + 500.0,
    )


def test_compute_summary_metrics(metrics_svc):
    # 4 sample points:
    # 1: Act=1000, Fc=1200 -> err = +200, abs = 200
    # 2: Act=2000, Fc=1900 -> err = -100, abs = 100
    # 3: Act=3000, Fc=3300 -> err = +300, abs = 300
    # 4: Act=4000, Fc=4000 -> err = 0,    abs = 0
    # Errors: [200, -100, 300, 0]
    # Abs errors: [200, 100, 300, 0]
    # Mean error (Bias): (200 - 100 + 300 + 0) / 4 = 100.0 MW
    # MAE: (200 + 100 + 300 + 0) / 4 = 150.0 MW
    # Sum squares: 40000 + 10000 + 90000 + 0 = 140000 / 4 = 35000 -> RMSE = sqrt(35000) ~ 187.1 MW
    # Total actual = 10000, Total abs err = 600 -> WAPE = 6.0%
    points = [
        create_point(10, 1000.0, 1200.0, 24.5),
        create_point(11, 2000.0, 1900.0, 25.5),
        create_point(12, 3000.0, 3300.0, 26.5),
        create_point(13, 4000.0, 4000.0, 27.5),
    ]

    m = metrics_svc.compute_summary_metrics(points)
    assert m.count == 4
    assert m.mae == 150.0
    assert m.bias == 100.0
    assert round(m.rmse, 1) == 187.1
    assert m.wape == 6.0
    assert m.p50 == 150.0  # median of [0, 100, 200, 300]
    assert m.maxOverforecast == 300.0
    assert m.maxUnderforecast == -100.0


def test_mape_guarded_against_near_zero(metrics_svc):
    # If actual is 0 MW (calm night), floor prevents division by zero
    points = [
        create_point(2, 0.0, 50.0, 16.5), # err = 50, floored actual = 100 -> 50%
        create_point(3, 1000.0, 1100.0, 17.5), # err = 100, actual = 1000 -> 10%
    ]
    m = metrics_svc.compute_summary_metrics(points)
    assert m.count == 2
    # MAPE = (50% + 10%) / 2 = 30.0%
    assert m.mape == 30.0


def test_hourly_breakdown(metrics_svc):
    points = [
        create_point(8, 1000.0, 1100.0, 22.0),
        create_point(8, 1000.0, 1200.0, 22.0),
        create_point(17, 5000.0, 4800.0, 31.0),
    ]
    breakdown = metrics_svc.compute_hourly_breakdown(points)
    assert len(breakdown) == 2
    h8 = next(b for b in breakdown if b.hour == 8)
    assert h8.count == 2
    assert h8.mae == 150.0
    assert h8.bias == 150.0

    h17 = next(b for b in breakdown if b.hour == 17)
    assert h17.count == 1
    assert h17.bias == -200.0


def test_trader_summary(metrics_svc):
    points = [
        create_point(17, 10000.0, 11500.0, 29.0),
        create_point(18, 11000.0, 12500.0, 30.0),
    ]
    overall = metrics_svc.compute_summary_metrics(points)
    hourly = metrics_svc.compute_hourly_breakdown(points)
    horizon = metrics_svc.compute_horizon_breakdown(points)
    summary = metrics_svc.generate_trader_summary(overall, hourly, horizon, "11:00 UTC D-1")

    assert summary.overallBiasDirection == "OVER_FORECAST"
    assert "OVER_FORECAST" in summary.overallBiasDirection
    assert len(summary.keyFindings) >= 3
    assert summary.recommendedSafetyBufferMW == overall.p90
    assert "uncertainty buffer" in summary.tradingRecommendation.lower()
    assert "not verified" in summary.biasHypothesisNote.lower()
