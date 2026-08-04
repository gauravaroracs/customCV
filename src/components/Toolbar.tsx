"use client";

import { RecentApplication } from "@/types/resume";
import { LoadingButton } from "@/components/LoadingButton";
import {
  atsFontSizeOptions,
  atsPageMarginOptions,
  cvFontSizeOptions,
  cvMarginOptions
} from "@/lib/cvSettings";
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
  atsFontSize: string;
  atsLineHeight: string;
  atsSectionGap: string;
  atsPageMargin: string;
  cvTopMargin: string;
  cvBottomMargin: string;
  cvLeftMargin: string;
  cvRightMargin: string;
  disabled?: boolean;
  masterCvName: string | null;
  recentApplications: RecentApplication[];
  applicationElapsedMs: number;
  isApplicationTimerRunning: boolean;
  hasPhoto?: boolean;
  isCopyingPlainText?: boolean;
  isImportingJson?: boolean;
  isPhotoUploading?: boolean;
  onVersionChange: (value: string) => void;
  onFontSizeChange: (value: string) => void;
  onFontWeightChange: (value: string) => void;
  onLineHeightChange: (value: string) => void;
  onSectionGapChange: (value: string) => void;
  onAtsFontSizeChange: (value: string) => void;
  onAtsLineHeightChange: (value: string) => void;
  onAtsSectionGapChange: (value: string) => void;
  onAtsPageMarginChange: (value: string) => void;
  onTopMarginChange: (value: string) => void;
  onBottomMarginChange: (value: string) => void;
  onLeftMarginChange: (value: string) => void;
  onRightMarginChange: (value: string) => void;
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
  atsFontSize,
  atsLineHeight,
  atsSectionGap,
  atsPageMargin,
  cvTopMargin,
  cvBottomMargin,
  cvLeftMargin,
  cvRightMargin,
  disabled = false,
  masterCvName,
  recentApplications,
  applicationElapsedMs,
  isApplicationTimerRunning,
  hasPhoto = false,
  isCopyingPlainText = false,
  isImportingJson = false,
  isPhotoUploading = false,
  onVersionChange,
  onFontSizeChange,
  onFontWeightChange,
  onLineHeightChange,
  onSectionGapChange,
  onAtsFontSizeChange,
  onAtsLineHeightChange,
  onAtsSectionGapChange,
  onAtsPageMarginChange,
  onTopMarginChange,
  onBottomMarginChange,
  onLeftMarginChange,
  onRightMarginChange,
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
          <LoadingButton type="button" onClick={onImportClick} loading={isImportingJson} loadingLabel="Importing…" estimatedSeconds={4} disabled={disabled}><Upload size={14} /> Import JSON</LoadingButton>
          <button type="button" onClick={onExportClick} disabled={disabled}><Download size={14} /> Export</button>
          {onPickPhoto ? <LoadingButton type="button" onClick={onPickPhoto} loading={isPhotoUploading} loadingLabel="Processing photo…" estimatedSeconds={6} disabled={disabled}><Camera size={14} /> {hasPhoto ? "Change photo" : "Add photo"}</LoadingButton> : null}
          {hasPhoto && onRemovePhoto ? <button type="button" onClick={onRemovePhoto} disabled={disabled} className="toolbar-action--quiet">Remove photo</button> : null}
          <button type="button" onClick={onResetClick} disabled={disabled} className="toolbar-action--quiet">Reset to Master</button>
        </div>
        <details className="control-drawer">
          <summary><SlidersHorizontal size={14} /> Layout controls <ChevronDown size={14} /></summary>
          <div className="control-drawer__panel">
            <div className="control-drawer__group">CV layout</div>
            <label>CV text<select value={cvFontSize} disabled={disabled} onChange={(event) => onFontSizeChange(event.target.value)}>{cvFontSizeOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Weight<select value={cvFontWeight} disabled={disabled} onChange={(event) => onFontWeightChange(event.target.value)}><option value="300">Light</option><option value="400">Regular</option><option value="450">Medium</option><option value="500">Semibold</option></select></label>
            <label>CV line <input type="range" min="1.35" max="1.85" step="0.05" value={cvLineHeight} disabled={disabled} onChange={(event) => onLineHeightChange(event.target.value)} /><output>{cvLineHeight}</output></label>
            <label>Section gap <input type="range" min="8" max="24" step="1" value={cvSectionGap} disabled={disabled} onChange={(event) => onSectionGapChange(event.target.value)} /><output>{cvSectionGap}px</output></label>
            <label>Top margin<select value={cvTopMargin} disabled={disabled} onChange={(event) => onTopMarginChange(event.target.value)}>{cvMarginOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Bottom margin<select value={cvBottomMargin} disabled={disabled} onChange={(event) => onBottomMarginChange(event.target.value)}>{cvMarginOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Left margin<select value={cvLeftMargin} disabled={disabled} onChange={(event) => onLeftMarginChange(event.target.value)}>{cvMarginOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Right margin<select value={cvRightMargin} disabled={disabled} onChange={(event) => onRightMarginChange(event.target.value)}>{cvMarginOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <div className="control-drawer__group">ATS PDF</div>
            <label>ATS text<select value={atsFontSize} disabled={disabled} onChange={(event) => onAtsFontSizeChange(event.target.value)}>{atsFontSizeOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>ATS line <input type="range" min="1.05" max="1.6" step="0.05" value={atsLineHeight} disabled={disabled} onChange={(event) => onAtsLineHeightChange(event.target.value)} /><output>{atsLineHeight}</output></label>
            <label>ATS gap <input type="range" min="4" max="16" step="1" value={atsSectionGap} disabled={disabled} onChange={(event) => onAtsSectionGapChange(event.target.value)} /><output>{atsSectionGap}px</output></label>
            <label>ATS margin<select value={atsPageMargin} disabled={disabled} onChange={(event) => onAtsPageMarginChange(event.target.value)}>{atsPageMarginOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <LoadingButton type="button" onClick={onCopyPlainText} loading={isCopyingPlainText} loadingLabel="Copying…" estimatedSeconds={2} disabled={disabled} className="control-drawer__copy"><FileJson size={14} /> Copy plain text</LoadingButton>
          </div>
        </details>
      </div>
    </header>
  );
}
