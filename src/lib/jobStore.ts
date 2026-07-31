import { Pool, type QueryResultRow } from "pg";

export const APPLICATION_STATUSES = [
  "new",
  "saved",
  "preparing",
  "ready_for_review",
  "applied",
  "interview",
  "rejected",
  "withdrawn"
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type JobInput = {
  job_id: string;
  source?: string;
  company?: string;
  role?: string;
  location?: string;
  job_url?: string;
  posted_date?: string;
  job_description?: string;
  language_requirement?: string;
  german_required?: string | boolean;
  english_friendly?: string | boolean;
  company_type?: string;
  tech_stack?: string | string[];
  match_score?: number | string;
  priority?: string;
  why_good?: string;
  risk?: string;
  recommended_action?: string;
  notes?: string;
};

export type JobRecord = JobInput & {
  id: string;
  review_status: "new" | "saved" | "skipped" | "prepare_requested";
  application_status: ApplicationStatus | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationRecord = {
  id: string;
  job_id: string;
  status: ApplicationStatus;
  preparation_status: "idle" | "running" | "ready" | "failed";
  current_step: string | null;
  preparation_error: string | null;
  tailored_cv: unknown | null;
  cover_letter: string | null;
  match_score: number | null;
  match_breakdown: unknown | null;
  warnings: unknown;
  gap_analysis: unknown;
  notes: string;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
  job?: JobRecord;
};

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured. Start Postgres and add it to .env.local.");
  }

  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = getPool().query(`
      CREATE TABLE IF NOT EXISTS cvpilot_jobs (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL DEFAULT '',
        company TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        job_url TEXT NOT NULL DEFAULT '',
        posted_date TEXT NOT NULL DEFAULT '',
        job_description TEXT NOT NULL DEFAULT '',
        language_requirement TEXT NOT NULL DEFAULT '',
        german_required TEXT NOT NULL DEFAULT '',
        english_friendly TEXT NOT NULL DEFAULT '',
        company_type TEXT NOT NULL DEFAULT '',
        tech_stack TEXT NOT NULL DEFAULT '',
        match_score NUMERIC,
        priority TEXT NOT NULL DEFAULT '',
        why_good TEXT NOT NULL DEFAULT '',
        risk TEXT NOT NULL DEFAULT '',
        recommended_action TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        review_status TEXT NOT NULL DEFAULT 'new',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cvpilot_applications (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL UNIQUE REFERENCES cvpilot_jobs(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'new',
        preparation_status TEXT NOT NULL DEFAULT 'idle',
        current_step TEXT,
        preparation_error TEXT,
        tailored_cv JSONB,
        cover_letter TEXT,
        match_score NUMERIC,
        match_breakdown JSONB,
        warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
        gap_analysis JSONB NOT NULL DEFAULT '[]'::jsonb,
        notes TEXT NOT NULL DEFAULT '',
        follow_up_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cvpilot_application_events (
        id BIGSERIAL PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES cvpilot_applications(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS cvpilot_jobs_review_idx ON cvpilot_jobs (review_status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS cvpilot_applications_status_idx ON cvpilot_applications (status, updated_at DESC);
    `).then(() => undefined);
  }

  await schemaPromise;
}

