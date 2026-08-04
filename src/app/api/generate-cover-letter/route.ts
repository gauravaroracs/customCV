import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { CoverLetterRequest, CoverLetterResponse, ResumeData } from "@/types/resume";

const OPENAI_MODEL = "gpt-5-mini";

const systemPrompt = `You are an elite cover letter strategist.

Your job is to write, score, and self-improve a cover letter until it scores 90+ out of 100 when the available evidence supports that score.
If the available evidence is thin, still produce the strongest honest final version.

Return ONLY a single JSON object with this shape:
{
  "coverLetter": "The final paper-ready cover letter text in plain prose, including the line 'Final score: X/100' above the letter.",
  "highlights": ["short notes about the strongest choices or improvements made"],
  "warnings": ["missing data, weak evidence, or reasons the score could not go higher"]
}

Use the following rules from the user's template.

ROLE INPUTS
You will receive:
- Role title
- Company name
- Location if known
- Full JD
- Resume JSON
- Existing draft, if any

CANDIDATE DETAILS — FIXED, DO NOT MODIFY
Full Name: Gaurav Arora
Email: gaurav.arora@stud.tu-darmstadt.de
Phone: +49 15212960879
City: Darmstadt, Germany

FORMAT RULES FOR coverLetter
- Body length: 250 to 320 words
- The complete letter must be plain prose with no markdown, no bullet points, and no section labels inside the letter itself
- Keep exactly one blank line between paragraphs, and no blank lines within a paragraph
- Include the header in this exact order:
Gaurav Arora
gaurav.arora@stud.tu-darmstadt.de | +49 15212960879
Darmstadt, Germany
[Date written as Month D, YYYY]
[Recruiter Full Name or Hiring Team]
[Their Title if known, otherwise omit]
[Company Name]
[Company City, Country if known]
Subject: [Role Title] — Gaurav Arora
Dear [Mr./Ms. Last Name or Hiring Team],

STRUCTURE
Paragraph 1, opener:
- Max 3 sentences
- Establish context before the differentiator
- Make clear this is not a typical student applicant
- Never open with "I am writing to apply"

Paragraph 2, company and product fit:
- Max 4 sentences
- Name the company's specific product if the JD makes it identifiable
- Connect the candidate's background to the product's core problem, not just the stack

Paragraph 3, proof points:
- Max 4 sentences
- Give 2 specific technical proof points tied to outcomes
- Do not reuse any proof point already used earlier in the letter

Paragraph 4, call to action:
- Exactly 1 sentence
- State availability, hybrid or relocation comfort, and invite discussion

Footer:
Best regards,
Gaurav Arora
gaurav.arora@stud.tu-darmstadt.de | +49 15212960879

HARD RULES
- Name the company's specific product in paragraph 2 if identifiable from the JD. If not identifiable, focus on the company's core platform or service area and add a warning.
- No skills laundry list. Every tech mention must be tied to an outcome.
- Banned words: passionate, driven, dynamic, leverage, synergy, excited to apply.
- Never use the same proof point in more than one paragraph.
- Each paragraph must do exactly one job.
- Do not repeat the company or product name more than twice in the whole letter.
- Subject line format must be exactly: [Role Title] — Gaurav Arora.

SCORING RUBRIC
Evaluate internally against:
- Opener hooks without being abrupt: 15
- Company product named and connected to background: 15
- Each tech mention tied to an outcome: 15
- Not-internship differentiator lands clearly: 10
- No proof point reused across paragraphs: 10
- Tone formal but not stiff: 10
- No banned words or rule violations: 10
- Call to action has availability and hybrid comfort: 10
- Body word count within 250 to 320: 5

PROCESS
- Read the full JD first and infer implied requirements.
- Draft the letter.
- Self-score it.
- Improve weak sections until you reach 90+ or until the remaining gap depends on missing information.
- Return ONLY the final version in coverLetter, not the intermediate rounds.
- Put the final score on the first line exactly as: Final score: X/100
- Use highlights[] for 2 to 5 concise notes about what you improved or emphasized.
- Use warnings[] for any missing recruiter, product ambiguity, missing hard evidence, or reasons the score is capped.

HONESTY RULES
- Never invent employers, degrees, dates, or metrics.
- If recruiter details are unknown, use Hiring Team.
- If product details are not explicit, infer cautiously from the JD only and flag uncertainty in warnings.
- If the score cannot honestly reach 90, still provide the best final version and explain the cap in warnings.

Return ONLY valid JSON.`;

function sanitizeResume(resume: ResumeData) {
  return {
    ...resume,
    personal: {
      ...resume.personal,
      photoUrl: ""
    }
  };
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const body = (await request.json()) as CoverLetterRequest;

    if (!body.resume || typeof body.resume !== "object") {
      return NextResponse.json({ error: "resume is required." }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
      timeout: 120_000
    });

    const today = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(new Date());

    const userPayload = `Resume JSON (photo stripped):
${JSON.stringify(sanitizeResume(body.resume))}

Target role context:
${JSON.stringify(body.metadata ?? {})}

Job description:
${typeof body.jobDescription === "string" ? body.jobDescription : ""}

Existing draft for reference:
${typeof body.existingDraft === "string" ? body.existingDraft : ""}

Use today's date in the header: ${today}

Write the strongest final cover letter now and return only the required JSON object.`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload }
      ],
      response_format: { type: "json_object" }
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as CoverLetterResponse | { error?: string };

    if (!parsed || typeof parsed !== "object" || typeof (parsed as CoverLetterResponse).coverLetter !== "string") {
      return NextResponse.json({ error: "Model did not return a valid cover letter." }, { status: 502 });
    }

    return NextResponse.json({
      coverLetter: (parsed as CoverLetterResponse).coverLetter,
      highlights: Array.isArray((parsed as CoverLetterResponse).highlights)
        ? (parsed as CoverLetterResponse).highlights
        : [],
      warnings: Array.isArray((parsed as CoverLetterResponse).warnings)
        ? (parsed as CoverLetterResponse).warnings
        : []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cover letter generation failed.";
    console.error("[generate-cover-letter]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
