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

const reviewLabels: Record<JobRecord["review_status"], string> = {
  new: "New",
  saved: "Saved",
  skipped: "Skipped",
  prepare_requested: "Preparing"
};

const scoreClass = (score: number | string | null | undefined) => {
  const value = Number(score ?? 0);
  if (value >= 80) return "bg-emerald-100 text-emerald-800";
  if (value >= 60) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
};

export function UnifiedJobsPanel({ masterCV, onPrepared }: Props) {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [preparation, setPreparation] = useState<PreparationState>({ application: null, step: "", error: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const payload = await response.json() as { jobs?: JobRecord[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load jobs.");
      setJobs(payload.jobs ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load jobs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadJobs(); }, [loadJobs]);

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

  const updateJob = async (job: JobRecord, review_status: JobRecord["review_status"]) => {
    const response = await fetch(`/api/jobs/${encodeURIComponent(job.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_status })
    });
    if (!response.ok) throw new Error("Could not update the job review status.");
    await loadJobs();
  };

  const runPreparation = async () => {
    if (!selectedJob || !masterCV) {
      setPreparation({ application: null, step: "", error: "Set a Master CV before preparing an application." });
      return;
    }

    setPreparation({ application: null, step: "Creating application…", error: null });
    try {
      const createResponse = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: selectedJob.id })
      });
      const created = await createResponse.json() as { application?: ApplicationRecord; error?: string };
      if (!createResponse.ok || !created.application) throw new Error(created.error ?? "Could not create application.");
      const applicationId = created.application.id;

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

      const jobDescription = selectedJob.job_description ?? "";
      if (!jobDescription.trim()) throw new Error("This job has no extracted description yet.");

      await patchStep("Scoring CV against job…");
      const scoreResponse = await fetch("/api/score-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: masterCV, jobDescription })
      });
      const score = await scoreResponse.json() as { matchScore?: number; matchBreakdown?: unknown; warnings?: string[]; error?: string };
      if (!scoreResponse.ok) throw new Error(score.error ?? "CV scoring failed.");

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
          metadata: { company: selectedJob.company, role: selectedJob.role, location: selectedJob.location }
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
          match_score: score.matchScore ?? tailored.matchScore ?? null,
          match_breakdown: score.matchBreakdown ?? tailored.matchBreakdown ?? null,
          warnings: [...(score.warnings ?? []), ...(tailored.warnings ?? []), ...(cover.warnings ?? [])],
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
        metadata: { company: selectedJob.company ?? "", role: selectedJob.role ?? "", location: selectedJob.location ?? "" },
        coverLetter: cover.coverLetter
      });
      await loadJobs();
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "Preparation failed.";
      setPreparation((current) => ({ ...current, step: "Failed", error: message }));
      if (preparation.application?.id) {
        await fetch(`/api/applications/${preparation.application.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preparation_status: "failed", preparation_error: message, current_step: "Failed" })
        });
      }
    }
  };

  return (
    <section className="no-print rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Application inbox</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Find a job, prepare the package</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">n8n sends jobs here. Select one to run your existing CV, scoring, and cover-letter tools in one workflow.</p>
        </div>
        <button type="button" onClick={() => void loadJobs()} disabled={refreshing} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-50">
          {refreshing ? "Refreshing…" : "Refresh jobs"}
        </button>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}<span className="mt-1 block text-xs text-amber-700">Add DATABASE_URL to .env.local and run Postgres to enable the inbox.</span></div> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          {loading ? <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">Loading jobs…</div> : null}
          {!loading && !jobs.length && !error ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No jobs yet. Run the n8n discovery workflow, then send a job to the CVPilot webhook.</div> : null}
          {jobs.map((job) => (
            <button key={job.id} type="button" onClick={() => setSelectedJob(job)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedJob?.id === job.id ? "border-blue-400 bg-blue-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900">{job.role || "Untitled role"}</div><div className="mt-1 text-sm text-slate-600">{job.company || "Unknown company"} · {job.location || "Location not specified"}</div></div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${scoreClass(job.match_score)}`}>{job.match_score ? `${job.match_score}%` : "Unscored"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500"><span className="rounded-full bg-slate-100 px-2 py-1">{reviewLabels[job.review_status]}</span>{job.priority ? <span className="rounded-full bg-slate-100 px-2 py-1">{job.priority}</span> : null}{job.language_requirement ? <span className="rounded-full bg-slate-100 px-2 py-1">{job.language_requirement}</span> : null}</div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          {selectedJob ? <>
            <div className="flex items-start justify-between gap-3"><div><div className="text-lg font-semibold text-slate-900">{selectedJob.role}</div><div className="text-sm text-slate-600">{selectedJob.company} · {selectedJob.location}</div></div><div className={`rounded-full px-3 py-1 text-sm font-bold ${scoreClass(selectedJob.match_score)}`}>{selectedJob.match_score ?? "—"}</div></div>
            {selectedJob.why_good ? <div className="mt-4"><div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Why it fits</div><p className="mt-1 text-sm leading-6 text-slate-700">{selectedJob.why_good}</p></div> : null}
            {selectedJob.risk ? <div className="mt-4"><div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Risk / gap</div><p className="mt-1 text-sm leading-6 text-slate-700">{selectedJob.risk}</p></div> : null}
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void updateJob(selectedJob, "saved")} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Save</button><button type="button" onClick={() => void updateJob(selectedJob, "skipped")} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Skip</button>{selectedJob.job_url ? <a href={selectedJob.job_url} target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Open job ↗</a> : null}</div>
            <button type="button" onClick={() => void runPreparation()} disabled={!masterCV || preparation.step !== "" && preparation.step !== "Complete" && preparation.step !== "Failed"} className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{preparation.step && preparation.step !== "Complete" && preparation.step !== "Failed" ? preparation.step : "Prepare application"}</button>
            {!masterCV ? <p className="mt-2 text-center text-xs text-amber-700">Set a Master CV above before preparing.</p> : null}
            {preparation.step === "Complete" ? <div className="mt-3 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-900">✓ Package ready. The tailored CV and cover letter are now loaded below.</div> : null}
            {preparation.error ? <div className="mt-3 rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-900">{preparation.error}</div> : null}
          </> : <div className="flex min-h-[260px] items-center justify-center text-center text-sm text-slate-500">Select a job to inspect its fit and prepare an application.</div>}
        </div>
      </div>
    </section>
  );
}
