import { NextResponse } from "next/server";
import { listJobs } from "@/lib/jobStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const includeArchived = new URL(request.url).searchParams.get("include_archived") === "1";
    return NextResponse.json({ jobs: await listJobs(includeArchived) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load jobs.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
