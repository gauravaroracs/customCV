"use client";

import { RecentApplication } from "@/types/resume";
import {
  Camera,
  ChevronDown,
  CircleHelp,
  Clock3,
  Download,
  FileJson,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Upload
} from "lucide-react";

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
  masterCvName: string | null;
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
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    <header className="no-print app-topbar">
      <div className="app-topbar__main">
        <button type="button" className="brand-lockup" onClick={() => jumpTo("job-inbox")} aria-label="Go to application inbox">
          <span className="brand-mark"><Sparkles size={17} strokeWidth={2.5} /></span>
          <span>
            <span className="brand-kicker">CVPILOT / WORKSPACE</span>
            <span className="brand-name">Build your next yes.</span>
          </span>
        </button>

        <nav className="workspace-nav" aria-label="Workspace sections">
          <button type="button" className="workspace-nav__item workspace-nav__item--active" onClick={() => jumpTo("job-inbox")}>Inbox <span>01</span></button>
          <button type="button" className="workspace-nav__item" onClick={() => jumpTo("cv-studio")}>CV studio <span>02</span></button>
          <button type="button" className="workspace-nav__item" onClick={() => jumpTo("cover-letter")}>Cover letter <span>03</span></button>
        </nav>

        <div className="topbar-actions">
          {masterCvName ? (
            <button type="button" className="status-chip status-chip--success" onClick={onUpdateMaster} disabled={disabled}>
              <span className="status-dot" /> Master CV ready <strong>{masterCvName}</strong>
            </button>
          ) : null}
          <div className="timer-chip">
            <Clock3 size={15} />
            <span>{formatElapsed(applicationElapsedMs)}</span>
            <button type="button" onClick={onToggleApplicationTimer} disabled={disabled} title={isApplicationTimerRunning ? "Pause timer" : "Start timer"}>
              {isApplicationTimerRunning ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button type="button" onClick={onResetApplicationTimer} disabled={disabled || applicationElapsedMs === 0} title="Reset timer"><RotateCcw size={13} /></button>
          </div>
          <details className="recent-menu">
            <summary>Recent <ChevronDown size={14} /></summary>
            <div className="recent-menu__panel">
              {recentApplications.length ? recentApplications.map((item) => (
                <button key={item.timestamp} type="button" onClick={() => onSelectRecent(item.timestamp)}>
                  <strong>{item.company || "Unknown"}</strong>
                  <span>{item.role || "Untitled role"} · {relativeTime(item.timestamp)}</span>
                </button>
              )) : <p>No recent applications yet.</p>}
            </div>
          </details>
          <button type="button" className="icon-button" title="Keyboard shortcuts"><CircleHelp size={17} /></button>
        </div>
      </div>

      <div className="app-toolbar-row">
        <div className="toolbar-context"><span className="toolbar-context__label">Current version</span><select value={selectedVersion} disabled={disabled} onChange={(event) => onVersionChange(event.target.value)}>{versions.map((version) => <option key={version} value={version}>{version}</option>)}</select></div>
        <div className="toolbar-actions">
          <button type="button" onClick={onImportClick} disabled={disabled}><Upload size={14} /> Import JSON</button>
          <button type="button" onClick={onExportClick} disabled={disabled}><Download size={14} /> Export</button>
          {onPickPhoto ? <button type="button" onClick={onPickPhoto} disabled={disabled}><Camera size={14} /> {hasPhoto ? "Change photo" : "Add photo"}</button> : null}
          {hasPhoto && onRemovePhoto ? <button type="button" onClick={onRemovePhoto} disabled={disabled} className="toolbar-action--quiet">Remove photo</button> : null}
          <button type="button" onClick={onResetClick} disabled={disabled} className="toolbar-action--quiet">Reset to Master</button>
        </div>
        <details className="control-drawer">
          <summary><SlidersHorizontal size={14} /> Layout controls <ChevronDown size={14} /></summary>
          <div className="control-drawer__panel">
            <label>Font size<select value={cvFontSize} disabled={disabled} onChange={(event) => onFontSizeChange(event.target.value)}><option value="9px">9px · compact</option><option value="9.5px">9.5px · default</option><option value="10px">10px · comfortable</option><option value="10.5px">10.5px · large</option><option value="11px">11px · very large</option></select></label>
            <label>Weight<select value={cvFontWeight} disabled={disabled} onChange={(event) => onFontWeightChange(event.target.value)}><option value="300">Light</option><option value="400">Regular</option><option value="450">Medium</option><option value="500">Semibold</option></select></label>
            <label>CV line <input type="range" min="1.35" max="1.85" step="0.05" value={cvLineHeight} disabled={disabled} onChange={(event) => onLineHeightChange(event.target.value)} /><output>{cvLineHeight}</output></label>
            <label>Section gap <input type="range" min="8" max="24" step="1" value={cvSectionGap} disabled={disabled} onChange={(event) => onSectionGapChange(event.target.value)} /><output>{cvSectionGap}px</output></label>
            <label>ATS line <input type="range" min="1.05" max="1.6" step="0.05" value={atsLineHeight} disabled={disabled} onChange={(event) => onAtsLineHeightChange(event.target.value)} /><output>{atsLineHeight}</output></label>
            <label>ATS gap <input type="range" min="4" max="16" step="1" value={atsSectionGap} disabled={disabled} onChange={(event) => onAtsSectionGapChange(event.target.value)} /><output>{atsSectionGap}px</output></label>
            <label>Top margin<select value={cvTopMargin} disabled={disabled} onChange={(event) => onTopMarginChange(event.target.value)}>{["4px", "8px", "12px", "18px", "24px", "32px", "40px"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Bottom margin<select value={cvBottomMargin} disabled={disabled} onChange={(event) => onBottomMarginChange(event.target.value)}>{["0px", "4px", "8px", "12px", "18px", "24px", "32px", "40px"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <button type="button" onClick={onCopyPlainText} disabled={disabled} className="control-drawer__copy"><FileJson size={14} /> Copy plain text</button>
          </div>
        </details>
      </div>
    </header>
  );
}
