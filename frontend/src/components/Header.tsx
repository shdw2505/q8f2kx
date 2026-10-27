import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-desk-border bg-desk-card/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-desk-text">
            GridBricks Power Desk
          </h1>
          <p className="text-xs text-desk-textMuted">
            Day-ahead wind forecast accuracy, Jan 2026
          </p>
        </div>
        <div className="text-xs text-desk-textMuted font-mono">
          UTC | MW | Elexon FUELHH and WINDFOR
        </div>
      </div>
    </header>
  );
};
