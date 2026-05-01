import { NextResponse } from "next/server";
import OpenAI from "openai";
import { TailorRequest, TailorResponse } from "@/types/resume";

const systemPrompt = `You are a professional CV editor. You receive a master CV as JSON and a job description. Return ONLY a raw JSON object, no markdown, no explanation, no code fences.

Rules (strict):
1. Never invent skills, experience, or projects not in the master CV.
2. Profile: rewrite to mirror JD's exact keyword phrases where the candidate has genuine experience. Max 4 lines. Confident present tense. No 'currently learning' or 'upskilling' framing.
3. Skills: reorder so JD's explicitly required skills appear first within each group. Do not add skills not in masterCV.
4. Experience bullets: rewrite bullets that relate to a JD keyword using the JD's exact terminology. Keep all metrics (numbers, percentages, QPS) intact. Deprioritize bullets irrelevant to this role by moving them last.
5. Projects: reorder so most JD-relevant project appears first. Rewrite bullets to emphasize what the JD cares about.
6. Also return a matchScore (0-100) and matchBreakdown with scores for keywords match, experience relevance, and skills coverage. Be honest — if German B2 is required and candidate is A2, deduct points. Score based on how likely this CV is to be shortlisted.
7. Return this exact structure:
{
  tailoredCV: { ...same schema as masterCV },
  changes: ['string describing each change made'],
  warnings: ['any hard requirements in JD the candidate likely cannot meet']
}`;

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as TailorRequest;

    if (!body.jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description is required." }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.responses.create({
      model: "gpt-4o",
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
              text: `masterCV: ${JSON.stringify(body.masterCV)}\njobDescription: ${body.jobDescription}`
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "tailored_cv_response",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["tailoredCV", "changes", "warnings", "matchScore", "matchBreakdown"],
            properties: {
              tailoredCV: {
                type: "object",
                additionalProperties: false,
                required: ["personal", "profile", "skills", "languages", "education", "experience", "projects"],
                properties: {
                  personal: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "email", "phone", "location", "linkedin", "photoUrl"],
                    properties: {
                      name: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      location: { type: "string" },
                      linkedin: { type: "string" },
                      photoUrl: { type: "string" }
                    }
                  },
                  profile: { type: "string" },
                  skills: {
                    type: "object",
                    additionalProperties: false,
                    required: ["Programming", "Data", "Tools", "Soft Skills"],
                    properties: {
                      Programming: { type: "array", items: { type: "string" } },
                      Data: { type: "array", items: { type: "string" } },
                      Tools: { type: "array", items: { type: "string" } },
                      "Soft Skills": { type: "array", items: { type: "string" } }
                    }
                  },
                  languages: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["name", "level"],
                      properties: {
                        name: { type: "string" },
                        level: { type: "string" }
                      }
                    }
                  },
                  education: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["degree", "institution", "location", "dates", "details"],
                      properties: {
                        degree: { type: "string" },
                        institution: { type: "string" },
                        location: { type: "string" },
                        dates: { type: "string" },
                        details: { type: "array", items: { type: "string" } }
                      }
                    }
                  },
                  experience: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["role", "company", "location", "dates", "bullets"],
                      properties: {
                        role: { type: "string" },
                        company: { type: "string" },
                        location: { type: "string" },
                        dates: { type: "string" },
                        bullets: { type: "array", items: { type: "string" } }
                      }
                    }
                  },
                  projects: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["name", "tech", "bullets"],
                      properties: {
                        name: { type: "string" },
                        tech: { type: "string" },
                        bullets: { type: "array", items: { type: "string" } }
                      }
                    }
                  }
                }
              },
              changes: { type: "array", items: { type: "string" } },
              warnings: { type: "array", items: { type: "string" } },
              matchScore: { type: "number" },
              matchBreakdown: {
                type: "object",
                additionalProperties: false,
                required: ["keywords", "experience", "skills", "overall"],
                properties: {
                  keywords: { type: "number" },
                  experience: { type: "number" },
                  skills: { type: "number" },
                  overall: { type: "number" }
                }
              }
            }
          }
        }
      }
    });

    const parsed = JSON.parse(response.output_text || "{}") as TailorResponse;
    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to tailor CV.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
