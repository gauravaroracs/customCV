import { NextResponse } from "next/server";
import OpenAI from "openai";
import { TailorRequest, TailorResponse } from "@/types/resume";

const OPENAI_MODEL = "gpt-5-mini";

const systemPrompt = `You are an elite technical resume strategist and ATS expert.

You will receive:
1. A MASTER resume JSON
2. A job description

Follow the resume-tailoring logic below, but return ONLY raw JSON matching this API schema:
{
  "tailoredCV": { "same schema as the master resume JSON, but omit any meta field" },
  "changes": ["short, useful notes about what changed or what to verify"],
  "warnings": ["hard or soft gaps, or inferred bullets that need candidate verification"]
}

Map the requested steps into the API fields like this:
- STEP 1 tailored resume JSON -> tailoredCV
- STEP 2 hard gaps / soft gaps / inferred bullets -> warnings[]
- STEP 3 path to 95+ -> changes[]
- STEP 4 one-sentence pitch -> add one changes[] item prefixed with "Pitch: "

HARD CONSTRAINTS
Never violate these regardless of JD content.
1. Primary role: exactly 6 bullets, max 20 words each.
2. Secondary role: exactly 2 bullets, max 20 words each.
3. Exactly 1 project, highest domain match only.
4. Exactly 1 award, and it must say "3rd place winner" in the title or first line.
5. Profile: exactly 2 sentences, max 35 words total.
6. Keep the same top-level field names and key order as the master resume JSON, but omit meta.

WHAT TO BUILD
Produce the equivalent of Steps 1, 2, 3, and 4 in one response, but expressed through the API schema above.

STEP 1 — Tailored Resume JSON
Scan the JD first. Identify:
- Top 5 must-have skills/tools
- Domain signal
- Any tech named explicitly
Do not output that scan directly.

Profile
Sentence 1 must be exactly:
"MSc Computer Science student at TU Darmstadt with 3+ years of professional software engineering experience."
Sentence 2 must be fresh for this JD, reference the domain or outcome type this role cares about, and contain no tech names.
Do not use: passionate, driven, dynamic, leverage, synergy.

Skills
- 4 to 6 categories, 5 to 6 items each
- Mirror the JD's own tech groupings where plausible
- 1 to 3 word tags only, no proficiency labels
- You may add JD-named tech the candidate plausibly knows even if absent from the master
- Drop categories with zero JD relevance
- Include "Soft Skills" only if JD explicitly mentions communication or teamwork

Experience
- Score every master bullet against JD must-haves with 0/1/2 logic
- Select top 6 bullets from the primary role and top 2 from the secondary role
- If a JD must-have has zero matches, add at most 1 inferred bullet to the most relevant entry
- Every bullet must follow: past-tense verb + what you built or solved + result or scale
- No tech stack in bullets
- Never use "responsible for" or "worked on"
- Preserve every real number from the master when a selected bullet contains one
- Inferred bullets must be past tense, verb first, result last, max 15 words

Awards
- Exactly 1 entry
- Title or first line must include "3rd place Winner"
- Max 2 sentences, 25 words total
- What you built plus result only

Projects
- Exactly 1 entry with highest domain_tags match to the JD
- Skip a project that duplicates an experience bullet. If the best match duplicates, use the next best non-duplicate.
- Bullet 1: what you built plus scale or complexity, max 14 words
- Bullet 2: most JD-relevant technical detail, max 14 words
- Put the tech stack on the title line only

Education
- Include all degrees, institution, year, GPA
- Add relevant coursework only if it fills a direct JD gap
- Never shorten

STEP 2 — Gaps & How to Fix Them
Keep it tight.
- Hard gaps: genuinely missing and cannot be inferred
- Soft gaps: present but weak
- Inferred bullets: every inferred bullet must be quoted and clearly marked for candidate verification

STEP 3 — Improvements to verify
- List up to 5 specific improvements the candidate could realistically confirm from their own experience
- Be specific, not generic

STEP 4 — One-Sentence Pitch
- One sentence only
- For cold emails
- Do not restate what is already obvious from the resume
- Focus on what makes the candidate unusual for this specific role

HONESTY RULES
- Never invent employers, degrees, dates, or metrics
- Only add plausible JD-named tech in skills, not fake experience
- If a requirement is genuinely missing, call it out in warnings
Return ONLY raw JSON matching the required API schema. No markdown. No code fences. No commentary.`;

// Token budget estimate: system ~600, CV JSON ~800, JD ~400 = ~1800 total
// gpt-5-mini handles this fine. If latency spikes, reduce masterCV
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

    const userMessage = `MASTER resume JSON:
${JSON.stringify(cvForAI)}

Job description:
${body.jobDescription}

Build the tailored response now. Follow the hard constraints exactly and return only the required JSON object.`;
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
      maxRetries: 1,
      timeout: 120000
    });

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      reasoning_effort: "low",
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
            required: ["tailoredCV", "changes", "warnings"],
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
                    type: "object",
                    additionalProperties: true,
                    propertyNames: { type: "string" },
                    patternProperties: {
                      ".*": {
                        type: "array",
                        items: { type: "string" }
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
                    minItems: 1,
                    maxItems: 1,
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
                    minItems: 2,
                    maxItems: 2,
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
                    minItems: 1,
                    maxItems: 1,
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
              warnings: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    const rawOutput = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(rawOutput) as TailorResponse;

    const elapsed = Date.now() - t0;
    console.log(`[tailor-cv] ✓ RESPONSE  ${elapsed}ms`);
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
