import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ProposeEditsRequest, ProposeEditsResponse } from "@/types/resume";

const OPENAI_MODEL = "gpt-5.1-chat-latest";

const proposalItemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "title",
    "rationale",
    "patchType",
    "beforeSummary",
    "profileText",
    "experienceRoleHint",
    "experienceBullets",
    "projectItems",
    "languageItems",
    "skillGroups"
  ],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    rationale: { type: "string" },
    patchType: {
      type: "string",
      enum: ["profile", "skills", "experience_bullets", "projects_list", "languages"]
    },
    beforeSummary: { type: "string" },
    profileText: { type: "string" },
    experienceRoleHint: { type: "string" },
    experienceBullets: { type: "array", items: { type: "string" } },
    projectItems: {
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
    },
    languageItems: {
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
    skillGroups: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["groupName", "items"],
        properties: {
          groupName: { type: "string" },
          items: { type: "array", items: { type: "string" } }
        }
      }
    }
  }
} as const;

const systemPrompt = `You are a CV coach for German tech hiring. The user will paste a job description (JD)
and a BASE_CV (their honest master or working CV).

TASK
Produce actionable EDIT PROPOSALS — discrete patches the user can accept or reject in an app.
Do NOT return a full rewritten CV. Each proposal changes ONE logical area.

RULES
1. Truth: never invent employers, dates, degrees, metrics, or skills not clearly supported by BASE_CV.
   You may rephrase and reorder; you may mirror JD terminology when it matches existing experience.
2. JD fit: prioritize bullets and skills that match stated responsibilities and required/nice-to-have tech.
3. patchType meanings:
   - profile: set profileText to the FULL new summary (other proposal fields mostly empty arrays / empty strings).
   - skills: only skillGroups filled — replace those skill GROUPS entirely with new ordered lists.
     Use ONLY group names that appear in the user message "Skill group names:" list (exact spelling).
   - experience_bullets: set experienceRoleHint to a SHORT substring matching role OR company in BASE_CV,
     and experienceBullets to the full new bullet list for that single role (max 5 bullets).
   - projects_list: set projectItems to the full new projects array (max 2 projects, max 2 bullets each)
     only when trimming/reordering projects for this JD.
   - languages: set languageItems to the full languages list when a change is needed.
4. For any patchType, leave unused fields empty: "" or [] as appropriate.
5. beforeSummary: one short phrase showing what this replaces (or "n/a" if additive).
6. id: stable short slug e.g. "profile-1", "exp-se-1".
7. Produce 4–10 proposals covering the highest-impact JD gaps (typical: profile, skills, 1–2 experience patches, projects if relevant).
8. Bold: you may use **double asterisks** in text fields for ATS-style emphasis (sparingly).
9. coachingSummary: 2–4 sentences on overall fit and what you focused on.

Return only JSON matching the schema.`;

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ProposeEditsRequest;

    if (!body.jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description is required." }, { status: 400 });
    }

    if (!body.baseCV || typeof body.baseCV !== "object") {
      return NextResponse.json({ error: "baseCV is required." }, { status: 400 });
    }

    const cvForAI = {
      ...body.baseCV,
      personal: { ...body.baseCV.personal, photoUrl: "" }
    };

    const skillGroupNames = Object.keys(cvForAI.skills ?? {}).join(", ");

    const userMessage = `Skill group names (use these exact strings only for skills proposals): ${skillGroupNames || "(none)"}

${body.userNotes?.trim() ? `User preferences / extra instructions:\n${body.userNotes.trim()}\n\n` : ""}baseCV: ${JSON.stringify(cvForAI)}
jobDescription: ${body.jobDescription.trim()}`;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
      timeout: 90_000
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
          name: "propose_cv_edits",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["coachingSummary", "proposals", "warnings"],
            properties: {
              coachingSummary: { type: "string" },
              warnings: { type: "array", items: { type: "string" } },
              proposals: {
                type: "array",
                items: proposalItemSchema
              }
            }
          }
        }
      }
    });

    const rawOutput = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(rawOutput) as ProposeEditsResponse;

    if (!parsed.proposals || !Array.isArray(parsed.proposals)) {
      return NextResponse.json({ error: "Invalid model response shape." }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to propose CV edits.";
    console.error(`[propose-cv-edits] ERROR: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
