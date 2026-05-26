import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ResumeData } from "@/types/resume";

const OPENAI_MODEL = "gpt-5.1-chat-latest";

const systemPrompt = `You are CVPilot's CV editor. The user chats to update their CV.

You ALWAYS respond with a single JSON object (no markdown fences):
{
  "assistantMessage": "Short friendly summary of what you changed or suggested.",
  "resume": { ...complete ResumeData object... }
}

Rules:
1. The "resume" object must follow the same structure as the input: personal, profile, skills, languages, education, awards, experience, projects.
2. personal.photoUrl must stay exactly as sent (usually empty string) — never put base64 images.
3. Never invent employers, degrees, dates, or metrics. Only rewrite, reorder, trim, or align wording to the user's request.
4. If a job description is provided, mirror relevant keywords honestly based on existing experience.
5. skills is an object whose keys are section titles (e.g. "Programming", "Frontend") and values are arrays of strings — preserve the user's grouping names unless they ask to rename.
6. Keep bullets concise; respect A4-friendly density when asked.
7. Use **double asterisks** for bold only when the user asks.

Return ONLY valid JSON matching the shape above.`;

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const body = (await request.json()) as {
      resume: ResumeData;
      jobDescription?: string;
      messages?: { role: "user" | "assistant"; content: string }[];
    };

    if (!body.resume || typeof body.resume !== "object") {
      return NextResponse.json({ error: "resume is required." }, { status: 400 });
    }

    const cvForAI = {
      ...body.resume,
      personal: { ...body.resume.personal, photoUrl: "" }
    };

    const transcript =
      Array.isArray(body.messages) && body.messages.length > 0
        ? body.messages
            .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
            .join("\n\n")
        : "(no prior messages)";

    const userPayload = `Current resume JSON (photo stripped):
${JSON.stringify(cvForAI)}

Job description context (may be empty):
${typeof body.jobDescription === "string" ? body.jobDescription : ""}

Conversation so far:
${transcript}

Apply the latest USER request from the conversation. Return assistantMessage + full updated resume JSON.`;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
      timeout: 120_000
    });

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload }
      ],
      response_format: { type: "json_object" }
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      assistantMessage?: string;
      resume?: ResumeData;
      error?: string;
    };

    if (!parsed.resume || typeof parsed.resume !== "object") {
      return NextResponse.json({ error: "Model did not return a valid resume." }, { status: 502 });
    }

    return NextResponse.json({
      assistantMessage:
        typeof parsed.assistantMessage === "string"
          ? parsed.assistantMessage
          : "Updated your CV JSON.",
      resume: parsed.resume
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CV chat failed.";
    console.error("[cv-chat]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
