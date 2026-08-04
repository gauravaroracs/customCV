"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApplicationRecord, JobRecord } from "@/lib/jobStore";
import type { JobMetadata, ResumeData, TailorResponse, CoverLetterResponse } from "@/types/resume";

type Props = {
  masterCV: ResumeData | null;
  onPrepared: (payload: { resume: ResumeData; metadata: JobMetadata; coverLetter: string }) => void;
};

type PreparationState = {
  application: ApplicationRecord | null;
  step: string;
  error: string | null;
};

type DiscoverySource = "n8n" | "codex" | null;
type SortMode = "fit" | "newest" | "oldest";

const reviewLabels: Record<JobRecord["review_status"], string> = {
  new: "New",
  saved: "Saved",
  skipped: "Skipped",
  prepare_requested: "Preparing"
};

const lifecycleLabels: Record<JobRecord["lifecycle_status"], string> = {
  active: "Active",
  inactive: "Inactive"
};

const scoreClass = (score: number | string | null | undefined) => {
  const value = Number(score ?? 0);
  if (value >= 80) return "bg-emerald-100 text-emerald-800";
  if (value >= 60) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
};

const numberOrNull = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function jobDateValue(job: JobRecord) {
  const raw = String(job.posted_date ?? "").trim();
  if (!raw) return null;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function displayJobDate(job: JobRecord) {
  const value = jobDateValue(job);
  return value ? new Intl.DateTimeFormat("en-DE", { day: "2-digit", month: "short", year: "numeric" }).format(value) : "Date unknown";
}

export function UnifiedJobsPanel({ masterCV, onPrepared }: Props) {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [preparation, setPreparation] = useState<PreparationState>({ application: null, step: "", error: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("fit");
  const [discoverySource, setDiscoverySource] = useState<DiscoverySource>(null);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [importingJob, setImportingJob] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/jobs?include_archived=${includeArchived ? "1" : "0"}`, { cache: "no-store" });
      const payload = await response.json() as { jobs?: JobRecord[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load jobs.");
      const nextJobs = payload.jobs ?? [];
      setJobs(nextJobs);
      setSelectedJob((current) => current ? nextJobs.find((job) => job.id === current.id) ?? null : null);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load jobs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [includeArchived]);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

  const visibleJobs = [...jobs].sort((a, b) => {
    if (sortMode === "fit") return 0;
    const aDate = jobDateValue(a);
    const bDate = jobDateValue(b);
    if (aDate === null && bDate === null) return 0;
    if (aDate === null) return 1;
    if (bDate === null) return -1;
    return sortMode === "newest" ? bDate - aDate : aDate - bDate;
  });

  const runDiscovery = async (source: Exclude<DiscoverySource, null>) => {
    setDiscoverySource(source);
    setDiscoveryMessage(null);
    try {
      const endpoint = source === "codex" ? "/api/integrations/codex/jobs" : "/api/integrations/n8n/discover";
      const response = await fetch(endpoint, { method: "POST" });
      const payload = await response.json() as { imported?: number; message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? `Could not start ${source} discovery.`);
      setDiscoveryMessage(payload.message ?? `${payload.imported ?? 0} jobs imported.`);
      await loadJobs();
    } catch (discoveryError) {
      setDiscoveryMessage(discoveryError instanceof Error ? discoveryError.message : "Discovery failed.");
    } finally {
      setDiscoverySource(null);
    }
  };

  useEffect(() => {
    if (!selectedJob) return;
    const loadExistingApplication = async () => {
      try {
        const response = await fetch(`/api/applications?job_id=${encodeURIComponent(selectedJob.id)}`, { cache: "no-store" });
        const payload = await response.json() as { application?: ApplicationRecord | null };
        if (response.ok && payload.application) {
          setPreparation({
            application: payload.application,
            step: payload.application.preparation_status === "ready" ? "Complete" : payload.application.current_step ?? "",
            error: payload.application.preparation_error
          });
          if (payload.application.preparation_status === "ready" && payload.application.tailored_cv && payload.application.cover_letter) {
            onPrepared({
              resume: payload.application.tailored_cv as ResumeData,
              metadata: { company: selectedJob.company ?? "", role: selectedJob.role ?? "", location: selectedJob.location ?? "" },
              coverLetter: payload.application.cover_letter
            });
          }
        } else {
          setPreparation({ application: null, step: "", error: null });
        }
      } catch {
        // The job can still be reviewed if the application lookup is unavailable.
      }
    };
    void loadExistingApplication();
  }, [onPrepared, selectedJob]);

  const updateJob = async (
    job: JobRecord,
    patch: Partial<Pick<JobRecord, "review_status" | "lifecycle_status" | "inactive_reason">> & { archived?: boolean }
  ) => {
    const response = await fetch(`/api/jobs/${encodeURIComponent(job.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) throw new Error("Could not update the job review status.");
    await loadJobs();
  };

  const selectedJobIsArchived = Boolean(selectedJob?.archived_at);
  const selectedJobIsInactive = selectedJob?.lifecycle_status === "inactive";
  const canPrepareSelectedJob = Boolean(selectedJob && !selectedJobIsArchived && !selectedJobIsInactive);

  const prepareJob = async (job: JobRecord): Promise<boolean> => {
    if (!masterCV) {
      setPreparation({ application: null, step: "", error: "Set a Master CV before preparing an application." });
      return false;
    }

    setPreparation({ application: null, step: "Creating application…", error: null });
    let applicationId: string | null = null;
    try {
      const createResponse = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id })
      });
      const created = await createResponse.json() as { application?: ApplicationRecord; error?: string };
      if (!createResponse.ok || !created.application) throw new Error(created.error ?? "Could not create application.");
      applicationId = created.application.id;

      const startResponse = await fetch(`/api/applications/${applicationId}/prepare`, { method: "POST" });
      if (!startResponse.ok) throw new Error("Could not start preparation.");

      const patchStep = async (step: string) => {
        setPreparation((current) => ({ ...current, application: created.application ?? null, step, error: null }));
        await fetch(`/api/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_step: step })
        });
      };

      const jobDescription = job.job_description ?? "";
      if (!jobDescription.trim()) throw new Error("This job has no extracted description yet.");

      await patchStep("Tailoring CV…");
      const tailorResponse = await fetch("/api/tailor-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterCV, jobDescription })
      });
      const tailored = await tailorResponse.json() as TailorResponse & { error?: string };
      if (!tailorResponse.ok || !tailored.tailoredCV) throw new Error(tailored.error ?? "CV tailoring failed.");

      await patchStep("Writing cover letter…");
      const coverResponse = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: tailored.tailoredCV,
          jobDescription,
          metadata: { company: job.company, role: job.role, location: job.location }
        })
      });
      const cover = await coverResponse.json() as CoverLetterResponse & { error?: string };
      if (!coverResponse.ok || !cover.coverLetter) throw new Error(cover.error ?? "Cover-letter generation failed.");

      const finishedResponse = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ready_for_review",
          preparation_status: "ready",
          current_step: "Complete",
          tailored_cv: tailored.tailoredCV,
          cover_letter: cover.coverLetter,
          match_score: numberOrNull(job.match_score),
          match_breakdown: null,
          warnings: [...(tailored.warnings ?? []), ...(cover.warnings ?? [])],
          gap_analysis: tailored.changes ?? [],
          event_note: "Application package ready for review"
        })
      });
      const finished = await finishedResponse.json() as { application?: ApplicationRecord; error?: string };
      if (!finishedResponse.ok || !finished.application) throw new Error(finished.error ?? "Could not save application package.");

      setPreparation({ application: finished.application, step: "Complete", error: null });
      void fetch(`/api/applications/${applicationId}/sync-sheet`, { method: "POST" });
      onPrepared({
        resume: tailored.tailoredCV,
        metadata: { company: job.company ?? "", role: job.role ?? "", location: job.location ?? "" },
        coverLetter: cover.coverLetter
      });
      await loadJobs();
      return true;
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "Preparation failed.";
      setPreparation((current) => ({ ...current, step: "Failed", error: message }));
      if (applicationId) {
        await fetch(`/api/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preparation_status: "failed", preparation_error: message, current_step: "Failed" })
        });
      }
      return false;
    }
  };

  const runPreparation = async () => {
    if (!selectedJob) {
      setPreparation({ application: null, step: "", error: "Select a job before preparing an application." });
      return;
    }
    await prepareJob(selectedJob);
  };

  const importJobPage = async () => {
    setImportingJob(true);
    setImportMessage(null);
    try {
      const response = await fetch("/api/jobs/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText, url: importUrl })
      });
      const payload = await response.json() as { job?: JobRecord; error?: string };
      if (!response.ok || !payload.job) throw new Error(payload.error ?? "Could not import that job page.");
      setImportText("");
      setImportUrl("");
      await loadJobs();
      setSelectedJob(payload.job);
      if (!masterCV) {
        setImportMessage("Job imported. Set a Master CV, then prepare the CV and cover letter.");
        return;
      }
      const prepared = await prepareJob(payload.job);
      setImportMessage(prepared
        ? "Job imported. Your tailored CV and cover letter are ready for review."
        : "Job imported, but preparation failed. Check the application status for details.");
    } catch (importError) {
      setImportMessage(importError instanceof Error ? importError.message : "Could not import that job page.");
    } finally {
      setImportingJob(false);
    }
  };

  return (
    <section id="job-inbox" className="no-print workspace-card inbox-card">
      <div className="section-heading">
        <div>
          <div className="eyebrow eyebrow--blue">Application inbox <span>{jobs.length ? `${jobs.length} roles` : "Live"}</span></div>
          <h2>Find a job. Make a case.</h2>
          <p>Bring in scored roles from n8n or search the live web with Codex. Review the signal, then prepare the application.</p>
        </div>
        <div className="toolbar-actions">
          <button type="button" onClick={() => void loadJobs()} disabled={refreshing || Boolean(discoverySource)} className="button button--ghost">
            <span className={refreshing ? "spin" : ""}>↻</span> {refreshing ? "Refreshing" : "Refresh"}
          </button>
          <button type="button" onClick={() => void runDiscovery("n8n")} disabled={Boolean(discoverySource)} className="button button--outline">
            {discoverySource === "n8n" ? "Starting n8n…" : "Discover with n8n"}
          </button>
          <button type="button" onClick={() => void runDiscovery("codex")} disabled={Boolean(discoverySource)} className="button button--outline">
            {discoverySource === "codex" ? "Searching with Codex…" : "Discover with Codex"}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert--warning"><strong>Inbox unavailable.</strong> {error}<span>Add DATABASE_URL to the running environment to enable live jobs.</span></div> : null}
      {discoveryMessage ? <div className={`alert ${discoveryMessage.toLowerCase().includes("failed") || discoveryMessage.toLowerCase().includes("not configured") ? "alert--error" : "alert--success"}`}>{discoveryMessage}</div> : null}
      <form onSubmit={(event) => { event.preventDefault(); void importJobPage(); }} className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Paste the complete job page</span>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            disabled={importingJob || Boolean(discoverySource)}
            placeholder="Paste everything from the job page here…"
            rows={6}
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 disabled:opacity-60"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Source URL (optional)</span>
            <input
              type="url"
              value={importUrl}
              onChange={(event) => setImportUrl(event.target.value)}
              disabled={importingJob || Boolean(discoverySource)}
              placeholder="https://company.com/careers/software-engineer"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 disabled:opacity-60"
            />
          </label>
          <button type="submit" disabled={!importText.trim() || importingJob || Boolean(discoverySource)} className="button button--outline">
            {importingJob ? "Importing and preparing…" : "Import, tailor and write"}
          </button>
        </div>
      </form>
      {importMessage ? <div className={`alert ${["could not", "error", "failed"].some((term) => importMessage.toLowerCase().includes(term)) ? "alert--error" : "alert--success"}`}>{importMessage}</div> : null}

      <div className="inbox-layout">
        <div className="job-list-shell">
          <div className="list-toolbar">
            <span>Shortlist</span>
            <div className="toolbar-actions">
              <span className="list-toolbar__hint">{jobs.length ? (sortMode === "fit" ? "Sorted by fit" : sortMode === "newest" ? "Newest first" : "Oldest first") : "Waiting for discovery"}</span>
              <select aria-label="Sort jobs" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600">
                <option value="fit">Best fit</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>
          <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs text-slate-500">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
              <span>Show archived</span>
            </label>
            <span>{includeArchived ? "Archived roles included" : "Archived roles hidden"}</span>
          </div>
          <div className="job-list">
            {loading ? <div className="empty-state"><span className="loading-orb" />Loading your shortlist…</div> : null}
            {!loading && !jobs.length && !error ? <div className="empty-state"><strong>No roles yet</strong><span>Use n8n for your scored workflow, or ask Codex to find current listings.</span></div> : null}
            {visibleJobs.map((job) => (
              <button key={job.id} type="button" onClick={() => setSelectedJob(job)} className={`job-row ${selectedJob?.id === job.id ? "job-row--selected" : ""}`}>
                <span className="job-row__marker" />
                <span className="job-row__body"><strong>{job.role || "Untitled role"}</strong><span>{job.company || "Unknown company"} <i>·</i> {job.location || "Location not specified"}</span><small>{displayJobDate(job)} <i>·</i> {reviewLabels[job.review_status]} <i>·</i> {lifecycleLabels[job.lifecycle_status]}{job.archived_at ? " · Archived" : ""}{job.priority ? ` · ${job.priority}` : ""}</small></span>
                <span className={`score-badge ${scoreClass(job.match_score)}`}>{job.match_score ? `${job.match_score}%` : "—"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="job-detail-shell">
          {selectedJob ? <>
            <div className="detail-kicker"><span className="detail-kicker__dot" /> Role signal</div>
            <div className="detail-title-row"><div><h3>{selectedJob.role}</h3><p>{selectedJob.company} <span>·</span> {selectedJob.location}</p></div><div className={`detail-score ${scoreClass(selectedJob.match_score)}`}><strong>{selectedJob.match_score ?? "—"}</strong><span>match</span></div></div>
            <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{reviewLabels[selectedJob.review_status]}</span>
              <span className={`rounded-full px-3 py-1 ${selectedJob.lifecycle_status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{lifecycleLabels[selectedJob.lifecycle_status]}</span>
              {selectedJob.archived_at ? <span className="rounded-full bg-slate-900 px-3 py-1 text-white">Archived</span> : null}
            </div>
            {selectedJob.tech_stack ? <div className="tag-cloud">{String(selectedJob.tech_stack).split(",").slice(0, 6).map((tag) => <span key={tag}>{tag.trim()}</span>)}</div> : null}
            <div className="detail-block detail-block--good"><span className="detail-block__label">Why it fits</span><p>{selectedJob.why_good || "No fit note was added for this role."}</p></div>
            <div className="detail-block detail-block--risk"><span className="detail-block__label">Watch for</span><p>{selectedJob.risk || "No risk note was added for this role."}</p></div>
            <div className="detail-actions">
              <button type="button" onClick={() => void updateJob(selectedJob, { review_status: "saved" })} className="button button--outline">Save role</button>
              <button type="button" onClick={() => void updateJob(selectedJob, { review_status: "skipped" })} className="button button--ghost">Skip</button>
              {selectedJob.lifecycle_status === "active" ? (
                <button type="button" onClick={() => void updateJob(selectedJob, { lifecycle_status: "inactive", inactive_reason: "Manually deactivated from inbox" })} className="button button--ghost">Mark inactive</button>
              ) : (
                <button type="button" onClick={() => void updateJob(selectedJob, { lifecycle_status: "active", inactive_reason: "" })} className="button button--outline">Mark active</button>
              )}
              {selectedJob.archived_at ? (
                <button type="button" onClick={() => void updateJob(selectedJob, { archived: false })} className="button button--outline">Restore</button>
              ) : (
                <button type="button" onClick={() => void updateJob(selectedJob, { archived: true })} className="button button--ghost">Archive</button>
              )}
              {selectedJob.job_url ? <a href={selectedJob.job_url} target="_blank" rel="noreferrer" className="button button--ghost">Open listing ↗</a> : null}
            </div>
            <button type="button" onClick={() => void runPreparation()} disabled={!masterCV || !canPrepareSelectedJob || (preparation.step !== "" && preparation.step !== "Complete" && preparation.step !== "Failed")} className="prepare-button"><span>{preparation.step && preparation.step !== "Complete" && preparation.step !== "Failed" ? preparation.step : "Prepare application"}</span><span>→</span></button>
            {!masterCV ? <p className="detail-note">Set a Master CV above before preparing.</p> : null}
            {selectedJobIsArchived ? <p className="detail-note">Archived roles stay in history but are hidden from the default inbox and cannot be prepared.</p> : null}
            {selectedJobIsInactive ? <p className="detail-note">This role is marked inactive in the backend. Restore it to active before preparing.</p> : null}
            {selectedJob.inactive_reason ? <p className="detail-note">Inactive reason: {selectedJob.inactive_reason}</p> : null}
            {preparation.step === "Complete" ? <div className="alert alert--success">✓ Package ready. Your tailored CV and cover letter are loaded below.</div> : null}
            {preparation.error ? <div className="alert alert--error">{preparation.error}</div> : null}
          </> : <div className="detail-empty"><div className="detail-empty__icon">✦</div><strong>Choose a role to inspect</strong><span>Your shortlist and fit notes will appear here.</span></div>}
        </div>
      </div>
    </section>
  );
}
