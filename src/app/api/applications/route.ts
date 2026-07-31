import { NextResponse } from "next/server";
import { createOrGetApplication, getApplicationByJob } from "@/lib/jobStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const jobId = new URL(request.url).searchParams.get("job_id");
    if (!jobId) return NextResponse.json({ error: "job_id is required." }, { status: 400 });
    const application = await getApplicationByJob(jobId);
    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load application.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { job_id?: string };
    if (!body.job_id) return NextResponse.json({ error: "job_id is required." }, { status: 400 });
    const application = await createOrGetApplication(body.job_id);
    return application
      ? NextResponse.json({ application }, { status: 201 })
      : NextResponse.json({ error: "Job not found." }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create application.";
    const status = /archived|inactive/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
