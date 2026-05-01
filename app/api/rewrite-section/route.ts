import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ResumeData,
  ResumeSectionKey,
  RewriteRequest,
  RewriteResponse
} from "@/types/resume";

const OPENAI_MODEL = "gpt-5.1-chat-latest";

const systemPrompt =
  "You are an expert CV editor for German and international tech jobs. You receive the full resume JSON, an optional focused section key, a user instruction, and optionally a job description. Apply the instruction anywhere it is relevant in the resume, not only inside the focused section. Keep all facts truthful. Do not invent companies, dates, tools, numbers, degrees, grades, locations, or achievements. You may improve wording, structure, clarity, concision, ATS alignment, keyword relevance, and formatting emphasis. If the user explicitly asks for emphasis or bold text, represent only that emphasis with Markdown-style **double asterisks** inside string values. Do not introduce any other markup. Preserve the JSON structure and return the fully updated resume JSON. Return valid JSON only.";

function getChangedSections(previousResume: ResumeData, nextResume: ResumeData) {
  return (Object.keys(previousResume) as ResumeSectionKey[]).filter((key) => {
    return JSON.stringify(previousResume[key]) !== JSON.stringify(nextResume[key]);
  });
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
      return NextResponse.json(
        { error: "Instruction is required." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

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
              text: JSON.stringify(
                {
                  fullResume: body.fullResume,
                  focusedSectionKey: body.selectedSectionKey ?? null,
                  focusedSectionContent:
                    body.selectedSectionKey ? body.fullResume[body.selectedSectionKey] : null,
                  instruction: body.instruction,
                  jobDescription: body.jobDescription ?? ""
                },
                null,
                2
              )
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "resume_rewrite_response",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["updatedResume", "summaryOfChanges", "warnings"],
            properties: {
              updatedResume: {
                type: "string",
                description:
                  "A JSON-stringified version of the fully updated resume, preserving the original JSON structure."
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
      updatedResume: string;
      summaryOfChanges: string[];
      warnings: string[];
    };

    const updatedResume = JSON.parse(parsed.updatedResume) as ResumeData;

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
