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

type AnalyticsTab = 'hourly' | 'horizon' | 'distribution';

export const App: React.FC = () => {
  const [cutoffHour, setCutoffHour] = useState<number>(9);
  const [cutoffMinute, setCutoffMinute] = useState<number>(50);
  const [startDate, setStartDate] = useState<string>('2026-01-01');
  const [endDate, setEndDate] = useState<string>('2026-01-31');
  const [showAdjustedForecast, setShowAdjustedForecast] = useState<boolean>(false);
  const [showComparisonTable, setShowComparisonTable] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('hourly');

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
      setError(err.message || 'Failed to communicate with GridBricks API.');
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
    <div className="min-h-screen bg-desk-bg text-desk-text flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-desk-textMuted">
            <Loader2 className="w-7 h-7 text-desk-primary animate-spin mb-2" />
            <p className="text-xs font-medium">Evaluating January 2026 delivery hours...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && !isLoading && (
          <div className="p-3.5 mb-5 bg-desk-amberBg border border-desk-amberBorder rounded-xl flex items-center justify-between text-desk-amber text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="px-2.5 py-1 rounded bg-desk-card border border-desk-amberBorder hover:bg-desk-amberBg text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && forecastData && breakdownData && (
          <>
            {/* 1. KPI Metric Cards (4 default, toggle for more) */}
            <MetricCards
              metrics={forecastData.metricsSummary}
              showAdjusted={showAdjustedForecast}
            />

            {/* 2. Concise Trader Guidance */}
            <TraderInsight
              summary={forecastData.traderSummary}
              metrics={forecastData.metricsSummary}
            />

            {/* 3. Cutoff Comparison Table (Behind toggle) */}
            {showComparisonTable && forecastData.cutoffComparisons && (
              <CutoffComparisonTable
                comparisons={forecastData.cutoffComparisons}
                selectedHour={cutoffHour}
                selectedMinute={cutoffMinute}
                onSelectCutoff={handleCutoffChange}
              />
            )}

            {/* 4. Main Time-Series Chart (Large) */}
            <TimeSeriesChart
              data={forecastData.dataPoints}
              showAdjusted={showAdjustedForecast}
            />

            {/* 5. Secondary Analytics in Tabs (One visible at a time) */}
            <div className="bg-desk-card border border-desk-border rounded-xl p-4 sm:p-5 mb-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-desk-borderLight pb-3 mb-4 gap-2">
                <h3 className="text-xs sm:text-sm font-semibold text-desk-text">
                  Error Breakdown Analysis
                </h3>
                {/* Tabs */}
                <div className="inline-flex rounded-lg border border-desk-border p-0.5 bg-desk-cardAlt self-start sm:self-auto text-xs">
                  <button
                    onClick={() => setActiveTab('hourly')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'hourly'
                        ? 'bg-desk-tint text-desk-text font-semibold shadow-xs'
                        : 'text-desk-textMuted hover:text-desk-text'
                    }`}
                  >
                    By hour of day
                  </button>
                  <button
                    onClick={() => setActiveTab('horizon')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'horizon'
                        ? 'bg-desk-tint text-desk-text font-semibold shadow-xs'
                        : 'text-desk-textMuted hover:text-desk-text'
                    }`}
                  >
                    Vs lead time horizon
                  </button>
                  <button
                    onClick={() => setActiveTab('distribution')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      activeTab === 'distribution'
                        ? 'bg-desk-tint text-desk-text font-semibold shadow-xs'
                        : 'text-desk-textMuted hover:text-desk-text'
                    }`}
                  >
                    Error distribution
                  </button>
                </div>
              </div>

              {activeTab === 'hourly' && (
                <HourlyErrorChart hourlyData={breakdownData.hourlyBreakdown} />
              )}
              {activeTab === 'horizon' && (
                <HorizonErrorChart horizonData={breakdownData.horizonBreakdown} />
              )}
              {activeTab === 'distribution' && (
                <ErrorDistributionChart distribution={breakdownData.errorDistribution} />
              )}
            </div>
          </>
        )}
      </main>

      {/* Clean Compact Footer */}
      <footer className="border-t border-desk-border bg-desk-card py-3 px-6 text-center text-xs text-desk-textMuted">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <span>GridBricks Power Desk</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span>Sources: Elexon BMRS (FUELHH, WINDFOR)</span>
            <span>•</span>
            <a
              href="#assumptions"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('assumptions');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="underline hover:text-desk-text font-medium"
            >
              Assumptions & Sources
            </a>
            <span>•</span>
            <span>UTC | MW</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
