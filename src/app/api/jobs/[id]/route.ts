import { NextResponse } from "next/server";
import { getJob, updateJobReview, type JobRecord } from "@/lib/jobStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const job = await getJob(params.id);
    return job ? NextResponse.json({ job }) : NextResponse.json({ error: "Job not found." }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load job.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json() as { review_status?: JobRecord["review_status"] };
    if (!body.review_status || !["new", "saved", "skipped", "prepare_requested"].includes(body.review_status)) {
      return NextResponse.json({ error: "A valid review_status is required." }, { status: 400 });
    }
    const job = await updateJobReview(params.id, body.review_status);
    return job ? NextResponse.json({ job }) : NextResponse.json({ error: "Job not found." }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update job.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
