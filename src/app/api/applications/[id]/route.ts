import { NextResponse } from "next/server";
import { getApplication, listApplicationEvents, updateApplication, type ApplicationStatus } from "@/lib/jobStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const application = await getApplication(params.id);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    return NextResponse.json({ application, events: await listApplicationEvents(params.id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load application.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json() as {
      status?: ApplicationStatus;
      preparation_status?: "idle" | "running" | "ready" | "failed";
      current_step?: string | null;
      preparation_error?: string | null;
      tailored_cv?: unknown;
      cover_letter?: string | null;
      match_score?: number | null;
      match_breakdown?: unknown;
      warnings?: unknown;
      gap_analysis?: unknown;
      notes?: string;
      follow_up_date?: string | null;
      event_note?: string;
    };
    const application = await updateApplication(params.id, body, body.event_note);
    return application
      ? NextResponse.json({ application })
      : NextResponse.json({ error: "Application not found." }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
