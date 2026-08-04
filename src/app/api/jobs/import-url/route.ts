import { NextResponse } from "next/server";
import { upsertJob, type JobInput } from "@/lib/jobStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 1_500_000;
const MAX_DESCRIPTION_LENGTH = 18_000;

function decodeHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlToText(value: string) {
  return decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>|<\/div>|<\/li>|<\/section>|<\/article>|<\/h[1-6]>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstMatch(html: string, pattern: RegExp) {
  return decodeHtml(html.match(pattern)?.[1]?.trim() ?? "");
}

function parseJsonLd(html: string) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]);
      const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [])];
      const jobPosting = candidates.find((item) => item && typeof item === "object" && (item["@type"] === "JobPosting" || (Array.isArray(item["@type"]) && item["@type"].includes("JobPosting"))));
      if (jobPosting) return jobPosting as Record<string, unknown>;
    } catch {
      // Ignore malformed JSON-LD and fall back to metadata/page text.
    }
  }
  return null;
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return stringValue(value[0]);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return stringValue(record.name ?? record.streetAddress ?? record.addressLocality ?? record.addressRegion ?? "");
  }
  return "";
}

function jobLocationValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(jobLocationValue).filter(Boolean).join("; ");
  if (!value || typeof value !== "object") return stringValue(value);
  const record = value as Record<string, unknown>;
  const address = record.address && typeof record.address === "object" ? record.address as Record<string, unknown> : null;
  return [record.name, address?.addressLocality, address?.addressRegion, address?.addressCountry]
    .map(stringValue)
    .filter(Boolean)
    .join(", ");
}

function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host === "::1") return true;
  if (/^(127|10)\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  const private172 = host.match(/^172\.(\d+)\./);
  return Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
}

function validateJobUrl(rawUrl: unknown) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) throw new Error("Paste a job-page URL first.");
  const url = new URL(rawUrl.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || isBlockedHostname(url.hostname)) {
    throw new Error("Use a public http(s) job-page URL.");
  }
  url.hash = "";
  return url;
}

function makeJobId(url: URL) {
  return url.toString().replace(/\/$/, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: string };
    const url = validateJobUrl(body.url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "CVPilot job importer/1.0" },
        cache: "no-store"
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw new Error(`The job page returned HTTP ${response.status}.`);
    const finalUrl = validateJobUrl(response.url || url.toString());
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("That URL did not return an HTML job page.");
    }

    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) throw new Error("The job page is too large to import.");

    const jsonLd = parseJsonLd(html);
    const pageText = htmlToText(html);
    const description = htmlToText(stringValue(jsonLd?.description)) || pageText;
    if (description.length < 80) throw new Error("Could not extract enough job-description text from that page.");

    const company = stringValue(jsonLd?.hiringOrganization) || firstMatch(html, /<meta[^>]+(?:property|name)=["'](?:og:site_name|application-name)["'][^>]+content=["']([^"']+)/i);
    const role = stringValue(jsonLd?.title) || firstMatch(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const location = jobLocationValue(jsonLd?.jobLocation) || firstMatch(html, /<meta[^>]+name=["'](?:location|job-location)["'][^>]+content=["']([^"']+)/i);
    const postedDate = stringValue(jsonLd?.datePosted) || firstMatch(html, /<meta[^>]+(?:property|name)=["'](?:article:published_time|datePosted)["'][^>]+content=["']([^"']+)/i);
    const job: JobInput = {
      job_id: makeJobId(finalUrl),
      source: "Manual job-page import",
      company,
      role,
      location,
      job_url: finalUrl.toString(),
      posted_date: postedDate,
      job_description: description.slice(0, MAX_DESCRIPTION_LENGTH),
      notes: "Imported from a complete job-page URL. Score is intentionally not assigned."
    };

    return NextResponse.json({ job: await upsertJob(job), extracted: { company, role, location, posted_date: postedDate } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import that job page.";
    const status = /URL|paste|public|HTML|extract|HTTP 4/i.test(message) ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
