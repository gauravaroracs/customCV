"use client";

import { JobMetadata } from "@/types/resume";

export type CvChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type CvChatPanelProps = {
  messages: CvChatMessage[];
  jobDescription: string;
  metadata: JobMetadata;
  draft: string;
  isLoading: boolean;
  isScoring: boolean;
  isSaveSuccess: boolean;
  error: string | null;
  onDraftChange: (value: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onJobDescriptionPaste?: (pastedText: string) => void;
  onMetadataChange: (key: keyof JobMetadata, value: string) => void;
  onSend: () => void;
  onScore: () => void;
  onSaveApplication: () => void;
};

export function CvChatPanel({
  messages,
  jobDescription,
  metadata,
  draft,
  isLoading,
  isScoring,
  isSaveSuccess,
  error,
  onDraftChange,
  onJobDescriptionChange,
  onJobDescriptionPaste,
  onMetadataChange,
  onSend,
  onScore,
  onSaveApplication
}: CvChatPanelProps) {
  return (
    <section className="no-print rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-panel">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">CV Copilot</div>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Chat edits the JSON</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Describe changes, paste a JD to tailor, or ask for bullet rewrites — the assistant returns updated CV JSON
            merged into your editor. Everything flows through one resume object.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onScore}
            disabled={isLoading || isScoring || !jobDescription.trim()}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {isScoring ? "Scoring…" : "Score vs JD"}
          </button>
          <button
            type="button"
            onClick={onSaveApplication}
            disabled={isLoading || !jobDescription.trim()}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
              isSaveSuccess ? "bg-emerald-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {isSaveSuccess ? "Saved!" : "Save application"}
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Company
          <input
            value={metadata.company}
            onChange={(e) => onMetadataChange("company", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            placeholder="Acme"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Role
          <input
            value={metadata.role}
            onChange={(e) => onMetadataChange("role", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            placeholder="Software Engineer"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Location
          <input
            value={metadata.location}
            onChange={(e) => onMetadataChange("location", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            placeholder="Berlin"
          />
        </label>
      </div>

      <label className="mb-4 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job description (optional)</span>
        <textarea
          value={jobDescription}
          onChange={(e) => onJobDescriptionChange(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData?.getData("text/plain") ?? "";
            if (pasted.trim() && onJobDescriptionPaste) {
              window.setTimeout(() => {
                onJobDescriptionPaste(pasted);
              }, 0);
            }
          }}
          rows={4}
          placeholder="Paste JD when tailoring, scoring, or asking for keyword alignment…"
          className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300"
        />
      </label>

      <div className="mb-4 max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
        {messages.length === 0 ? (
          <p className="text-slate-500">No messages yet. Try: “Shorten summary”, “Tailor bullets to this JD”, “Add Kubernetes to Tools”.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((message, index) => (
              <li
                key={`${message.role}-${index}`}
                className={`rounded-xl px-3 py-2 ${
                  message.role === "user" ? "ml-8 bg-blue-600 text-white" : "mr-8 bg-white text-slate-800 shadow-sm"
                }`}
              >
                <span className="text-[10px] font-bold uppercase opacity-80">{message.role}</span>
                <div className="mt-1 whitespace-pre-wrap">{message.content}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? (
        <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-slate-600">Message</span>
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && draft.trim() && !isLoading) {
                e.preventDefault();
                e.stopPropagation();
                onSend();
              }
            }}
            rows={3}
            placeholder="Ask for edits… (⌘/Ctrl + Enter to send)"
            disabled={isLoading}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 disabled:opacity-60"
          />
        </label>
        <button
          type="button"
          onClick={onSend}
          disabled={isLoading || !draft.trim()}
          className="shrink-0 rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? "Updating…" : "Send"}
        </button>
      </div>
    </section>
  );
}
