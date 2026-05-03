"use client";

import { useEffect, useState } from "react";
import type { CvEditProposal, JobMetadata, ProposeEditsResponse, TailorResponse } from "@/types/resume";

const loadingMessages = [
  "Reading job description...",
  "Matching your experience...",
  "Rewriting bullets...",
  "Almost done..."
];

const suggestLoadingMessages = [
  "Reading your CV against the JD...",
  "Spotting gaps and wins...",
  "Drafting discrete edit proposals...",
  "Almost ready to review..."
];

function previewProposalPatch(proposal: CvEditProposal): string {
  switch (proposal.patchType) {
    case "profile":
      return proposal.profileText.trim() || "(empty)";
    case "skills":
      return proposal.skillGroups
        .map((group) => `${group.groupName}:\n${group.items.map((item) => `- ${item}`).join("\n")}`)
        .join("\n\n");
    case "experience_bullets":
      return [`Role/company contains: "${proposal.experienceRoleHint}"`, ...proposal.experienceBullets.map((b) => `- ${b}`)].join("\n");
    case "projects_list":
      return proposal.projectItems
        .map((project) => `${project.name} | ${project.tech}\n${project.bullets.map((b) => `- ${b}`).join("\n")}`)
        .join("\n\n");
    case "languages":
      return proposal.languageItems.map((language) => `${language.name}: ${language.level}`).join("\n");
    default:
      return "";
  }
}

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
  proposeEditsResult: ProposeEditsResponse | null;
  error: string | null;
  isLoading: boolean;
  isSuggestLoading: boolean;
  isEditLoading: boolean;
  isRescoring: boolean;
  isSaveSuccess: boolean;
  editSuccess: string | null;
  proposalApplySuccess: string | null;
  usesWorkingCvAsSuggestBase: boolean;
  disabled: boolean;
  activeTab: "preview" | "changes";
  onJobDescriptionChange: (value: string) => void;
  onJobDescriptionPaste: (value: string) => void;
  onMetadataChange: (key: keyof JobMetadata, value: string) => void;
  onGenerate: () => void;
  onSuggestEdits: (userNotes: string) => void;
  onDismissProposals: () => void;
  onApplySelectedProposals: (proposalIds: string[]) => void;
  onTabChange: (tab: "preview" | "changes") => void;
  onApplyEdit: (instruction: string) => void;
  onRescore: () => void;
  onSaveApplication: () => void;
};

