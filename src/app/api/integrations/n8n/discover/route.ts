import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const webhookUrl = process.env.N8N_DISCOVERY_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "N8N_DISCOVERY_WEBHOOK_URL is not configured." }, { status: 501 });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.N8N_WEBHOOK_SECRET ? { "x-cvpilot-webhook-secret": process.env.N8N_WEBHOOK_SECRET } : {})
      },
      body: JSON.stringify({ source: "cvpilot", requested_at: new Date().toISOString() }),
      cache: "no-store"
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text || `n8n returned ${response.status}.`);
    return NextResponse.json({ source: "n8n", message: "n8n discovery started.", detail: text.slice(0, 500) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start n8n discovery.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
