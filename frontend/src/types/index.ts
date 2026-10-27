export interface AlignedDataPoint {
  startTime: string;
  deliveryDate: string;
  deliveryHour: number;
  actualGeneration: number;
  halfHourActual00: number | null;
  halfHourActual30: number | null;
  forecastGeneration: number;
  forecastPublishTime: string;
  forecastHorizonHours: number;
  error: number;
  absError: number;
  uncertaintyP50Lower: number;
  uncertaintyP50Upper: number;
  uncertaintyP90Lower: number;
  uncertaintyP90Upper: number;
  adjustedForecastGeneration?: number | null;
  adjustedError?: number | null;
}

export interface ErrorMetrics {
  count: number;
  mae: number;
  rmse: number;
  bias: number;
  wape: number;
  mape: number;
  p50: number;
  p90: number;
  p99: number;
  maxUnderforecast: number;
  maxOverforecast: number;
  avgActual: number;
  avgForecast: number;
  avgHorizonHours: number;
  adjustedMae?: number | null;
  adjustedWape?: number | null;
}

export interface HourlyMetrics {
  hour: number;
  count: number;
  mae: number;
  rmse: number;
  bias: number;
  wape: number;
  p50: number;
  p90: number;
  avgActual: number;
  avgForecast: number;
  avgHorizonHours: number;
}

export interface HorizonMetrics {
  horizonBin: string;
  minHours: number;
  maxHours: number;
  count: number;
  mae: number;
  rmse: number;
  bias: number;
  wape: number;
  p50: number;
  p90: number;
}

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  binLabel: string;
  count: number;
}

export interface MetricsBreakdownResponse {
  overall: ErrorMetrics;
  hourlyBreakdown: HourlyMetrics[];
  horizonBreakdown: HorizonMetrics[];
  errorDistribution: HistogramBin[];
}

export interface CutoffComparisonItem {
  cutoffLabel: string;
  cutoffHour: number;
  cutoffMinute: number;
  mae: number;
  rmse: number;
  bias: number;
  wape: number;
  p50: number;
  p90: number;
  avgHorizonHours: number;
  isAssumedDefault: boolean;
}

export interface TraderSummary {
  decisionCutoffUsed: string;
  overallBiasDirection: string;
  biasValueMW: number;
  biasHypothesisNote: string;
  inSampleEvaluationNote: string;
  generalizationLimitationNote: string;
  keyFindings: string[];
  tradingRecommendation: string;
  peakHourRisk: string;
  recommendedSafetyBufferMW: number;
  worstCaseScenarioMW: number;
}

export interface DayAheadResponse {
  selectedCutoffHour: number;
  selectedCutoffMinute: number;
  cutoffDescription: string;
  cutoffAssumptionNote: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  dataPoints: AlignedDataPoint[];
  metricsSummary: ErrorMetrics;
  traderSummary: TraderSummary;
  cutoffComparisons: CutoffComparisonItem[];
}