export function QuickApplyPanel({
  jobDescription,
  metadata,
  result,
  proposeEditsResult,
  error,
  isLoading,
  isSuggestLoading,
  isEditLoading,
  isRescoring,
  isSaveSuccess,
  editSuccess,
  proposalApplySuccess,
  usesWorkingCvAsSuggestBase,
  disabled,
  activeTab,
  onJobDescriptionChange,
  onJobDescriptionPaste,
  onMetadataChange,
  onGenerate,
  onSuggestEdits,
  onDismissProposals,
  onApplySelectedProposals,
  onTabChange,
  onApplyEdit,
  onRescore,
  onSaveApplication
}: QuickApplyPanelProps) {
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [suggestLoadingIndex, setSuggestLoadingIndex] = useState(0);
  const [editingField, setEditingField] = useState<keyof JobMetadata | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [suggestUserNotes, setSuggestUserNotes] = useState("");
  const [selectedProposalIds, setSelectedProposalIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!isSuggestLoading) {
      setSuggestLoadingIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setSuggestLoadingIndex((current) => (current + 1) % suggestLoadingMessages.length);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isSuggestLoading]);

  useEffect(() => {
    if (!proposeEditsResult?.proposals?.length) {
      setSelectedProposalIds(new Set());
      return;
    }

    setSelectedProposalIds(new Set(proposeEditsResult.proposals.map((proposal) => proposal.id)));
  }, [proposeEditsResult]);

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

        <div className="rounded-[24px] border border-teal-200 bg-teal-50/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Suggest edits</span>
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-800">Review first</span>
          </div>
          <p className="mb-2 text-xs text-slate-600">
            Like ChatGPT: get discrete bullet/profile/skill proposals, preview each one, then apply only what you want.
            {usesWorkingCvAsSuggestBase ? (
              <span className="block pt-1 text-amber-800">Using your working CV as the base — set a Master CV for the fullest evidence pool.</span>
            ) : null}
          </p>
          <textarea
            value={suggestUserNotes}
            onChange={(event) => setSuggestUserNotes(event.target.value)}
            rows={2}
            disabled={disabled || isLoading}
            placeholder='Optional: "Bold metrics", "Keep only 4 SE bullets", "De-emphasize Kubernetes"'
            className="mb-3 w-full rounded-2xl border border-teal-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => {
              onSuggestEdits(suggestUserNotes.trim());
            }}
            disabled={disabled || isLoading || !jobDescription.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSuggestLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>{suggestLoadingMessages[suggestLoadingIndex]}</span>
              </>
            ) : (
              <span>💡 Propose JD edits</span>
            )}
          </button>

          {proposalApplySuccess ? (
            <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-900">
              ✓ {proposalApplySuccess}
            </div>
          ) : null}

          {proposeEditsResult ? (
            <div className="mt-4 space-y-3 border-t border-teal-200 pt-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Review proposals</p>
                <button
                  type="button"
                  onClick={onDismissProposals}
                  disabled={disabled || isSuggestLoading}
                  className="text-xs font-semibold text-teal-700 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Clear list
                </button>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">{proposeEditsResult.coachingSummary}</p>
              {proposeEditsResult.warnings.length > 0 ? (
                <ul className="space-y-1 text-xs text-amber-900">
                  {proposeEditsResult.warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`} className="rounded-lg bg-amber-50 px-2 py-1">
                      ⚠ {warning}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedProposalIds(new Set(proposeEditsResult.proposals.map((proposal) => proposal.id)))
                  }
                  disabled={disabled || proposeEditsResult.proposals.length === 0}
                  className="rounded-full border border-teal-300 bg-white px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProposalIds(new Set())}
                  disabled={disabled || proposeEditsResult.proposals.length === 0}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Select none
                </button>
              </div>

              <ul className="max-h-[min(420px,50vh)] space-y-3 overflow-y-auto pr-1">
                {proposeEditsResult.proposals.map((proposal) => (
                  <li key={proposal.id}>
                    <label className="flex cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-teal-300">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        checked={selectedProposalIds.has(proposal.id)}
                        onChange={(event) => {
                          setSelectedProposalIds((previous) => {
                            const next = new Set(previous);
                            if (event.target.checked) {
                              next.add(proposal.id);
                            } else {
                              next.delete(proposal.id);
                            }
                            return next;
                          });
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-semibold text-slate-900">{proposal.title}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                            {proposal.patchType.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{proposal.rationale}</p>
                        {proposal.beforeSummary.trim() ? (
                          <p className="mt-2 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700">Was: </span>
                            {proposal.beforeSummary}
                          </p>
                        ) : null}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[11px] font-semibold text-teal-700">
                            Preview patch
                          </summary>
                          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-2 font-mono text-[11px] text-slate-800">
                            {previewProposalPatch(proposal)}
                          </pre>
                        </details>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => {
                  const ids = [...selectedProposalIds];
                  if (ids.length === 0) {
                    return;
                  }
                  onApplySelectedProposals(ids);
                }}
                disabled={disabled || selectedProposalIds.size === 0 || proposeEditsResult.proposals.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Apply selected to working CV ({selectedProposalIds.size})
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Quick Edit box */}
      <div className="mt-5 rounded-[24px] border border-violet-200 bg-violet-50/60 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">Quick Edit</span>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">AI</span>
        </div>
        <p className="mb-3 text-xs text-slate-500">Type any change in plain English and the AI will apply it to your CV. You can also ask for **bold** emphasis.</p>
        <textarea
          value={editInstruction}
          onChange={(e) => setEditInstruction(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && editInstruction.trim() && !isEditLoading) {
              e.preventDefault();
              onApplyEdit(editInstruction.trim());
              setEditInstruction("");
            }
          }}
          rows={3}
          disabled={disabled || isEditLoading}
          placeholder={'e.g. "Set German to B1 learning", "Make my profile more confident", "Bold the QPS numbers"'}
          className="w-full rounded-2xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {editSuccess ? (
          <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">✓ {editSuccess}</div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (editInstruction.trim()) {
              onApplyEdit(editInstruction.trim());
              setEditInstruction("");
            }
          }}
          disabled={disabled || isEditLoading || !editInstruction.trim()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isEditLoading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Applying edit...</span>
            </>
          ) : (
            <>
              <span>✏ Apply Edit</span>
              <span className="text-xs font-medium text-violet-200">⌘+Enter</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onRescore}
          disabled={disabled || isRescoring || isLoading || !jobDescription.trim()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRescoring ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-300 border-t-violet-700" />
              <span>Scoring...</span>
            </>
          ) : (
            <span>📊 Re-check Score</span>
          )}
        </button>
      </div>

      {/* Save Application */}
      {jobDescription.trim() && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onSaveApplication}
            disabled={disabled || isLoading}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              isSaveSuccess
                ? "bg-emerald-500 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isSaveSuccess ? (
              <><span>✓</span><span>Saved to Recent!</span></>
            ) : (
              <><span>💾</span><span>Save Application</span><span className="ml-auto text-xs font-normal text-slate-400">{metadata.company || "Company"} · {metadata.role || "Role"}</span></>
            )}
          </button>
        </div>
      )}

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/70 p-2">
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
