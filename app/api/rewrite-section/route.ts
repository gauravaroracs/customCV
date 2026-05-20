import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ResumeData,
  ResumeSectionKey,
  RewriteRequest,
  RewriteResponse
} from "@/types/resume";

const OPENAI_MODEL = "gpt-5.1-chat-latest";

// Section names the AI may return. "full" triggers fallback to whole-resume mode.
const SECTION_NAMES = [
  "personal",
  "profile",
  "skills",
  "languages",
  "education",
  "experience",
  "projects",
  "full"
] as const;

type SectionName = (typeof SECTION_NAMES)[number];

const systemPrompt = `You are an expert CV editor for German and international tech jobs.

You receive a CV as JSON, a user instruction, and optionally a job description context.

Return a JSON object with these fields:
{
  "section": "<section name>",
  "newValue": <the actual new value — NOT a string, the real JSON value>,
  "summaryOfChanges": ["..."],
  "warnings": ["..."]
}

CRITICAL: "newValue" must be the ACTUAL JSON value (array, object, or string) — NOT a JSON-encoded string.
- If section = "experience": newValue = [ { role, company, location, dates, bullets: [...] }, ... ]
- If section = "projects":   newValue = [ { name, tech, bullets: [...] }, ... ]
- If section = "skills":     newValue = { "Programming": [...], "Data": [...], ... }
- If section = "profile":    newValue = "the profile text as a plain string"
- If section = "personal":   newValue = { name, email, phone, location, linkedin, website, github, photoUrl }
- If section = "languages":  newValue = [ { name, level }, ... ]
- If section = "education":  newValue = [ { degree, institution, location, dates, details: [...] }, ... ]
- If section = "full":       newValue = the complete CV object

STRATEGY:
1. If only ONE section changes → set section to that name, newValue = only that section's new value.
2. If MULTIPLE sections must change → set section = "full", newValue = the complete updated CV object.

Section names: personal | profile | skills | languages | education | experience | projects | full

STRUCTURAL EDITS — how to handle removals and reductions:
- "Remove the X role/company entry" → section = "experience", newValue = the experience array WITHOUT that entry.
- "Reduce X to N bullets" → section = "experience" (or "projects"), keep only the N most impactful bullets for that entry.
- "Remove bullet: [text]" → section = "experience", remove that specific bullet from the matching entry.
- "Remove the X project" → section = "projects", newValue = the projects array WITHOUT that project.
- "Remove [skill] from skills" → section = "skills", newValue = skills object with that item removed.
- "Remove all education details" → section = "education", newValue = education array with empty details arrays.
- "Merge bullets X and Y" → combine them into one concise bullet, keep the combined one.

Matching by name: Match role/company/location case-insensitively (e.g. "frontend developer", "software intern", "example university").

Rules:
- Never invent companies, dates, tools, numbers, degrees, or achievements.
- Keep all facts truthful.
- Apply the user's requested wording exactly for factual labels like language levels.
- If the user includes reasoning or critique, use it to decide the edit but do not insert that reasoning into the CV.
- For skill cleanup, remove duplicates across groups and prefer one concise combined group over repeated sections.
- If the user says "Replace X with:" and provides a block, preserve that block's intended content exactly.
- Use **double asterisks** for bold ONLY when the user explicitly asks.
- When reducing bullets: keep the most impactful/metric-heavy ones.
- When removing an array item: return the FULL updated array with that item gone.`;

function getChangedSections(prev: ResumeData, next: ResumeData) {
  return (Object.keys(prev) as ResumeSectionKey[]).filter(
    (key) => JSON.stringify(prev[key]) !== JSON.stringify(next[key])
  );
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as RewriteRequest;

    if (!body.instruction?.trim()) {
      return NextResponse.json({ error: "Instruction is required." }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 3,
      timeout: 30000
    });

    const userPayload = JSON.stringify({
      cv: body.fullResume,
      instruction: body.instruction,
      jobDescriptionContext: body.jobDescription ?? ""
    });
    const systemTokenEst = Math.round(systemPrompt.length / 4);
    const userTokenEst = Math.round(userPayload.length / 4);

    console.log("\n" + "═".repeat(60));
    console.log(`[rewrite-section] ▶ REQUEST  ${new Date().toISOString()}`);
    console.log(`  model          : ${OPENAI_MODEL}`);
    console.log(`  instruction    : "${body.instruction.slice(0, 120)}"`);
    console.log(`  system prompt  : ~${systemTokenEst} tokens`);
    console.log(`  user payload   : ~${userTokenEst} tokens`);
    console.log(`  TOTAL est.     : ~${systemTokenEst + userTokenEst} tokens`);
    console.log("─".repeat(60));

    const t0 = Date.now();

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload }
      ],
      // Use json_object so newValue can be any JSON type (array/object/string)
      // without double-serialization issues.
      response_format: { type: "json_object" }
    });

    const rawText = completion.choices[0]?.message?.content ?? "";
    if (!rawText) {
      return NextResponse.json(
        { error: "OpenAI returned an empty response." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(rawText) as {
      section: SectionName;
      newValue: unknown; // native JSON value — no JSON.parse needed
      summaryOfChanges: string[];
      warnings: string[];
    };

    // Validate section name
    const section = SECTION_NAMES.includes(parsed.section as SectionName)
      ? parsed.section
      : "full";

    // newValue is already the parsed JS value — no JSON.parse() needed
    const patchedValue = parsed.newValue;

    // Merge: if single section, splice it in; if full, replace entirely
    const updatedResume: ResumeData =
      section === "full"
        ? (patchedValue as ResumeData)
        : { ...body.fullResume, [section]: patchedValue };

    const response: RewriteResponse = {
      updatedResume,
      changedSections: getChangedSections(body.fullResume, updatedResume),
      summaryOfChanges: Array.isArray(parsed.summaryOfChanges) ? parsed.summaryOfChanges : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
    };

    const elapsed = Date.now() - t0;
    console.log(`[rewrite-section] ✓ RESPONSE  ${elapsed}ms`);
    console.log(`  section changed: ${section}`);
    console.log(`  summary        : ${response.summaryOfChanges[0] ?? "(none)"}`);
    console.log(`  output length  : ${rawText.length} chars`);
    console.log("═".repeat(60) + "\n");

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to rewrite the selected section.";
    console.error(`[rewrite-section] ✗ ERROR: ${message}`);
    console.log("═".repeat(60) + "\n");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
