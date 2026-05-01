"use client";

type ToolbarProps = {
  selectedVersion: string;
  versions: string[];
  onVersionChange: (value: string) => void;
  onImportClick: () => void;
  onExportClick: () => void;
  onPrintClick: () => void;
  onResetClick: () => void;
};

export function Toolbar({
  selectedVersion,
  versions,
  onVersionChange,
  onImportClick,
  onExportClick,
  onPrintClick,
  onResetClick
}: ToolbarProps) {
  return (
    <div className="no-print sticky top-0 z-20 border-b border-slate-200/80 bg-[#f7f4ed]/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-5 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            AI Resume Editor
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">CVPilot</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="font-medium text-slate-500">Version</span>
            <select
              value={selectedVersion}
              onChange={(event) => onVersionChange(event.target.value)}
              className="bg-transparent outline-none"
            >
              {versions.map((version) => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onImportClick}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            Import JSON
          </button>
          <button
            type="button"
            onClick={onExportClick}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={onResetClick}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            Reset Sample
          </button>
          <button
            type="button"
            onClick={onPrintClick}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
