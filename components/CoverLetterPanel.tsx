"use client";

import { Copy, Download } from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";

interface CoverLetterSectionProps {
  candidateName: string;
  company: string;
  role: string;
  cvFontWeight: string;
}

type CoverLetterTypography = {
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  sectionGap: string;
  atsLineHeight: string;
  atsSectionGap: string;
  topMargin: string;
  bottomMargin: string;
};

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

function parseCoverLetterLayout(text: string) {
  const rawLines = text.replace(/\r\n/g, "\n").split("\n");
  const lines = rawLines.map((line) => line.trim());
  const nonEmptyLines = lines.filter(Boolean);
  const name = nonEmptyLines[0] ?? "";
  const subjectIndex = lines.findIndex((line) => line.toLowerCase().startsWith("subject:"));
  const dateIndex = lines.findIndex((line) =>
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(line)
  );
  const contactIndex = lines.findIndex((line) => /@|\+|https?:\/\//i.test(line));
  const locationIndex = lines.findIndex((line, index) =>
    index > 0 &&
    (contactIndex === -1 || index !== contactIndex) &&
    (dateIndex === -1 || index < dateIndex) &&
    /,\s*[a-z\s]+$/i.test(line)
  );
  const bodyStartIndex =
    subjectIndex > -1
      ? subjectIndex + 1
      : lines.findIndex((line) => /^dear\b/i.test(line));
  const recipientStartIndex =
    dateIndex > -1 ? dateIndex + 1 : Math.max(locationIndex, contactIndex, 0) + 1;
  const recipientEndIndex =
    subjectIndex > -1 ? subjectIndex : bodyStartIndex > -1 ? bodyStartIndex : lines.length;
  const contactParts =
    contactIndex > -1
      ? lines[contactIndex].split("|").map((part) => part.trim()).filter(Boolean)
      : [];

  return {
    name,
    contactParts,
    location: locationIndex > -1 ? lines[locationIndex] : "",
    date: dateIndex > -1 ? lines[dateIndex] : "",
    recipientLines: lines
      .slice(recipientStartIndex, recipientEndIndex)
      .map((line) => line.trim())
      .filter(Boolean),
    subject: subjectIndex > -1 ? lines[subjectIndex] : "",
    bodyText: bodyStartIndex > -1 ? rawLines.slice(bodyStartIndex).join("\n").trim() : text.trim()
  };
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

function renderPrintLines(lines: string[]) {
  return lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
}

function parsePx(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function renderLetterPrintHtml(text: string, typography: CoverLetterTypography) {
  const layout = parseCoverLetterLayout(text);
  const contactLines = [layout.location, ...layout.contactParts].filter(Boolean);
  const fontPx = parsePx(typography.fontSize, 9.5);
  const bodyFontPt = fontPx * 1.22;
  const contactFontPt = bodyFontPt * 0.93;
  const headingFontPt = bodyFontPt * 1.72;
  const sectionGapPx = parsePx(typography.sectionGap, 14);

  return `
    <header class="letter-header">
      ${layout.name ? `<h1>${escapeHtml(layout.name)}</h1>` : ""}
      <div class="header-rule"></div>
      ${contactLines.length ? `<div class="contact">${renderPrintLines(contactLines)}</div>` : ""}
    </header>
    ${layout.date ? `<div class="date">${escapeHtml(layout.date)}</div>` : ""}
    ${layout.recipientLines.length ? `<section class="recipient">${renderPrintLines(layout.recipientLines)}</section>` : ""}
    ${layout.subject ? `<div class="subject">${escapeHtml(layout.subject)}</div>` : ""}
    <main>${renderPrintParagraphs(layout.bodyText)}</main>
  `;
}

function CoverLetterDocument({
  text,
  typography
}: {
  text: string;
  typography: CoverLetterTypography;
}) {
  const layout = useMemo(() => parseCoverLetterLayout(text), [text]);
  const paragraphs = useMemo(() => splitParagraphs(layout.bodyText), [layout.bodyText]);
  const contactLines = [layout.location, ...layout.contactParts].filter(Boolean);
  const fontPx = parsePx(typography.fontSize, 9.5);
  const bodyFontPx = fontPx * 1.63;
  const contactFontPx = bodyFontPx * 0.93;
  const headingFontPx = bodyFontPx * 1.74;
  const sectionGapPx = parsePx(typography.sectionGap, 14);
  const atsSectionGapPx = parsePx(typography.atsSectionGap, 7);
  const dateGapPx = parsePx(typography.topMargin, 4);

  return (
    <div className="font-serif text-[#111111]">
      <header className="text-center" style={{ marginBottom: sectionGapPx * 2 }}>
        {layout.name ? (
          <h3
            className="font-bold leading-none tracking-[-0.01em] text-[#050505]"
            style={{ fontSize: headingFontPx }}
          >
            {layout.name}
          </h3>
        ) : null}
        <div className="mt-2 border-t border-[#d9d9d9]" />
        {contactLines.length ? (
          <div
            className="text-center"
            style={{
              fontSize: contactFontPx,
              fontWeight: typography.fontWeight,
              lineHeight: typography.atsLineHeight,
              marginTop: atsSectionGapPx * 2
            }}
          >
            {contactLines.map((line, index) => (
              <div key={`cover-letter-contact-${index}`}>{line}</div>
            ))}
          </div>
        ) : null}
      </header>

      {layout.date ? (
        <div
          className="text-right"
          style={{
            fontSize: bodyFontPx,
            fontWeight: typography.fontWeight,
            lineHeight: typography.lineHeight,
            marginBottom: dateGapPx
          }}
        >
          {layout.date}
        </div>
      ) : null}

      {layout.recipientLines.length ? (
        <section
          style={{
            fontSize: bodyFontPx,
            fontWeight: typography.fontWeight,
            lineHeight: typography.atsLineHeight,
            marginBottom: sectionGapPx * 2
          }}
        >
          {layout.recipientLines.map((line, index) => (
            <div key={`cover-letter-recipient-${index}`}>{line}</div>
          ))}
        </section>
      ) : null}

      {layout.subject ? (
        <div
          className="text-center"
          style={{
            fontSize: bodyFontPx,
            fontWeight: typography.fontWeight,
            lineHeight: typography.lineHeight,
            marginBottom: sectionGapPx * 2
          }}
        >
          {layout.subject}
        </div>
      ) : null}

      <main
        style={{
          fontSize: bodyFontPx,
          fontWeight: typography.fontWeight,
          lineHeight: typography.lineHeight
        }}
      >
        {paragraphs.map((paragraph, paragraphIndex) => (
          <p
            key={`cover-letter-paragraph-${paragraphIndex}`}
            style={{ marginBottom: paragraphIndex < paragraphs.length - 1 ? sectionGapPx * 1.1 : 0 }}
          >
            {paragraph.map((line, lineIndex) => (
              <Fragment key={`cover-letter-line-${paragraphIndex}-${lineIndex}`}>
                {line}
                {lineIndex < paragraph.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        ))}
      </main>
    </div>
  );
}

export function CoverLetterPanel({ cvFontWeight }: CoverLetterSectionProps) {
  const [coverLetterText, setCoverLetterText] = useState("");
  const [coverLetterFontSize, setCoverLetterFontSize] = useState("9.5px");
  const [coverLetterFontWeight, setCoverLetterFontWeight] = useState(cvFontWeight || "400");
  const [coverLetterLineHeight, setCoverLetterLineHeight] = useState("1.6");
  const [coverLetterSectionGap, setCoverLetterSectionGap] = useState("14");
  const [coverLetterAtsLineHeight, setCoverLetterAtsLineHeight] = useState("1.25");
  const [coverLetterAtsSectionGap, setCoverLetterAtsSectionGap] = useState("7");
  const [coverLetterTopMargin, setCoverLetterTopMargin] = useState("4px");
  const [coverLetterBottomMargin, setCoverLetterBottomMargin] = useState("0px");
  const coverLetterPreviewRef = useRef<HTMLDivElement>(null);

  const meta = useMemo(() => parseCoverLetterMeta(coverLetterText), [coverLetterText]);
  const typography = useMemo(
    () => ({
      fontSize: coverLetterFontSize,
      fontWeight: coverLetterFontWeight,
      lineHeight: coverLetterLineHeight,
      sectionGap: coverLetterSectionGap,
      atsLineHeight: coverLetterAtsLineHeight,
      atsSectionGap: coverLetterAtsSectionGap,
      topMargin: coverLetterTopMargin,
      bottomMargin: coverLetterBottomMargin
    }),
    [
      coverLetterAtsLineHeight,
      coverLetterAtsSectionGap,
      coverLetterBottomMargin,
      coverLetterFontSize,
      coverLetterFontWeight,
      coverLetterLineHeight,
      coverLetterSectionGap,
      coverLetterTopMargin
    ]
  );
  const wordCount = useMemo(() => getWordCount(coverLetterText), [coverLetterText]);
  const characterCount = coverLetterText.length;
  const hasText = coverLetterText.trim().length > 0;

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
    const fontPx = parsePx(typography.fontSize, 9.5);
    const bodyFontPt = fontPx * 1.22;
    const contactFontPt = bodyFontPt * 0.93;
    const headingFontPt = bodyFontPt * 1.72;
    const sectionGapPx = parsePx(typography.sectionGap, 14);
    const atsSectionGapPx = parsePx(typography.atsSectionGap, 7);
    const pageTopPaddingPx = 48 + parsePx(typography.topMargin, 4);
    const pageBottomPaddingPx = 48 + parsePx(typography.bottomMargin, 0);
    const paragraphGapPx = sectionGapPx * 1.1;
    const dateGapPx = parsePx(typography.topMargin, 4);

    printWindow.document.write(`
<!doctype html>
<html>
  <head>
    <title>${escapeHtml(filename)}</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; }
      html, body { 
        margin: 0; background: #ffffff; color: #1e293b; 
        font-family: Georgia, "Times New Roman", Times, serif; 
      }
      .page { width: 210mm; min-height: 297mm; padding: ${pageTopPaddingPx}px 16mm ${pageBottomPaddingPx}px; background: #ffffff; }
      .letter-header { margin: 0 0 ${sectionGapPx * 2}px; text-align: center; }
      h1 { margin: 0; color: #050505; font-size: ${headingFontPt}pt; line-height: 1; font-weight: 700; letter-spacing: -0.01em; }
      .header-rule { margin-top: 7px; border-top: 1px solid #d9d9d9; }
      .contact { margin-top: ${atsSectionGapPx * 2}px; text-align: center; font-size: ${contactFontPt}pt; line-height: ${typography.atsLineHeight}; font-weight: ${typography.fontWeight}; }
      .date { margin: 0 0 ${dateGapPx}px; text-align: right; font-size: ${bodyFontPt}pt; line-height: ${typography.lineHeight}; font-weight: ${typography.fontWeight}; }
      .recipient { margin: 0 0 ${sectionGapPx * 2}px; font-size: ${bodyFontPt}pt; line-height: ${typography.atsLineHeight}; font-weight: ${typography.fontWeight}; }
      .subject { margin: 0 0 ${sectionGapPx * 2}px; text-align: center; font-size: ${bodyFontPt}pt; line-height: ${typography.lineHeight}; font-weight: ${typography.fontWeight}; }
      main { font-size: ${bodyFontPt}pt; line-height: ${typography.lineHeight}; font-weight: ${typography.fontWeight}; }
      p { margin: 0 0 ${paragraphGapPx}px; }
      @media print {
        html, body { background: #ffffff; }
      }
    </style>
  </head>
  <body>
    <section class="page">${renderLetterPrintHtml(coverLetterText, typography)}</section>
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

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50/80 p-3">
        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <span className="font-medium text-slate-500">Font size: {coverLetterFontSize}</span>
          <select
            value={coverLetterFontSize}
            onChange={(event) => setCoverLetterFontSize(event.target.value)}
            className="cursor-pointer bg-transparent outline-none"
          >
            <option value="9px">9px (Compact — fits dense content)</option>
            <option value="9.5px">9.5px (Default — recommended)</option>
            <option value="10px">10px (Comfortable)</option>
            <option value="10.5px">10.5px (Large)</option>
            <option value="11px">11px (Very large)</option>
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <span className="font-medium text-slate-500">Weight</span>
          <select
            value={coverLetterFontWeight}
            onChange={(event) => setCoverLetterFontWeight(event.target.value)}
            className="cursor-pointer bg-transparent outline-none"
          >
            <option value="300">Light</option>
            <option value="400">Regular</option>
            <option value="450">Medium</option>
            <option value="500">Semibold</option>
          </select>
        </label>

        <label className="flex min-w-[210px] items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <span className="min-w-[72px] font-medium text-slate-500">Line {coverLetterLineHeight}</span>
          <input
            type="range"
            min="1.35"
            max="1.85"
            step="0.05"
            value={coverLetterLineHeight}
            onChange={(event) => setCoverLetterLineHeight(event.target.value)}
            className="h-2 w-24 cursor-pointer accent-blue-700"
          />
        </label>

        <label className="flex min-w-[222px] items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <span className="min-w-[82px] font-medium text-slate-500">Sections {coverLetterSectionGap}px</span>
          <input
            type="range"
            min="8"
            max="24"
            step="1"
            value={coverLetterSectionGap}
            onChange={(event) => setCoverLetterSectionGap(event.target.value)}
            className="h-2 w-24 cursor-pointer accent-blue-700"
          />
        </label>

        <label className="flex min-w-[234px] items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <span className="min-w-[96px] font-medium text-slate-500">ATS Line {coverLetterAtsLineHeight}</span>
          <input
            type="range"
            min="1.05"
            max="1.6"
            step="0.05"
            value={coverLetterAtsLineHeight}
            onChange={(event) => setCoverLetterAtsLineHeight(event.target.value)}
            className="h-2 w-24 cursor-pointer accent-blue-700"
          />
        </label>

        <label className="flex min-w-[246px] items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <span className="min-w-[108px] font-medium text-slate-500">ATS Sections {coverLetterAtsSectionGap}px</span>
          <input
            type="range"
            min="4"
            max="16"
            step="1"
            value={coverLetterAtsSectionGap}
            onChange={(event) => setCoverLetterAtsSectionGap(event.target.value)}
            className="h-2 w-24 cursor-pointer accent-blue-700"
          />
        </label>

        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <span className="font-medium text-slate-500">Top ↑</span>
          <select
            value={coverLetterTopMargin}
            onChange={(event) => setCoverLetterTopMargin(event.target.value)}
            className="cursor-pointer bg-transparent outline-none"
          >
            <option value="4px">4px</option>
            <option value="8px">8px</option>
            <option value="12px">12px</option>
            <option value="18px">18px</option>
            <option value="24px">24px</option>
            <option value="32px">32px</option>
            <option value="40px">40px</option>
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          <span className="font-medium text-slate-500">Bottom ↓</span>
          <select
            value={coverLetterBottomMargin}
            onChange={(event) => setCoverLetterBottomMargin(event.target.value)}
            className="cursor-pointer bg-transparent outline-none"
          >
            <option value="0px">0px</option>
            <option value="4px">4px</option>
            <option value="8px">8px</option>
            <option value="12px">12px</option>
            <option value="18px">18px</option>
            <option value="24px">24px</option>
            <option value="32px">32px</option>
            <option value="40px">40px</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => void handleCopyText()}
          disabled={!hasText}
          className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Copy text
        </button>
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
              className="mx-auto min-h-[1123px] w-[794px] bg-white px-[60px] py-[60px] shadow-[0_24px_70px_rgba(15,23,42,0.10)] ring-1 ring-slate-200"
              style={{
                paddingTop: 48 + parsePx(coverLetterTopMargin, 4),
                paddingBottom: 48 + parsePx(coverLetterBottomMargin, 0)
              }}
            >
              {hasText ? (
                <CoverLetterDocument text={coverLetterText} typography={typography} />
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
