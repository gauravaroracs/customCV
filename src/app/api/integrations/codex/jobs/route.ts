import { NextResponse } from "next/server";
import OpenAI from "openai";
import { upsertJob, type JobInput } from "@/lib/jobStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_MODEL = "gpt-5-mini";

const discoverySchema = {
  type: "object",
  additionalProperties: false,
  required: ["jobs"],
  properties: {
    jobs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["job_id", "company", "role", "location", "job_url", "posted_date", "job_description", "why_good"],
        properties: {
          job_id: { type: "string" },
          company: { type: "string" },
          role: { type: "string" },
          location: { type: "string" },
          job_url: { type: "string" },
          posted_date: { type: "string" },
          job_description: { type: "string" },
          why_good: { type: "string" }
        }
      }
    }
  }
} as const;

const systemPrompt = `You are CVPilot's job discovery researcher.
Find current, specific job listings for this profile:
- M.Sc. Computer Science student at TU Darmstadt, based in Darmstadt
- English-friendly software, AI, data, automation, frontend, backend, full-stack, or developer roles
- Working student, Werkstudent, student assistant, internship, junior, or flexible part-time roles
- Darmstadt, Frankfurt/Rhine-Main, Germany, or genuinely remote within Germany
- English-friendly roles are preferred; do not require fluent German unless the listing clearly says English is accepted

Use web search and return only real, specific job listing URLs from employers or reputable ATS pages. Exclude search-result pages, job-board landing pages, duplicates, expired-looking listings, senior/full-time-only roles, and unrelated roles.
Do not score or rank jobs. Do not compare the jobs with a CV. Return a short evidence-based why_good note only. If the posting date is unknown, return an empty string. Never invent a date, URL, company, or job description.`;

function normalizeJob(job: JobInput): JobInput {
  const jobId = String(job.job_id || job.job_url || "").trim();
  return {
    job_id: jobId,
    source: "Codex web search",
    company: String(job.company || "").trim(),
    role: String(job.role || "").trim(),
    location: String(job.location || "").trim(),
    job_url: String(job.job_url || "").trim(),
    posted_date: String(job.posted_date || "").trim(),
    job_description: String(job.job_description || "").trim().slice(0, 6000),
    why_good: String(job.why_good || "").trim().slice(0, 1000),
    match_score: undefined,
    priority: ""
  };
}

export async function POST() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 120_000, maxRetries: 1 });
    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      tools: [{ type: "web_search_preview" }],
      tool_choice: { type: "web_search_preview" },
      input: [{ role: "system", content: [{ type: "input_text", text: systemPrompt }] }],
      text: { format: { type: "json_schema", name: "cvpilot_job_discovery", schema: discoverySchema } }
    });

    const parsed = JSON.parse(response.output_text || "{}") as { jobs?: JobInput[] };
    const candidates = Array.isArray(parsed.jobs) ? parsed.jobs.map(normalizeJob).filter((job) => job.job_id && job.job_url) : [];
    const imported = [];
    for (const job of candidates.slice(0, 20)) imported.push(await upsertJob(job));

    return NextResponse.json({ source: "codex", discovered: candidates.length, imported: imported.length, jobs: imported });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Codex discovery failed.";
    console.error("[codex-discovery]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
