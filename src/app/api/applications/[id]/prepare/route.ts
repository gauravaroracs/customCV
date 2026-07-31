import { NextResponse } from "next/server";
import { getApplication, updateApplication } from "@/lib/jobStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const application = await getApplication(params.id);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    if (application.job?.archived_at) {
      return NextResponse.json({ error: "Archived jobs cannot be prepared." }, { status: 409 });
    }
    if (application.job?.lifecycle_status && application.job.lifecycle_status !== "active") {
      return NextResponse.json({ error: "Inactive jobs cannot be prepared." }, { status: 409 });
    }
    const updated = await updateApplication(params.id, {
      status: "preparing",
      preparation_status: "running",
      current_step: "queued",
      preparation_error: null
    }, "Preparation started");
    return NextResponse.json({ application: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start preparation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
