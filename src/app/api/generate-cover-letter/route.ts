import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { CoverLetterRequest, CoverLetterResponse, ResumeData } from "@/types/resume";

const OPENAI_MODEL = "gpt-5.1-chat-latest";

const systemPrompt = `You are CVPilot's cover letter assistant.

You ALWAYS respond with a single JSON object (no markdown fences):
{
  "coverLetter": "A complete cover letter in plain text with paragraphs separated by blank lines.",
  "highlights": ["Short note about what you emphasized"],
  "warnings": ["Optional cautions if the input is thin or ambiguous"]
}

Rules:
1. Write one tailored cover letter, not bullet points.
2. Keep it honest. Do not invent employers, degrees, dates, or metrics.
3. Use the resume and job description to mirror relevant experience and keywords only where supported.
4. Use a professional, concise tone. Aim for 3 to 5 short paragraphs.
5. If company/role metadata is missing, use a generic but polished greeting like "Dear Hiring Manager".
6. Avoid markdown, headings, or signature blocks that rely on placeholders.
7. Keep the draft readable and under 350 words unless the user explicitly asks for more.

Return ONLY valid JSON matching the shape above.`;

function sanitizeResume(resume: ResumeData) {
  return {
    ...resume,
    personal: {
      ...resume.personal,
      photoUrl: ""
    }
  };
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const body = (await request.json()) as CoverLetterRequest;

    if (!body.resume || typeof body.resume !== "object") {
      return NextResponse.json({ error: "resume is required." }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
      timeout: 120_000
    });

    const userPayload = `Resume JSON (photo stripped):
${JSON.stringify(sanitizeResume(body.resume))}

Target role context:
${JSON.stringify(body.metadata ?? {})}

Job description:
${typeof body.jobDescription === "string" ? body.jobDescription : ""}

Existing draft for reference:
${typeof body.existingDraft === "string" ? body.existingDraft : ""}

Write a fresh tailored cover letter.`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload }
      ],
      response_format: { type: "json_object" }
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as CoverLetterResponse | { error?: string };

    if (!parsed || typeof parsed !== "object" || typeof (parsed as CoverLetterResponse).coverLetter !== "string") {
      return NextResponse.json({ error: "Model did not return a valid cover letter." }, { status: 502 });
    }

    return NextResponse.json({
      coverLetter: (parsed as CoverLetterResponse).coverLetter,
      highlights: Array.isArray((parsed as CoverLetterResponse).highlights)
        ? (parsed as CoverLetterResponse).highlights
        : [],
      warnings: Array.isArray((parsed as CoverLetterResponse).warnings)
        ? (parsed as CoverLetterResponse).warnings
        : []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cover letter generation failed.";
    console.error("[generate-cover-letter]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
