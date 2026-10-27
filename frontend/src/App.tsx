import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Controls } from './components/Controls';
import { MetricCards } from './components/MetricCards';
import { TraderInsight } from './components/TraderInsight';
import { CutoffComparisonTable } from './components/CutoffComparisonTable';
import { TimeSeriesChart } from './components/TimeSeriesChart';
import { ErrorDistributionChart } from './components/ErrorDistributionChart';
import { HourlyErrorChart } from './components/HourlyErrorChart';
import { HorizonErrorChart } from './components/HorizonErrorChart';
import { fetchDayAheadForecasts, fetchMetricsBreakdown } from './services/api';
import { DayAheadResponse, MetricsBreakdownResponse } from './types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [cutoffHour, setCutoffHour] = useState<number>(9);
  const [cutoffMinute, setCutoffMinute] = useState<number>(50);
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-01-31');
  const [showAdjustedForecast, setShowAdjustedForecast] = useState<boolean>(false);
  const [showComparisonTable, setShowComparisonTable] = useState<boolean>(false);

  const [forecastData, setForecastData] = useState<DayAheadResponse | null>(null);
  const [breakdownData, setBreakdownData] = useState<MetricsBreakdownResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fcRes, bdRes] = await Promise.all([
        fetchDayAheadForecasts(cutoffHour, cutoffMinute, startDate, endDate),
        fetchMetricsBreakdown(cutoffHour, cutoffMinute, startDate, endDate),
      ]);
      setForecastData(fcRes);
      setBreakdownData(bdRes);
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with GridBricks backend API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cutoffHour, cutoffMinute, startDate, endDate]);

  const handleCutoffChange = (hour: number, minute: number) => {
    setCutoffHour(hour);
    setCutoffMinute(minute);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Controls Section */}
        <Controls
          cutoffHour={cutoffHour}
          cutoffMinute={cutoffMinute}
          onCutoffChange={handleCutoffChange}
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
          showAdjustedForecast={showAdjustedForecast}
          onToggleAdjustedForecast={setShowAdjustedForecast}
          showComparisonTable={showComparisonTable}
          onToggleComparisonTable={setShowComparisonTable}
          isLoading={isLoading}
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <p className="text-sm font-medium">Evaluating Elexon BMRS January 2026 delivery hours...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && !isLoading && (
          <div className="p-4 mb-6 bg-red-950/40 border border-red-500/50 rounded-2xl flex items-center justify-between text-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 rounded-lg bg-red-800/60 hover:bg-red-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Main Dashboard Content */}
        {!isLoading && !error && forecastData && breakdownData && (
          <>
            {/* KPI Metrics */}
            <MetricCards
              metrics={forecastData.metricsSummary}
              showAdjusted={showAdjustedForecast}
            />

            {/* Trading Guidance Insight */}
            <TraderInsight summary={forecastData.traderSummary} />

            {/* Optional Cutoff Comparison Table */}
            {showComparisonTable && forecastData.cutoffComparisons && (
              <CutoffComparisonTable
                comparisons={forecastData.cutoffComparisons}
                selectedHour={cutoffHour}
                selectedMinute={cutoffMinute}
                onSelectCutoff={handleCutoffChange}
              />
            )}

            {/* Time-Series Chart */}
            <TimeSeriesChart
              data={forecastData.dataPoints}
              showAdjusted={showAdjustedForecast}
            />

            {/* Multi-chart Error Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ErrorDistributionChart distribution={breakdownData.errorDistribution} />
              <HourlyErrorChart hourlyData={breakdownData.hourlyBreakdown} />
              <HorizonErrorChart horizonData={breakdownData.horizonBreakdown} />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>GridBricks | UK Day-Ahead Power Procurement Evaluation</span>
          <span>Data: Elexon BMRS FUELHH & WINDFOR only (Jan 2026) | Units: MW | Timezone: UTC</span>
        </div>
      </footer>
    </div>
  );
};
