"use client";

import { useEffect, useState } from "react";
import { JobMetadata, TailorResponse } from "@/types/resume";

const loadingMessages = [
  "Reading job description...",
  "Matching your experience...",
  "Rewriting bullets...",
  "Almost done..."
];

function getScoreColor(score: number) {
  if (score >= 80) return "#1D9E75";
  if (score >= 60) return "#EF9F27";
  return "#E24B4A";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Likely to be shortlisted";
  if (score >= 60) return "Might need more tailoring";
  return "Unlikely to be shortlisted";
}

type QuickApplyPanelProps = {
  jobDescription: string;
  metadata: JobMetadata;
  result: TailorResponse | null;
  error: string | null;
  isLoading: boolean;
  disabled: boolean;
  activeTab: "preview" | "changes";
  onJobDescriptionChange: (value: string) => void;
  onJobDescriptionPaste: (value: string) => void;
  onMetadataChange: (key: keyof JobMetadata, value: string) => void;
  onGenerate: () => void;
  onTabChange: (tab: "preview" | "changes") => void;
};

export function QuickApplyPanel({
  jobDescription,
  metadata,
  result,
  error,
  isLoading,
  disabled,
  activeTab,
  onJobDescriptionChange,
  onJobDescriptionPaste,
  onMetadataChange,
  onGenerate,
  onTabChange
}: QuickApplyPanelProps) {
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [editingField, setEditingField] = useState<keyof JobMetadata | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setLoadingIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingMessages.length);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  const metadataEntries = [
    { key: "company", label: metadata.company || "Company" },
    { key: "role", label: metadata.role || "Role title" },
    { key: "location", label: metadata.location || "Location" }
  ] as const;

  return (
    <aside className="no-print rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-panel">
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
          Quick Apply
        </div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">
          Paste JD, tailor, export
        </h2>
      </div>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Paste job description</span>
          <textarea
            value={jobDescription}
            onChange={(event) => onJobDescriptionChange(event.target.value)}
            onPaste={(event) => {
              const pastedText = event.clipboardData.getData("text");
              if (pastedText.trim()) {
                onJobDescriptionPaste(pastedText);
              }
            }}
            rows={10}
            disabled={disabled}
            placeholder="Paste the full job description here."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {metadataEntries.map(({ key, label }) =>
            editingField === key ? (
              <input
                key={key}
                autoFocus
                value={metadata[key]}
                disabled={disabled}
                onChange={(event) => onMetadataChange(key, event.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setEditingField(null);
                  }
                }}
                className="min-w-[120px] rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-slate-700 outline-none"
              />
            ) : (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => setEditingField(key)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {label}
              </button>
            )
          )}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-accent px-4 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>{loadingMessages[loadingIndex]}</span>
            </>
          ) : (
            <>
              <span>⚡ Tailor &amp; Generate</span>
              <span className="text-xs font-medium text-blue-100">Cmd+Enter</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/70 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onTabChange("preview")}
            className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
              activeTab === "preview"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => onTabChange("changes")}
            className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
              activeTab === "changes"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            What changed
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {activeTab === "preview" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <p className="leading-6">
              The live A4 preview in the center updates with the current tailored CV.
            </p>
            <p className="mt-3 text-slate-500">
              Use the action row below the preview to export PDF or ATS text.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {result?.matchScore !== undefined && result?.matchBreakdown && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-4 font-semibold text-slate-900">Match score</div>
                <div className="mb-6 flex flex-col items-center">
                  <div className="text-4xl font-bold" style={{ color: getScoreColor(result.matchScore) }}>
                    {result.matchScore}%
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-600">
                    {getScoreLabel(result.matchScore)}
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Keywords", score: result.matchBreakdown.keywords },
                    { label: "Experience", score: result.matchBreakdown.experience },
                    { label: "Skills", score: result.matchBreakdown.skills }
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-700">
                        <span>{item.label}</span>
                        <span>{item.score}%</span>
                      </div>
                      <div style={{ height: "4px", borderRadius: "2px", background: "#eee" }}>
                        <div
                          style={{
                            width: `${item.score}%`,
                            height: "4px",
                            background: getScoreColor(item.score),
                            borderRadius: "2px"
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              {result ? (
              <ul className="space-y-2 text-sm text-slate-700">
                {result.changes.map((item, index) => (
                  <li key={`${item}-${index}`} className="rounded-xl bg-emerald-50 px-3 py-2">
                    ✓ {item}
                  </li>
                ))}
                {result.warnings.map((item, index) => (
                  <li key={`${item}-${index}`} className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
                    ⚠ {item}
                  </li>
                ))}
                {result.changes.length === 0 && result.warnings.length === 0 ? (
                  <li className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500">
                    No changes or warnings returned.
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Generate a tailored CV to see the change log.</p>
            )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
