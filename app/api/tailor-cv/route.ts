import { NextResponse } from "next/server";
import OpenAI from "openai";
import { TailorRequest, TailorResponse } from "@/types/resume";

const OPENAI_MODEL = "gpt-5.1-chat-latest";

const systemPrompt = `You are a professional CV editor and curator. You receive a MASTER CV (comprehensive, may be long) and a job description. Your job is to SELECT the best-fitting subset and rewrite it to create the highest-scoring, A4-fitting tailored CV. Return ONLY a raw JSON object, no markdown, no explanation, no code fences.

CURATION RULES — A4 PAGE FIT (critical, non-negotiable):
C1. Experience: Include at most 4 job entries. If master has more, drop the least relevant ones to this JD. Keep all entries in reverse chronological order.
C2. Bullets per role: Each job entry must have exactly 3–5 bullets. If master has more, keep only the 3–5 most JD-relevant. If master has fewer, keep them all as-is.
C3. Projects: Include at most 2 projects. Pick the 2 most relevant to the JD. Each project should have max 2 bullets.
C4. Skills: Each skill group (Programming, Data, Tools, Soft Skills) should have at most 6 items. Drop the least JD-relevant from the end.
C5. Profile: Max 3 sentences (not 4). Keep it tight and punchy.
C6. Education: Include at most 2 entries. Drop details arrays unless they are directly relevant (e.g. thesis topic, GPA if strong). Keep details arrays short (max 2 items).

CONTENT RULES:
1. Never invent skills, experience, or projects not in the master CV.
2. Profile: rewrite to mirror JD's exact keyword phrases where the candidate has genuine experience. Confident present tense. No 'currently learning' or 'upskilling' framing.
3. Skills: reorder so JD's explicitly required skills appear first within each group. Do not add skills not in masterCV.
4. Experience bullets: rewrite selected bullets using the JD's exact terminology. Keep all metrics (numbers, percentages, QPS) intact. Only keep bullets that are relevant to this JD.
5. Projects: reorder so most JD-relevant project appears first. Rewrite bullets to emphasize what the JD cares about.
6. Also return a matchScore (0–100) and matchBreakdown with scores for keywords match, experience relevance, and skills coverage. Be honest — deduct points for hard requirements the candidate cannot meet.
7. Auto-bold: In the profile paragraph and all experience/project bullets, wrap crucial terms in **double asterisks**. Bold: (a) exact JD skill/technology matches, (b) measurable impact metrics, (c) the single most important role-defining phrase per bullet. Limit to 2–4 bold spans per bullet.
8. Return this exact structure:
{
  tailoredCV: { ...same schema as masterCV },
  changes: ['string describing each change made, including what was dropped and why'],
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

    // Strip the base64 photo before sending to the AI — it's re-attached after the response
    // and can be 15k–25k tokens on its own, which causes TPM 429 errors.
    const cvForAI = {
      ...body.masterCV,
      personal: { ...body.masterCV.personal, photoUrl: "" }
    };

    const userMessage = `masterCV: ${JSON.stringify(cvForAI)}\njobDescription: ${body.jobDescription}`;
    const systemTokenEst = Math.round(systemPrompt.length / 4);
    const userTokenEst = Math.round(userMessage.length / 4);
    const totalTokenEst = systemTokenEst + userTokenEst;

    console.log("\n" + "═".repeat(60));
    console.log(`[tailor-cv] ▶ REQUEST  ${new Date().toISOString()}`);
    console.log(`  model          : ${OPENAI_MODEL}`);
    console.log(`  jd length      : ${body.jobDescription.length} chars`);
    console.log(`  cv length      : ${JSON.stringify(cvForAI).length} chars  (photo stripped)`);
    console.log(`  system prompt  : ~${systemTokenEst} tokens`);
    console.log(`  user message   : ~${userTokenEst} tokens`);
    console.log(`  TOTAL est.     : ~${totalTokenEst} tokens`);
    console.log(`  experience rows: ${body.masterCV.experience.length}`);
    console.log(`  project rows   : ${body.masterCV.projects.length}`);
    console.log("─".repeat(60));

    const t0 = Date.now();
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 3
    });

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
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
                required: ["personal", "profile", "skills", "languages", "education", "experience", "projects"],
                properties: {
                  personal: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "email", "phone", "location", "linkedin", "website", "photoUrl"],
                    properties: {
                      name: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      location: { type: "string" },
                      linkedin: { type: "string" },
                      website: { type: "string" },
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

    const rawOutput = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(rawOutput) as TailorResponse;

    const elapsed = Date.now() - t0;
    console.log(`[tailor-cv] ✓ RESPONSE  ${elapsed}ms`);
    console.log(`  matchScore     : ${parsed.matchScore ?? "n/a"}`);
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
