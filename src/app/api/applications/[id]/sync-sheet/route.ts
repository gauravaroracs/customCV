import { NextResponse } from "next/server";
import { getApplication } from "@/lib/jobStore";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const webhookUrl = process.env.N8N_SHEET_SYNC_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "N8N_SHEET_SYNC_WEBHOOK_URL is not configured." }, { status: 501 });
  }

  try {
    const application = await getApplication(params.id);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.N8N_WEBHOOK_SECRET ? { "x-cvpilot-webhook-secret": process.env.N8N_WEBHOOK_SECRET } : {})
      },
      body: JSON.stringify({ application })
    });
    if (!response.ok) return NextResponse.json({ error: `n8n sync failed with status ${response.status}.` }, { status: 502 });
    return NextResponse.json({ synced: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync application to Sheets.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
