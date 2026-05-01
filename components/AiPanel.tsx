"use client";

import { ResumeSectionKey, RewriteResponse } from "@/types/resume";

type AiPanelProps = {
  selectedSection: ResumeSectionKey | null;
  selectedSectionLabel: string;
  instruction: string;
  jobDescription: string;
  suggestion: RewriteResponse | null;
  isLoading: boolean;
  error: string | null;
  onInstructionChange: (value: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onGenerate: () => void;
  onAccept: () => void;
  onReject: () => void;
};

export function AiPanel({
  selectedSection,
  selectedSectionLabel,
  instruction,
  jobDescription,
  suggestion,
  isLoading,
  error,
  onInstructionChange,
  onJobDescriptionChange,
  onGenerate,
  onAccept,
  onReject
}: AiPanelProps) {
  return (
    <aside className="no-print rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-panel">
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
          AI Assistant
        </div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Natural language editor</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Edit the resume in plain English. You can target one selected card or change text anywhere in the CV. For bold emphasis, ask for `**double asterisks**`.
        </p>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Focus section: {selectedSection ? selectedSectionLabel : "Whole resume"}
        </div>
      </div>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">What do you want to change?</span>
          <textarea
            value={instruction}
            onChange={(event) => onInstructionChange(event.target.value)}
            rows={5}
            placeholder="Bold the adapter-framework bullet, remove the internship note, shorten the profile, or tailor the resume to this job..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Paste job description</span>
          <textarea
            value={jobDescription}
            onChange={(event) => onJobDescriptionChange(event.target.value)}
            rows={6}
            placeholder="Optional: paste the role description to align keywords and emphasis."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300"
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? "Generating suggestion..." : "Generate suggestion"}
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {suggestion ? (
          <>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                Suggestion ready
              </div>
              <div className="text-sm text-slate-700">
                {suggestion.changedSections.length > 0
                  ? `This update changes: ${suggestion.changedSections.join(", ")}`
                  : "No effective content change was detected."}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Summary of changes
              </div>
              <ul className="space-y-2 text-sm text-slate-700">
                {suggestion.summaryOfChanges.map((item, index) => (
                  <li key={`${item}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Warnings
              </div>
              {suggestion.warnings.length > 0 ? (
                <ul className="space-y-2 text-sm text-amber-800">
                  {suggestion.warnings.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-xl bg-amber-50 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No warnings returned.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onAccept}
                className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={onReject}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Reject
              </button>
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}
