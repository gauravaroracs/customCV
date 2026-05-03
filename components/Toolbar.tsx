"use client";

import { RecentApplication } from "@/types/resume";

type ToolbarProps = {
  selectedVersion: string;
  versions: string[];
  cvFontSize: string;
  cvFontWeight: string;
  cvTopMargin: string;
  cvBottomMargin: string;
  disabled?: boolean;
  masterCvName: string | null;  // null = no master CV set yet
  recentApplications: RecentApplication[];
  onVersionChange: (value: string) => void;
  onFontSizeChange: (value: string) => void;
  onFontWeightChange: (value: string) => void;
  onTopMarginChange: (value: string) => void;
  onBottomMarginChange: (value: string) => void;
  onImportClick: () => void;
  onExportClick: () => void;
  onCopyPlainText: () => void;
  onResetClick: () => void;
  onUpdateMaster: () => void;
  onSelectRecent: (timestamp: string) => void;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)    return "just now";
  if (mins  < 60)   return `${mins}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  return `${days}d ago`;
}

export function Toolbar({
  selectedVersion,
  versions,
  cvFontSize,
  cvFontWeight,
  cvTopMargin,
  cvBottomMargin,
  disabled = false,
  masterCvName,
  recentApplications,
  onVersionChange,
  onFontSizeChange,
  onFontWeightChange,
  onTopMarginChange,
  onBottomMarginChange,
  onImportClick,
  onExportClick,
  onCopyPlainText,
  onResetClick,
  onUpdateMaster,
  onSelectRecent
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

        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* Show pill only when a master CV has been set */}
          {masterCvName && (
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-sm">
            <span className="font-medium">Master CV: {masterCvName} ✓</span>
            <button
              type="button"
              onClick={onUpdateMaster}
              disabled={disabled}
              className="ml-2 font-semibold text-emerald-700 transition hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Update
            </button>
          </div>
          )}

          <details className={`relative ${disabled ? "pointer-events-none opacity-60" : ""}`}>
            <summary className="list-none rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300">
              Recent
            </summary>
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {recentApplications.length > 0 ? (
                <div className="space-y-2">
                  {recentApplications.map((item) => (
                    <button
                      key={item.timestamp}
                      type="button"
                      onClick={() => onSelectRecent(item.timestamp)}
                      className="w-full rounded-2xl bg-slate-50 px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                    >
                      <div className="font-semibold text-slate-900">
                        {item.company || "Unknown"} · {item.matchScore ? `${item.matchScore}%` : "—"} · {relativeTime(item.timestamp)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 truncate">
                        {item.role || "Untitled role"}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-4 text-sm text-slate-500">No recent applications yet.</div>
              )}
            </div>
          </details>

          <div className="group relative">
            <button
              type="button"
              disabled={disabled}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
            >
              ?
            </button>
            <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-72 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-xl group-hover:block">
              <div className="font-semibold text-slate-900">Shortcuts</div>
              <div className="mt-2 space-y-1">
                <div>Cmd/Ctrl+Enter → Tailor &amp; Generate</div>
                <div className="text-slate-500">Quick Apply → Propose JD edits for review-first changes</div>
                <div>Cmd/Ctrl+D → Download PDF</div>
                <div>Cmd/Ctrl+Shift+C → Copy plain text</div>
                <div>Escape → Close modal</div>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="font-medium text-slate-500">Version</span>
            <select
              value={selectedVersion}
              disabled={disabled}
              onChange={(event) => onVersionChange(event.target.value)}
              className="bg-transparent outline-none disabled:cursor-not-allowed"
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
            disabled={disabled}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Import JSON
          </button>
          <button
            type="button"
            onClick={onExportClick}
            disabled={disabled}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={onResetClick}
            disabled={disabled}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset to Master
          </button>
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="font-medium text-slate-500">Font size: {cvFontSize}</span>
            <select
              value={cvFontSize}
              disabled={disabled}
              onChange={(event) => onFontSizeChange(event.target.value)}
              className="bg-transparent outline-none disabled:cursor-not-allowed"
            >
              <option value="9px">9px (Compact — fits dense content)</option>
              <option value="9.5px">9.5px (Default — recommended)</option>
              <option value="10px">10px (Comfortable)</option>
              <option value="10.5px">10.5px (Large)</option>
              <option value="11px">11px (Very large)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="font-medium text-slate-500">Weight</span>
            <select
              value={cvFontWeight}
              disabled={disabled}
              onChange={(event) => onFontWeightChange(event.target.value)}
              className="bg-transparent outline-none disabled:cursor-not-allowed"
            >
              <option value="300">Light</option>
              <option value="400">Regular</option>
              <option value="450">Medium</option>
              <option value="500">Semibold</option>
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="font-medium text-slate-500">Top ↑</span>
            <select
              value={cvTopMargin}
              disabled={disabled}
              onChange={(event) => onTopMarginChange(event.target.value)}
              className="bg-transparent outline-none disabled:cursor-not-allowed"
            >
              <option value="4px">4px</option>
              <option value="8px">8px</option>
              <option value="12px">12px</option>
              <option value="18px">18px</option>
              <option value="24px">24px</option>
              <option value="32px">32px</option>
              <option value="40px">40px</option>
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="font-medium text-slate-500">Bottom ↓</span>
            <select
              value={cvBottomMargin}
              disabled={disabled}
              onChange={(event) => onBottomMarginChange(event.target.value)}
              className="bg-transparent outline-none disabled:cursor-not-allowed"
            >
              <option value="4px">4px</option>
              <option value="8px">8px</option>
              <option value="12px">12px</option>
              <option value="18px">18px</option>
              <option value="24px">24px</option>
              <option value="32px">32px</option>
              <option value="40px">40px</option>
            </select>
          </label>
          <button
            type="button"
            onClick={onCopyPlainText}
            disabled={disabled}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Copy text
          </button>
        </div>
      </div>
    </div>
  );
}
