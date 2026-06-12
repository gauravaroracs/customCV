"use client";

import { Copy, Download } from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";

interface CoverLetterSectionProps {
  candidateName: string;
  company: string;
  role: string;
}

function parseCoverLetterMeta(text: string) {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const name = lines[0] ?? '';

  const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:')) ?? '';
  const role = subjectLine.replace(/subject:/i, '').split('—')[0].trim();
  const subjectIndex = lines.findIndex(l => l.toLowerCase().startsWith('subject:'));
  const dearRawIndex = rawLines.findIndex(l => /^dear\b/i.test(l.trim()));
  const contact = lines.find(l => /@|\+|https?:\/\//i.test(l)) ?? "";
  const date =
    lines.find(l => /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(l)) ?? "";
  const location =
    lines.find((l, index) =>
      index > 0 &&
      index < (subjectIndex === -1 ? lines.length : subjectIndex) &&
      /,\s*[a-z\s]+$/i.test(l) &&
      !/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(l)
    ) ?? "";

  const recipientLines = subjectIndex > -1
    ? lines.slice(Math.max(1, subjectIndex - 3), subjectIndex)
    : [];
  const company = recipientLines.find((line) =>
    !/^hiring\s+(team|manager)$/i.test(line) &&
    !/^recruiting\s+team$/i.test(line) &&
    !/,\s*[a-z\s]+$/i.test(line)
  ) ?? "";
  const bodyText = dearRawIndex > -1 ? rawLines.slice(dearRawIndex).join("\n").trim() : text;

  return { name, company, role, contact, date, location, recipientLines, bodyText };
}

function getWordCount(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function splitParagraphs(text: string) {
  return text.trim().split("\n\n").map((paragraph) => paragraph.split("\n"));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderPrintParagraphs(text: string) {
  return splitParagraphs(text)
    .filter((paragraph) => paragraph.some((line) => line.trim()))
    .map((paragraph) =>
      `<p>${paragraph.map((line) => escapeHtml(line)).join("<br/>")}</p>`
    )
    .join("");
}

export function CoverLetterPanel(props: CoverLetterSectionProps) {
  void props;

  const [coverLetterText, setCoverLetterText] = useState("");
  const coverLetterPreviewRef = useRef<HTMLDivElement>(null);

  const meta = useMemo(() => parseCoverLetterMeta(coverLetterText), [coverLetterText]);
  const paragraphs = useMemo(() => splitParagraphs(meta.bodyText), [meta.bodyText]);
  const wordCount = useMemo(() => getWordCount(coverLetterText), [coverLetterText]);
  const characterCount = coverLetterText.length;
  const hasText = coverLetterText.trim().length > 0;
  const subtitle = [meta.company, meta.role].filter(Boolean).join(" | ");

  const handleCopyText = async () => {
    if (!hasText) {
      return;
    }

    await navigator.clipboard.writeText(coverLetterText);
  };

  const handleDownloadPdf = async () => {
    if (!hasText || !coverLetterPreviewRef.current) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
      window.print();
      return;
    }

    const { name, company } = parseCoverLetterMeta(coverLetterText);
    const filename = `CoverLetter_${name.replace(/\s+/g,'_')}_${company.replace(/\s+/g,'_')}.pdf`;
    const subtitleHtml = subtitle
      ? `<p class="subtitle">${escapeHtml(subtitle)}</p>`
      : "";
    const contactHtml = [meta.contact, meta.location, meta.date]
      .filter(Boolean)
      .map((item) => `<div>${escapeHtml(item)}</div>`)
      .join("");
    const recipientHtml = meta.recipientLines
      .filter(Boolean)
      .map((item) => `<div>${escapeHtml(item)}</div>`)
      .join("");

    printWindow.document.write(`
<!doctype html>
<html>
  <head>
    <title>${escapeHtml(filename)}</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; background: #ffffff; color: #1e293b; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .page { width: 210mm; min-height: 297mm; padding: 18mm; background: #ffffff; }
      header { border-bottom: 1px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 28px; display: flex; justify-content: space-between; gap: 32px; }
      h1 { margin: 0; font-size: 24px; line-height: 1.15; color: #020617; }
      .subtitle { margin: 8px 0 0; font-size: 10.5pt; font-weight: 500; color: #64748b; }
      .muted { font-size: 9pt; line-height: 1.5; color: #64748b; text-align: right; max-width: 70mm; }
      main { font-size: 10pt; line-height: 1.6; }
      p { margin: 0 0 14px; }
      @media print {
        html, body { background: #ffffff; }
        .page { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <section class="page">
      <header>
        <div>
          <h1>${escapeHtml(meta.name)}</h1>
          ${subtitleHtml}
          <div style="margin-top: 10px; font-size: 9pt; line-height: 1.5; color: #64748b;">${contactHtml}</div>
        </div>
        <div class="muted">${recipientHtml}</div>
      </header>
      <main>${renderPrintParagraphs(meta.bodyText)}</main>
    </section>
  </body>
</html>
`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <section className="no-print rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-panel">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            Cover Letter
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Editor and preview</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCopyText()}
            disabled={!hasText}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            Copy text
          </button>
          <button
            type="button"
            onClick={() => {
              void handleDownloadPdf();
            }}
            disabled={!hasText}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
        <div className="min-w-0">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Cover letter text</span>
            <textarea
              value={coverLetterText}
              onChange={(event) => setCoverLetterText(event.target.value)}
              rows={24}
              placeholder="Paste or write your cover letter here..."
              className="mt-2 min-h-[640px] w-full resize-y rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-[15px] leading-7 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-slate-500">
            <span>{wordCount} words</span>
            <span>{characterCount} characters</span>
          </div>
        </div>

        <div className="min-w-0 rounded-[28px] border border-slate-200/80 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Live A4 Preview
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {hasText ? "Ready" : "Empty"}
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div
              id="cover-letter-preview"
              ref={coverLetterPreviewRef}
              className="mx-auto min-h-[1123px] w-[794px] bg-white p-12 font-sans text-[15px] leading-[1.6] text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.10)] ring-1 ring-slate-200"
            >
              <header className="mb-10 border-b border-slate-200 pb-6">
                <div className="flex items-start justify-between gap-8">
                  <div>
                    <h3 className="text-3xl font-bold text-slate-950">{meta.name}</h3>
                    {subtitle ? (
                      <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>
                    ) : null}
                  </div>

                  <div className="max-w-[220px] text-right text-xs leading-5 text-slate-500">
                    {meta.name ? <div className="font-semibold text-slate-700">{meta.name}</div> : null}
                    {meta.company ? <div>{meta.company}</div> : null}
                    {meta.role ? <div>{meta.role}</div> : null}
                  </div>
                </div>
              </header>

              {hasText ? (
                <div className="space-y-5">
                  {paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={`cover-letter-paragraph-${paragraphIndex}`}>
                      {paragraph.map((line, lineIndex) => (
                        <Fragment key={`cover-letter-line-${paragraphIndex}-${lineIndex}`}>
                          {line}
                          {lineIndex < paragraph.length - 1 ? <br /> : null}
                        </Fragment>
                      ))}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[520px] items-center justify-center">
                  <div className="max-w-sm rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                    <p className="text-sm font-semibold text-slate-700">No cover letter text yet</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Paste or write your letter in the editor to preview the A4 document.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
