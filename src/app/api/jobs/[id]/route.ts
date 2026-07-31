import { NextResponse } from "next/server";
import { getJob, updateJobState, type JobLifecycleStatus, type JobRecord } from "@/lib/jobStore";

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
    const body = await request.json() as {
      review_status?: JobRecord["review_status"];
      lifecycle_status?: JobLifecycleStatus;
      inactive_reason?: string;
      archived?: boolean;
    };

    const patch: {
      review_status?: JobRecord["review_status"];
      lifecycle_status?: JobLifecycleStatus;
      inactive_reason?: string;
      archived?: boolean;
    } = {};

    if (body.review_status !== undefined) {
      if (!["new", "saved", "skipped", "prepare_requested"].includes(body.review_status)) {
        return NextResponse.json({ error: "Invalid review_status." }, { status: 400 });
      }
      patch.review_status = body.review_status;
    }

    if (body.lifecycle_status !== undefined) {
      if (!["active", "inactive"].includes(body.lifecycle_status)) {
        return NextResponse.json({ error: "Invalid lifecycle_status." }, { status: 400 });
      }
      patch.lifecycle_status = body.lifecycle_status;
    }

    if (body.inactive_reason !== undefined) {
      patch.inactive_reason = body.inactive_reason;
    }

    if (typeof body.archived === "boolean") {
      patch.archived = body.archived;
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "At least one valid job field is required." }, { status: 400 });
    }

    const job = await updateJobState(params.id, patch);
    return job ? NextResponse.json({ job }) : NextResponse.json({ error: "Job not found." }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update job.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
