import { NextResponse } from "next/server";
import { upsertJob, type JobInput } from "@/lib/jobStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const expected = process.env.N8N_WEBHOOK_SECRET;
  if (!expected) return false;
  return request.headers.get("x-cvpilot-webhook-secret") === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Invalid or missing n8n webhook secret." }, { status: 401 });
  }

  try {
    const payload = await request.json() as JobInput | { job?: JobInput; jobs?: JobInput[] };
    const jobs = Array.isArray((payload as { jobs?: JobInput[] }).jobs)
      ? (payload as { jobs: JobInput[] }).jobs
      : [(payload as { job?: JobInput }).job ?? payload as JobInput];

    const imported = [];
    for (const job of jobs) imported.push(await upsertJob(job));
    return NextResponse.json({ imported: imported.length, jobs: imported }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import jobs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
