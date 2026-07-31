"use client";

import { RecentApplication } from "@/types/resume";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";

type ToolbarProps = {
  selectedVersion: string;
  versions: string[];
  cvFontSize: string;
  cvFontWeight: string;
  cvLineHeight: string;
  cvSectionGap: string;
  atsLineHeight: string;
  atsSectionGap: string;
  cvTopMargin: string;
  cvBottomMargin: string;
  disabled?: boolean;
  masterCvName: string | null; // null = no master CV set yet
  recentApplications: RecentApplication[];
  applicationElapsedMs: number;
  isApplicationTimerRunning: boolean;
  hasPhoto?: boolean;
  onVersionChange: (value: string) => void;
  onFontSizeChange: (value: string) => void;
  onFontWeightChange: (value: string) => void;
  onLineHeightChange: (value: string) => void;
  onSectionGapChange: (value: string) => void;
  onAtsLineHeightChange: (value: string) => void;
  onAtsSectionGapChange: (value: string) => void;
  onTopMarginChange: (value: string) => void;
  onBottomMarginChange: (value: string) => void;
  onImportClick: () => void;
  onExportClick: () => void;
  onCopyPlainText: () => void;
  onResetClick: () => void;
  onUpdateMaster: () => void;
  onSelectRecent: (timestamp: string) => void;
  onToggleApplicationTimer: () => void;
  onResetApplicationTimer: () => void;
  onPickPhoto?: () => void;
  onRemovePhoto?: () => void;
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

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function Toolbar({
  selectedVersion,
  versions,
  cvFontSize,
  cvFontWeight,
  cvLineHeight,
  cvSectionGap,
  atsLineHeight,
  atsSectionGap,
  cvTopMargin,
  cvBottomMargin,
  disabled = false,
  masterCvName,
  recentApplications,
  applicationElapsedMs,
  isApplicationTimerRunning,
  hasPhoto = false,
  onVersionChange,
  onFontSizeChange,
  onFontWeightChange,
  onLineHeightChange,
  onSectionGapChange,
  onAtsLineHeightChange,
  onAtsSectionGapChange,
  onTopMarginChange,
  onBottomMarginChange,
  onImportClick,
  onExportClick,
  onCopyPlainText,
  onResetClick,
  onUpdateMaster,
  onSelectRecent,
  onToggleApplicationTimer,
  onResetApplicationTimer,
  onPickPhoto,
  onRemovePhoto
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

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {/* Show pill only when a master CV has been set */}
          {masterCvName && (
          <div className="cursor-pointer rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-sm">
            <span className="font-medium">Master CV: {masterCvName} ✓</span>
            <button
              type="button"
              onClick={onUpdateMaster}
              disabled={disabled}
              className="ml-2 cursor-pointer font-semibold text-emerald-700 transition hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Update
            </button>
          </div>
          )}

          <div className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm">
            <Timer size={15} className="text-blue-700" />
            <span className="min-w-[48px] font-mono text-sm font-semibold tabular-nums text-slate-900">
              {formatElapsed(applicationElapsedMs)}
            </span>
            <button
              type="button"
              onClick={onToggleApplicationTimer}
              disabled={disabled}
              title={isApplicationTimerRunning ? "Pause application timer" : "Start application timer"}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApplicationTimerRunning ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              type="button"
              onClick={onResetApplicationTimer}
              disabled={disabled || applicationElapsedMs === 0}
              title="Reset application timer"
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <details className={`relative ${disabled ? "pointer-events-none opacity-60" : ""}`}>
            <summary className="cursor-pointer list-none rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300">
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
              className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
            >
              ?
            </button>
            <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-72 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-xl group-hover:block">
              <div className="font-semibold text-slate-900">Shortcuts</div>
              <div className="mt-2 space-y-1">
                <div>Cmd/Ctrl+Enter → Send chat</div>
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
              className="cursor-pointer bg-transparent outline-none disabled:cursor-not-allowed"
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
            className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Import JSON
          </button>
          <button
            type="button"
            onClick={onExportClick}
            disabled={disabled}
            className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={onResetClick}
            disabled={disabled}
            className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset to Master
          </button>
          {onPickPhoto ? (
            <button
              type="button"
              onClick={onPickPhoto}
              disabled={disabled}
              className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Photo…
            </button>
          ) : null}
          {hasPhoto && onRemovePhoto ? (
            <button
              type="button"
              onClick={onRemovePhoto}
              disabled={disabled}
              className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove photo
            </button>
          ) : null}
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="font-medium text-slate-500">Font size: {cvFontSize}</span>
            <select
              value={cvFontSize}
              disabled={disabled}
              onChange={(event) => onFontSizeChange(event.target.value)}
              className="cursor-pointer bg-transparent outline-none disabled:cursor-not-allowed"
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
              className="cursor-pointer bg-transparent outline-none disabled:cursor-not-allowed"
            >
              <option value="300">Light</option>
              <option value="400">Regular</option>
              <option value="450">Medium</option>
              <option value="500">Semibold</option>
            </select>
          </label>
          <label className="flex min-w-[210px] items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="min-w-[72px] font-medium text-slate-500">Line {cvLineHeight}</span>
            <input
              type="range"
              min="1.35"
              max="1.85"
              step="0.05"
              value={cvLineHeight}
              disabled={disabled}
              onChange={(event) => onLineHeightChange(event.target.value)}
              className="h-2 w-24 cursor-pointer accent-blue-700 disabled:cursor-not-allowed"
            />
          </label>
          <label className="flex min-w-[222px] items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="min-w-[82px] font-medium text-slate-500">Sections {cvSectionGap}px</span>
            <input
              type="range"
              min="8"
              max="24"
              step="1"
              value={cvSectionGap}
              disabled={disabled}
              onChange={(event) => onSectionGapChange(event.target.value)}
              className="h-2 w-24 cursor-pointer accent-blue-700 disabled:cursor-not-allowed"
            />
          </label>
          <label className="flex min-w-[234px] items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="min-w-[96px] font-medium text-slate-500">ATS Line {atsLineHeight}</span>
            <input
              type="range"
              min="1.05"
              max="1.6"
              step="0.05"
              value={atsLineHeight}
              disabled={disabled}
              onChange={(event) => onAtsLineHeightChange(event.target.value)}
              className="h-2 w-24 cursor-pointer accent-blue-700 disabled:cursor-not-allowed"
            />
          </label>
          <label className="flex min-w-[246px] items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="min-w-[108px] font-medium text-slate-500">ATS Sections {atsSectionGap}px</span>
            <input
              type="range"
              min="4"
              max="16"
              step="1"
              value={atsSectionGap}
              disabled={disabled}
              onChange={(event) => onAtsSectionGapChange(event.target.value)}
              className="h-2 w-24 cursor-pointer accent-blue-700 disabled:cursor-not-allowed"
            />
          </label>
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
            <span className="font-medium text-slate-500">Top ↑</span>
            <select
              value={cvTopMargin}
              disabled={disabled}
              onChange={(event) => onTopMarginChange(event.target.value)}
              className="cursor-pointer bg-transparent outline-none disabled:cursor-not-allowed"
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
              className="cursor-pointer bg-transparent outline-none disabled:cursor-not-allowed"
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
            className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Copy text
          </button>
        </div>
      </div>
    </div>
  );
}