function text(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  return value == null ? "" : String(value);
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowToJob(row: QueryResultRow): JobRecord {
  return row as JobRecord;
}

function rowToApplication(row: QueryResultRow): ApplicationRecord {
  return row as ApplicationRecord;
}

export async function upsertJob(input: JobInput) {
  if (!input.job_id?.trim()) throw new Error("job_id is required.");
  await ensureSchema();
  const p = getPool();
  const id = `job_${input.job_id.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100)}`;
  const result = await p.query(
    `INSERT INTO cvpilot_jobs (
      id, job_id, source, company, role, location, job_url, posted_date, job_description,
      language_requirement, german_required, english_friendly, company_type, tech_stack,
      match_score, priority, why_good, risk, recommended_action, notes, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
    ON CONFLICT (job_id) DO UPDATE SET
      source = COALESCE(NULLIF(EXCLUDED.source, ''), cvpilot_jobs.source),
      company = COALESCE(NULLIF(EXCLUDED.company, ''), cvpilot_jobs.company),
      role = COALESCE(NULLIF(EXCLUDED.role, ''), cvpilot_jobs.role),
      location = COALESCE(NULLIF(EXCLUDED.location, ''), cvpilot_jobs.location),
      job_url = COALESCE(NULLIF(EXCLUDED.job_url, ''), cvpilot_jobs.job_url),
      posted_date = COALESCE(NULLIF(EXCLUDED.posted_date, ''), cvpilot_jobs.posted_date),
      job_description = COALESCE(NULLIF(EXCLUDED.job_description, ''), cvpilot_jobs.job_description),
      language_requirement = COALESCE(NULLIF(EXCLUDED.language_requirement, ''), cvpilot_jobs.language_requirement),
      german_required = COALESCE(NULLIF(EXCLUDED.german_required, ''), cvpilot_jobs.german_required),
      english_friendly = COALESCE(NULLIF(EXCLUDED.english_friendly, ''), cvpilot_jobs.english_friendly),
      company_type = COALESCE(NULLIF(EXCLUDED.company_type, ''), cvpilot_jobs.company_type),
      tech_stack = COALESCE(NULLIF(EXCLUDED.tech_stack, ''), cvpilot_jobs.tech_stack),
      match_score = COALESCE(EXCLUDED.match_score, cvpilot_jobs.match_score),
      priority = COALESCE(NULLIF(EXCLUDED.priority, ''), cvpilot_jobs.priority),
      why_good = COALESCE(NULLIF(EXCLUDED.why_good, ''), cvpilot_jobs.why_good),
      risk = COALESCE(NULLIF(EXCLUDED.risk, ''), cvpilot_jobs.risk),
      recommended_action = COALESCE(NULLIF(EXCLUDED.recommended_action, ''), cvpilot_jobs.recommended_action),
      updated_at = NOW()
    RETURNING *`,
    [
      id, input.job_id.trim(), text(input.source), text(input.company), text(input.role),
      text(input.location), text(input.job_url), text(input.posted_date), text(input.job_description),
      text(input.language_requirement), text(input.german_required), text(input.english_friendly),
      text(input.company_type), text(input.tech_stack), numberOrNull(input.match_score), text(input.priority),
      text(input.why_good), text(input.risk), text(input.recommended_action), text(input.notes)
    ]
  );
  return rowToJob(result.rows[0]);
}

export async function listJobs() {
  await ensureSchema();
  const result = await getPool().query(`
    SELECT j.*, a.status AS application_status
    FROM cvpilot_jobs j
    LEFT JOIN cvpilot_applications a ON a.job_id = j.id
    ORDER BY
      CASE WHEN j.review_status = 'new' THEN 0 WHEN j.review_status = 'saved' THEN 1 ELSE 2 END,
      COALESCE(j.match_score, 0) DESC, j.updated_at DESC
    LIMIT 200
  `);
  return result.rows.map(rowToJob);
}

export async function getJob(id: string) {
  await ensureSchema();
  const result = await getPool().query("SELECT * FROM cvpilot_jobs WHERE id = $1 OR job_id = $1 LIMIT 1", [id]);
  return result.rows[0] ? rowToJob(result.rows[0]) : null;
}

export async function updateJobReview(id: string, status: JobRecord["review_status"]) {
  await ensureSchema();
  const result = await getPool().query(
    "UPDATE cvpilot_jobs SET review_status = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
    [id, status]
  );
  return result.rows[0] ? rowToJob(result.rows[0]) : null;
}

export async function createOrGetApplication(jobId: string) {
  await ensureSchema();
  const job = await getJob(jobId);
  if (!job) return null;
  const applicationId = `app_${crypto.randomUUID()}`;
  const result = await getPool().query(
    `INSERT INTO cvpilot_applications (id, job_id)
     VALUES ($1, $2)
     ON CONFLICT (job_id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [applicationId, job.id]
  );
  await getPool().query(
    "UPDATE cvpilot_jobs SET review_status = 'prepare_requested', updated_at = NOW() WHERE id = $1",
    [job.id]
  );
  return rowToApplication(result.rows[0]);
}

export async function getApplication(id: string) {
  await ensureSchema();
  const result = await getPool().query(
    `SELECT a.*, row_to_json(j) AS job
     FROM cvpilot_applications a
     JOIN cvpilot_jobs j ON j.id = a.job_id
     WHERE a.id = $1`,
    [id]
  );
  return result.rows[0] ? rowToApplication(result.rows[0]) : null;
}

export async function getApplicationByJob(jobId: string) {
  await ensureSchema();
  const result = await getPool().query(
    `SELECT a.*, row_to_json(j) AS job
     FROM cvpilot_applications a
     JOIN cvpilot_jobs j ON j.id = a.job_id
     WHERE a.job_id = $1 OR j.job_id = $1
     LIMIT 1`,
    [jobId]
  );
  return result.rows[0] ? rowToApplication(result.rows[0]) : null;
}

export async function updateApplication(id: string, patch: Partial<Pick<ApplicationRecord, "status" | "preparation_status" | "current_step" | "preparation_error" | "tailored_cv" | "cover_letter" | "match_score" | "match_breakdown" | "warnings" | "gap_analysis" | "notes" | "follow_up_date">>, eventNote?: string) {
  await ensureSchema();
  const fields: string[] = [];
  const values: unknown[] = [id];
  const valueKeys: string[] = [];
  const allowed = ["status", "preparation_status", "current_step", "preparation_error", "tailored_cv", "cover_letter", "match_score", "match_breakdown", "warnings", "gap_analysis", "notes", "follow_up_date"] as const;
  for (const key of allowed) {
    if (!(key in patch)) continue;
    values.push(patch[key]);
    valueKeys.push(key);
    const valueIndex = values.length;
    fields.push(`${key} = $${valueIndex}${["tailored_cv", "match_breakdown", "warnings", "gap_analysis"].includes(key) ? "::jsonb" : ""}`);
  }
  if (fields.length) fields.push("updated_at = NOW()");
  const result = await getPool().query(
    fields.length
      ? `UPDATE cvpilot_applications SET ${fields.join(", ")} WHERE id = $1 RETURNING *`
      : "SELECT * FROM cvpilot_applications WHERE id = $1",
    values.map((value, index) => index > 0 && ["tailored_cv", "match_breakdown", "warnings", "gap_analysis"].includes(valueKeys[index - 1] ?? "") && value !== null ? JSON.stringify(value) : value)
  );
  if (eventNote && patch.status) {
    await getPool().query(
      "INSERT INTO cvpilot_application_events (application_id, status, note) VALUES ($1, $2, $3)",
      [id, patch.status, eventNote]
    );
  }
  return result.rows[0] ? rowToApplication(result.rows[0]) : null;
}

export async function listApplicationEvents(id: string) {
  await ensureSchema();
  const result = await getPool().query(
    "SELECT id, status, note, created_at FROM cvpilot_application_events WHERE application_id = $1 ORDER BY created_at DESC",
    [id]
  );
  return result.rows;
}
