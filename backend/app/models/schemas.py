"""
Pydantic models and schemas for GridBricks Day-Ahead Wind Evaluation.
"""

from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class FuelHHRecord(BaseModel):
    dataset: str = "FUELHH"
    publishTime: str
    startTime: str
    settlementDate: str
    settlementPeriod: int
    fuelType: str
    generation: float


class WindforRecord(BaseModel):
    dataset: str = "WINDFOR"
    publishTime: str
    startTime: str
    generation: float


class AlignedDataPoint(BaseModel):
    startTime: str = Field(..., description="Target delivery hour in UTC ISO format (e.g. 2026-01-02T14:00:00Z)")
    deliveryDate: str = Field(..., description="Delivery date YYYY-MM-DD")
    deliveryHour: int = Field(..., description="Clock hour of delivery (0-23)")
    actualGeneration: float = Field(..., description="Actual wind generation outturn in MW (hourly average of :00 and :30)")
    halfHourActual00: Optional[float] = Field(None, description="Granular :00 half-hour actual (MW)")
    halfHourActual30: Optional[float] = Field(None, description="Granular :30 half-hour actual (MW)")
    forecastGeneration: float = Field(..., description="Selected latest wind forecast in MW available at cutoff")
    forecastPublishTime: str = Field(..., description="Timestamp when the forecast was published (UTC ISO)")
    forecastHorizonHours: float = Field(..., description="Hours between forecast publishTime and delivery startTime")
    error: float = Field(..., description="Forecast - Actual (MW). Positive = Over-forecast, Negative = Under-forecast")
    absError: float = Field(..., description="Absolute forecast error |Forecast - Actual| (MW)")
    uncertaintyP50Lower: float = Field(..., description="Forecast - P50 absolute error for this horizon (MW)")
    uncertaintyP50Upper: float = Field(..., description="Forecast + P50 absolute error for this horizon (MW)")
    uncertaintyP90Lower: float = Field(..., description="Forecast - P90 absolute error for this horizon (MW)")
    uncertaintyP90Upper: float = Field(..., description="Forecast + P90 absolute error for this horizon (MW)")
    # Optional experimental backward-looking bias-adjusted forecast
    adjustedForecastGeneration: Optional[float] = Field(None, description="Experimental forecast adjusted by strictly historical rolling bias (MW)")
    adjustedError: Optional[float] = Field(None, description="Adjusted forecast error (Adjusted Forecast - Actual) in MW")


class ErrorMetrics(BaseModel):
    count: int = Field(..., description="Number of aligned delivery hours evaluated")
    mae: float = Field(..., description="Mean Absolute Error in MW")
    rmse: float = Field(..., description="Root Mean Squared Error in MW")
    bias: float = Field(..., description="Mean Error (Forecast - Actual) in MW. >0 indicates over-forecasting")
    wape: float = Field(..., description="Weighted Absolute Percentage Error (Sum(|e|) / Sum(Actual) * 100%)")
    mape: float = Field(..., description="Guarded Mean Absolute Percentage Error (%)")
    p50: float = Field(..., description="50th percentile (median) of absolute error in MW")
    p90: float = Field(..., description="90th percentile of absolute error in MW")
    p99: float = Field(..., description="99th percentile of absolute error in MW")
    maxUnderforecast: float = Field(..., description="Maximum under-forecast (Forecast - Actual, negative MW)")
    maxOverforecast: float = Field(..., description="Maximum over-forecast (Forecast - Actual, positive MW)")
    avgActual: float = Field(..., description="Average actual generation in MW")
    avgForecast: float = Field(..., description="Average forecasted generation in MW")
    avgHorizonHours: float = Field(..., description="Average forecast lead time horizon in hours")
    # Metrics for adjusted forecast if enabled
    adjustedMae: Optional[float] = Field(None, description="MAE of experimental bias-adjusted forecast in MW")
    adjustedWape: Optional[float] = Field(None, description="WAPE of experimental bias-adjusted forecast in %")


class HourlyMetrics(BaseModel):
    hour: int = Field(..., description="Hour of day (0-23 UTC)")
    count: int
    mae: float
    rmse: float
    bias: float
    wape: float
    p50: float
    p90: float
    avgActual: float
    avgForecast: float
    avgHorizonHours: float


class HorizonMetrics(BaseModel):
    horizonBin: str = Field(..., description="Horizon bucket label (e.g. '12-18h', '18-24h')")
    minHours: float
    maxHours: float
    count: int
    mae: float
    rmse: float
    bias: float
    wape: float
    p50: float
    p90: float


class HistogramBin(BaseModel):
    binStart: float
    binEnd: float
    binLabel: str
    count: int


class MetricsBreakdownResponse(BaseModel):
    overall: ErrorMetrics
    hourlyBreakdown: List[HourlyMetrics]
    horizonBreakdown: List[HorizonMetrics]
    errorDistribution: List[HistogramBin]


class CutoffComparisonItem(BaseModel):
    cutoffLabel: str
    cutoffHour: int
    cutoffMinute: int
    mae: float
    rmse: float
    bias: float
    wape: float
    p50: float
    p90: float
    avgHorizonHours: float
    isAssumedDefault: bool = False


class TraderSummary(BaseModel):
    decisionCutoffUsed: str
    overallBiasDirection: str
    biasValueMW: float
    biasHypothesisNote: str = "Possible explanations: curtailment, scope differences between WINDFOR and FUELHH; not verified."
    inSampleEvaluationNote: str = "In-sample, whole-month retrospective evaluation; not available to a trader in real time."
    generalizationLimitationNote: str = "The bias adjustment is based on one month (January 2026) in which the bias was persistent and may not generalize."
    keyFindings: List[str]
    tradingRecommendation: str
    peakHourRisk: str
    recommendedSafetyBufferMW: float
    worstCaseScenarioMW: float


class DayAheadResponse(BaseModel):
    selectedCutoffHour: int
    selectedCutoffMinute: int
    cutoffDescription: str
    cutoffAssumptionNote: str
    startDate: str
    endDate: str
    totalHours: int
    dataPoints: List[AlignedDataPoint]
    metricsSummary: ErrorMetrics
    traderSummary: TraderSummary
    cutoffComparisons: List[CutoffComparisonItem]
