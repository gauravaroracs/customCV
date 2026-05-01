import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ResumeData, MatchBreakdown } from "@/types/resume";

const OPENAI_MODEL = "gpt-5.1-chat-latest";

const systemPrompt = `You are a strict technical recruiter scoring a CV against a job description.

Score how well this CV matches the job description. Be honest and critical.
Return a JSON object with:
- matchScore: 0-100 overall score
- matchBreakdown: { keywords: number, experience: number, skills: number, overall: number }
- warnings: string[] — hard requirements in the JD the candidate cannot meet

Scoring guide:
- keywords (0-100): How many of the JD's required technologies/tools/skills appear in the CV?
- experience (0-100): Does the candidate's seniority, domain, and type of work match what the JD describes?
- skills (0-100): Do the listed technical skills cover what the JD requires?
- overall: weighted average (keywords 35%, experience 40%, skills 25%), then deduct 5-15 pts for each hard unmet requirement (e.g. required language proficiency, mandatory degree, required visa).
- matchScore: same as overall.

Be realistic. A candidate missing a required language or key technology should score significantly lower.`;

type ScoreRequest = {
  resume: ResumeData;
  jobDescription: string;
};

type ScoreResponse = {
  matchScore: number;
  matchBreakdown: MatchBreakdown;
  warnings: string[];
};

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ScoreRequest;

    if (!body.jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description is required." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 3 });

    const cvText = JSON.stringify({ ...body.resume, personal: { ...body.resume.personal, photoUrl: "" } });
    const systemTokenEst = Math.round(systemPrompt.length / 4);
    const userTokenEst = Math.round((cvText.length + body.jobDescription.length) / 4);

    console.log("\n" + "═".repeat(60));
    console.log(`[score-cv] ▶ REQUEST  ${new Date().toISOString()}`);
    console.log(`  model          : ${OPENAI_MODEL}`);
    console.log(`  cv length      : ${cvText.length} chars  (photo stripped)`);
    console.log(`  jd length      : ${body.jobDescription.length} chars`);
    console.log(`  system prompt  : ~${systemTokenEst} tokens`);
    console.log(`  user payload   : ~${userTokenEst} tokens`);
    console.log(`  TOTAL est.     : ~${systemTokenEst + userTokenEst} tokens`);
    console.log("─".repeat(60));

    const t0 = Date.now();

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `CV: ${cvText}\n\nJob Description: ${body.jobDescription}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "score_response",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["matchScore", "matchBreakdown", "warnings"],
            properties: {
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
              },
              warnings: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as ScoreResponse;

    const elapsed = Date.now() - t0;
    console.log(`[score-cv] ✓ RESPONSE  ${elapsed}ms`);
    console.log(`  matchScore     : ${parsed.matchScore ?? "n/a"}`);
    console.log(`  keywords       : ${parsed.matchBreakdown?.keywords ?? "n/a"}`);
    console.log(`  experience     : ${parsed.matchBreakdown?.experience ?? "n/a"}`);
    console.log(`  skills         : ${parsed.matchBreakdown?.skills ?? "n/a"}`);
    console.log(`  warnings       : ${parsed.warnings?.length ?? 0}`);
    console.log("═".repeat(60) + "\n");

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to score CV.";
    console.error(`[score-cv] ✗ ERROR: ${message}`);
    console.log("═".repeat(60) + "\n");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
