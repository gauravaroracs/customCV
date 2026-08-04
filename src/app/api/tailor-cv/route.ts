import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildTailorCvPrompt, TAILOR_CV_MODEL } from "@/lib/tailorCvPrompt";
import { ResumeData, TailorRequest, TailorResponse } from "@/types/resume";

type TailoredCvWire = Omit<ResumeData, "skills"> & {
  skills: Array<{
    groupName: string;
    items: string[];
  }>;
};

type TailorWireResponse = Omit<TailorResponse, "tailoredCV"> & {
  tailoredCV: TailoredCvWire;
  matchScore: number;
};

function clampScore(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

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

    const prompt = buildTailorCvPrompt(body.masterCV, body.jobDescription);
    const cvLength = prompt.user.split("Job description:")[0]?.length ?? 0;

    console.log("\n" + "═".repeat(60));
    console.log(`[tailor-cv] ▶ REQUEST  ${new Date().toISOString()}`);
    console.log(`  model          : ${TAILOR_CV_MODEL}`);
    console.log(`  jd length      : ${body.jobDescription.length} chars`);
    console.log(`  cv prompt part : ${cvLength} chars  (photo stripped)`);
    console.log(`  system prompt  : ~${prompt.tokenEstimate.system} tokens`);
    console.log(`  user message   : ~${prompt.tokenEstimate.user} tokens`);
    console.log(`  TOTAL est.     : ~${prompt.tokenEstimate.total} tokens`);
    console.log(`  experience rows: ${body.masterCV.experience.length}`);
    console.log(`  project rows   : ${body.masterCV.projects.length}`);
    console.log("─".repeat(60));

    const t0 = Date.now();
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 1,
      timeout: 120000
    });

    const response = await openai.chat.completions.create({
      model: TAILOR_CV_MODEL,
      reasoning_effort: "low",
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
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
                required: ["personal", "profile", "skills", "languages", "education", "awards", "experience", "projects"],
                properties: {
                  personal: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "email", "phone", "location", "linkedin", "website", "github", "photoUrl"],
                    properties: {
                      name: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      location: { type: "string" },
                      linkedin: { type: "string" },
                      website: { type: "string" },
                      github: { type: "string" },
                      photoUrl: { type: "string" }
                    }
                  },
                  profile: { type: "string" },
                  skills: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["groupName", "items"],
                      properties: {
                        groupName: { type: "string" },
                        items: {
                          type: "array",
                          items: { type: "string" }
                        }
                      }
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
                  awards: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["title", "event", "organizer", "date", "description"],
                      properties: {
                        title: { type: "string" },
                        event: { type: "string" },
                        organizer: { type: "string" },
                        date: { type: "string" },
                        description: { type: "string" }
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
              matchScore: { type: "number", minimum: 0, maximum: 100 },
              matchBreakdown: {
                type: "object",
                additionalProperties: false,
                required: ["keywords", "experience", "skills", "overall"],
                properties: {
                  keywords: { type: "number", minimum: 0, maximum: 100 },
                  experience: { type: "number", minimum: 0, maximum: 100 },
                  skills: { type: "number", minimum: 0, maximum: 100 },
                  overall: { type: "number", minimum: 0, maximum: 100 }
                }
              }
            }
          }
        }
      }
    });

    const rawOutput = response.choices[0]?.message?.content ?? "{}";
    const wireParsed = JSON.parse(rawOutput) as TailorWireResponse;
    const parsed: TailorResponse = {
      ...wireParsed,
      matchScore: clampScore(wireParsed.matchScore),
      matchBreakdown: wireParsed.matchBreakdown,
      prompt,
      rawResponse: rawOutput,
      model: TAILOR_CV_MODEL,
      tailoredCV: {
        ...wireParsed.tailoredCV,
        skills: Object.fromEntries(
          (wireParsed.tailoredCV.skills ?? [])
            .filter((group) => group.groupName.trim())
            .map((group) => [group.groupName.trim(), group.items])
        )
      }
    };

    const elapsed = Date.now() - t0;
    console.log(`[tailor-cv] ✓ RESPONSE  ${elapsed}ms`);
    console.log(`  score          : ${parsed.matchScore ?? 0}`);
    console.log(`  changes        : ${parsed.changes?.length ?? 0}`);
    console.log(`  warnings       : ${parsed.warnings?.length ?? 0}`);
    console.log(`  exp rows out   : ${parsed.tailoredCV?.experience?.length ?? "n/a"}`);
    console.log(`  proj rows out  : ${parsed.tailoredCV?.projects?.length ?? "n/a"}`);
    console.log(`  output length  : ${rawOutput.length} chars`);
    console.log("═".repeat(60) + "\n");

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to tailor CV.";
    console.error(`[tailor-cv] ✗ ERROR: ${message}`);
    console.log("═".repeat(60) + "\n");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
