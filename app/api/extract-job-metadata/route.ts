import { NextResponse } from "next/server";
import OpenAI from "openai";
import { JobMetadata } from "@/types/resume";

const systemPrompt =
  'Extract: company, role title, location. Return JSON only: {company, role, location}';

const emptyMetadata: JobMetadata = {
  company: "",
  role: "",
  location: ""
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { text?: string };

    if (!body.text?.trim()) {
      return NextResponse.json(emptyMetadata);
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: body.text.slice(0, 500) }]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "job_metadata",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["company", "role", "location"],
            properties: {
              company: { type: "string" },
              role: { type: "string" },
              location: { type: "string" }
            }
          }
        }
      }
    });

    return NextResponse.json(JSON.parse(response.output_text || "{}"));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extract job metadata.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
