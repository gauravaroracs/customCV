import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ResumeData,
  ResumeSectionKey,
  RewriteRequest,
  RewriteResponse
} from "@/types/resume";

const OPENAI_MODEL = "gpt-4o-mini";

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

STRATEGY — minimise your output:
1. Decide which sections need to change to fulfil the instruction.
2. If ONLY ONE section changes, set "section" to that section name and "newValue" to ONLY the new JSON value for that section (not the whole CV). This is the fast path — prefer it whenever possible.
3. If MULTIPLE sections must change (e.g. "make the whole CV more concise"), set "section" to "full" and "newValue" to the complete updated CV JSON as a string.

Section names: personal | profile | skills | languages | education | experience | projects | full

Rules:
- Never invent companies, dates, tools, numbers, degrees, grades, locations, or achievements.
- Keep all facts truthful.
- For bold/emphasis, use **double asterisks** inside string values ONLY when the user explicitly asks.
- Preserve the exact JSON structure of whichever section you return.
- "newValue" must always be a valid JSON string (stringify the value before returning it).`;

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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.responses.create({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                cv: body.fullResume,
                instruction: body.instruction,
                jobDescriptionContext: body.jobDescription ?? ""
              })
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "cv_patch_response",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["section", "newValue", "summaryOfChanges", "warnings"],
            properties: {
              section: {
                type: "string",
                description:
                  "The section name that was changed (personal|profile|skills|languages|education|experience|projects), or 'full' if multiple sections changed."
              },
              newValue: {
                type: "string",
                description:
                  "JSON-stringified new value: just the section's value for single-section edits, or the entire updated resume JSON for 'full'."
              },
              summaryOfChanges: {
                type: "array",
                items: { type: "string" }
              },
              warnings: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        }
      }
    });

    const rawText = completion.output_text;
    if (!rawText) {
      return NextResponse.json(
        { error: "OpenAI returned an empty response." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(rawText) as {
      section: SectionName;
      newValue: string;
      summaryOfChanges: string[];
      warnings: string[];
    };

    // Validate section name to be safe
    const section = SECTION_NAMES.includes(parsed.section as SectionName)
      ? parsed.section
      : "full";

    const patchedValue = JSON.parse(parsed.newValue);

    // Merge: if AI only returned one section, splice it in; otherwise treat as full resume
    const updatedResume: ResumeData =
      section === "full"
        ? (patchedValue as ResumeData)
        : { ...body.fullResume, [section]: patchedValue };

    const response: RewriteResponse = {
      updatedResume,
      changedSections: getChangedSections(body.fullResume, updatedResume),
      summaryOfChanges: parsed.summaryOfChanges,
      warnings: parsed.warnings
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to rewrite the selected section.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
