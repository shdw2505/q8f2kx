"""
Integration and schema validation tests for API endpoints:
- health_check
- get_day_ahead_forecasts
- get_metrics_breakdown
- get_trader_summary
"""

import pytest
from app.api.routes import (
    health_check,
    get_day_ahead_forecasts,
    get_metrics_breakdown,
    get_trader_summary,
    get_cutoff_comparison_table,
)


def test_health_endpoint():
    data = health_check()
    assert data["status"] == "healthy"
    assert data["targetMonth"] == "January 2026"
    assert data["fuelhhActualsLoaded"] == 1488
    assert data["windforForecastsLoaded"] == 22192


def test_day_ahead_forecasts_default_cutoff():
    # Test default cutoff 09:50 UTC D-1 (N2EX gate closure)
    res = get_day_ahead_forecasts(cutoff_hour=9, cutoff_minute=50)
    assert res.selectedCutoffHour == 9
    assert res.selectedCutoffMinute == 50
    assert "09:50 UTC" in res.cutoffDescription
    assert res.totalHours == 744  # 31 days * 24 hours = 744 hours
    assert len(res.dataPoints) == 744

    first_pt = res.dataPoints[0]
    assert first_pt.startTime == "2026-01-01T00:00:00Z"
    assert first_pt.deliveryDate == "2026-01-01"
    assert first_pt.actualGeneration > 0
    assert first_pt.forecastGeneration > 0
    assert first_pt.forecastHorizonHours > 0
    # Consistent P50 and P90 uncertainty bands
    assert first_pt.uncertaintyP50Lower <= first_pt.forecastGeneration <= first_pt.uncertaintyP50Upper
    assert first_pt.uncertaintyP90Lower <= first_pt.forecastGeneration <= first_pt.uncertaintyP90Upper

    metrics = res.metricsSummary
    assert metrics.mae > 0
    assert metrics.rmse >= metrics.mae
    assert metrics.p90 >= metrics.p50
    assert metrics.count == 744


def test_day_ahead_date_filtered():
    # Filter for first 3 days of January 2026
    res = get_day_ahead_forecasts(cutoff_hour=11, cutoff_minute=0, start_date="2026-01-01", end_date="2026-01-03")
    assert res.totalHours == 72  # 3 days * 24 hours = 72 hours
    for pt in res.dataPoints:
        assert pt.deliveryDate in ["2026-01-01", "2026-01-02", "2026-01-03"]


def test_metrics_breakdown():
    res = get_metrics_breakdown(cutoff_hour=11, cutoff_minute=0)
    assert res.overall.count == 744
    assert len(res.hourlyBreakdown) == 24  # 24 hours of day (0-23 UTC)
    for h in res.hourlyBreakdown:
        assert 0 <= h.hour <= 23
        assert h.count == 31  # 31 days in Jan 2026
    assert len(res.horizonBreakdown) >= 4
    assert len(res.errorDistribution) > 0


def test_trader_summary():
    res = get_trader_summary(cutoff_hour=9, cutoff_minute=50)
    assert res.overallBiasDirection == "OVER_FORECAST"
    assert len(res.keyFindings) >= 4
    assert res.recommendedSafetyBufferMW > 0
    assert "uncertainty buffer" in res.tradingRecommendation.lower()
    assert "not verified" in res.biasHypothesisNote.lower()


def test_cutoff_comparison_table():
    comps = get_cutoff_comparison_table()
    assert len(comps) == 4
    labels = [c.cutoffLabel for c in comps]
    assert any("09:20" in l and "EPEX SPOT GB 60-min" in l for l in labels)
    assert any("09:50" in l and "N2EX" in l for l in labels)
    assert any("11:00" in l and "SDAC" in l for l in labels)
    assert any("12:00" in l and "Later cutoff" in l for l in labels)
    default_item = next(c for c in comps if c.isAssumedDefault)
    assert default_item.cutoffHour == 9
    assert default_item.cutoffMinute == 50

