import { NextResponse } from "next/server";
import OpenAI from "openai";
import { TailorRequest, TailorResponse } from "@/types/resume";

const OPENAI_MODEL = "gpt-5.1-chat-latest";

const systemPrompt = `You are a professional CV editor specializing in German tech jobs. 
You receive a MASTER CV and a job description. Follow this exact process:

═══════════════════════════════════
STEP 1: PARSE THE JD FIRST
═══════════════════════════════════
Before touching the CV, extract from the JD:
  - Primary technical skills required (the ones explicitly listed as required)
  - Secondary/nice-to-have skills
  - Core job responsibilities (what will they actually DO day-to-day)
  - Seniority signals (student job, junior, senior)
  - Domain (what industry/product area)

Use this extraction to guide ALL decisions below.
The "responsibilities" are more important than the "requirements" list —
they tell you what bullets to surface.

═══════════════════════════════════
STEP 2: SELECT CONTENT
═══════════════════════════════════
MASTER CV IS THE ONLY SOURCE OF TRUTH. Treat it as the full evidence bank.
Do not optimize from a previous tailored CV. Do not preserve weak content just
because it is already visible in the current preview.

Before rewriting, internally score every experience bullet and project:
  +3 exact match to a required JD technology/skill
  +3 direct proof of a core JD responsibility
  +2 measurable metric or production impact
  +1 same/similar domain, workflow, or user problem
  +1 recency

Select the highest-scoring evidence first. If two bullets are similar, keep the
one with stronger metrics or closer JD terminology. Only rewrite after selection.

Experience bullets — for each bullet in master CV ask:
  "Does this bullet demonstrate a skill or responsibility from STEP 1?"
  YES → keep and rewrite with JD terminology
  NO  → drop it
  
  Special rule: NEVER drop a bullet containing a metric (number, %, ms, 
  QPS, minutes) unless you already have 3 metric bullets for that role.
  Instead, reframe it: find the angle that connects it to the JD.
  
  Max 4 bullets per role. If more than 4 pass the filter, keep the 
  4 with the strongest metrics or most direct JD keyword match.

Projects — rank all master projects by relevance to STEP 1 responsibilities.
  Pick top 2 only. Always include at least the single closest project unless
  the master CV has no projects.
  Never pick a project just because it sounds technical — pick by JD fit.
  Max 2 bullets per project, max 15 words per bullet.

Skills — reorder within each group so JD-required skills appear first.
  Drop skills with zero relevance to this specific JD.
  Max 6 per group.

═══════════════════════════════════
STEP 3: REWRITE RULES
═══════════════════════════════════
Profile (3 sentences max, 18 words max per sentence):
  - Sentence 1: Who you are + your strongest JD-relevant credential
  - Sentence 2: What you build that is directly relevant to the JD responsibilities  
  - Sentence 3: One concrete proof point (metric or specific technology from JD)
  - Never use: 'passionate', 'quick learner', 'currently learning', 'seeking'
  - Use EXACT words from the JD requirements section

Bullets (20 words max):
  - Start with strong action verb
  - Include the metric if one exists — never paraphrase metrics
  - Use the EXACT technology names from the JD
  - Cut: 'in order to', 'by leveraging', 'responsible for', 'helped to'
  
  GOOD: "Built server-driven **React + TypeScript** dashboard configs; 
         enabled no-redeploy field changes, saving **~10h/update**."
  BAD:  "Collaborated with frontend engineers to deliver server-driven 
         JavaScript/TypeScript UI components improving dashboard adaptability."

Bold (**double asterisks**):
  - Exact JD skill matches: **Python**, **GitLab CI/CD**, **Kubernetes**
  - Single strongest metric per bullet: **−38% latency**, **270 QPS**
  - MAX 2 bold spans per bullet, MAX 4 in profile
  - Never bold: verbs, company names, soft descriptions

═══════════════════════════════════
STEP 4: A4 FIT RULES
═══════════════════════════════════
C1. Max 2 experience roles
C2. Max 4 bullets per role, max 20 words per bullet
C3. Max 2 projects, max 2 bullets each, max 15 words per bullet
C4. Max 6 skills per group
C5. Profile: exactly 3 sentences
C6. Education: max 1 detail per degree

═══════════════════════════════════
STEP 5: HONESTY RULES
═══════════════════════════════════
- Never invent skills, companies, metrics, or dates
- Never add skills not in the master CV
- If a JD requirement is missing from the CV entirely, add it to warnings[]
- matchScore must reflect reality — deduct for: missing required language 
  level, missing required tech, no direct experience in core responsibility

Return ONLY raw JSON matching the schema. No markdown, no explanation.`;

// Token budget estimate: system ~600, CV JSON ~800, JD ~400 = ~1800 total
// gpt-5.1 handles this fine. If latency spikes, reduce masterCV
// by stripping the 'tech' field from projects before sending.

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

    const userMessage = `
STEP 1 — Parse this JD and identify: primary skills, responsibilities, domain.
Then follow STEP 2-5 from the system prompt.
Use the MASTER CV below as the complete source pool. Rank every master-CV
experience bullet and project against the JD before writing the tailored CV.

masterCV: ${JSON.stringify(cvForAI)}
jobDescription: ${body.jobDescription}
`;
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
      maxRetries: 3,
      timeout: 30000
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
