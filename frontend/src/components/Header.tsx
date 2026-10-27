import React from 'react';
import { Wind, Clock, Gauge, Database } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title and branding */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Wind className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">GridBricks Power Desk</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                UK Day-Ahead
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Wind Generation Forecast Accuracy Evaluation & Quantitative Procurement Decision Support
            </p>
          </div>
        </div>

        {/* Global Units & Operational Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Timezone: <strong className="text-white">UTC</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-slate-300">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>Units: <strong className="text-white">MW</strong> (Hourly Mean)</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-slate-300">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Period: <strong className="text-white">Jan 2026</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 border border-emerald-600/30 rounded-lg text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Elexon BMRS Validated</span>
          </div>
        </div>
      </div>
    </header>
  );
};
