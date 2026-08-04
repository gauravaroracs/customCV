export const versions: string[] = ["Java Backend Heavy", "General Tech", "Germany Targeted"];

export type CvPilotSettings = {
  selectedVersion: string;
  cvFontSize: string;
  cvFontWeight: string;
  cvLineHeight: string;
  cvSectionGap: string;
  atsFontSize: string;
  atsLineHeight: string;
  atsSectionGap: string;
  atsPageMargin: string;
  cvTopMargin: string;
  cvBottomMargin: string;
  cvLeftMargin: string;
  cvRightMargin: string;
};

export const cvSettingsDefaults: CvPilotSettings = {
  selectedVersion: versions[0],
  cvFontSize: "9.5px",
  cvFontWeight: "400",
  cvLineHeight: "1.6",
  cvSectionGap: "14",
  atsFontSize: "11px",
  atsLineHeight: "1.25",
  atsSectionGap: "7",
  atsPageMargin: "15mm",
  cvTopMargin: "12px",
  cvBottomMargin: "12px",
  cvLeftMargin: "12px",
  cvRightMargin: "12px"
};

export const cvFontSizeOptions = [
  "8px",
  "8.5px",
  "9px",
  "9.5px",
  "10px",
  "10.5px",
  "11px",
  "11.5px",
  "12px"
] as const;

export const atsFontSizeOptions = ["9px", "10px", "11px", "12px", "13px"] as const;
export const cvMarginOptions = ["0px", "4px", "8px", "12px", "16px", "20px", "24px", "32px", "40px"] as const;
export const atsPageMarginOptions = ["8mm", "10mm", "12mm", "15mm", "18mm", "20mm", "25mm"] as const;

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSliderValue(
  value: unknown,
  fallback: string,
  min: number,
  max: number,
  precision = 2
) {
  if (typeof value !== "string" && typeof value !== "number") {
    return fallback;
  }

  const parsed = Number.parseFloat(String(value).trim());
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return String(Number(clampNumber(parsed, min, max).toFixed(precision)));
}

function normalizeSelectValue(value: unknown, allowed: readonly string[], fallback: string) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function normalizePxSelectValue(value: unknown, fallback: string) {
  if (typeof value !== "string" && typeof value !== "number") {
    return fallback;
  }

  const parsed = Number.parseFloat(String(value).trim());
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return `${Math.max(0, Math.round(parsed))}px`;
}

function normalizeMmSelectValue(value: unknown, fallback: string) {
  if (typeof value !== "string" && typeof value !== "number") {
    return fallback;
  }

  const parsed = Number.parseFloat(String(value).trim());
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return `${Math.max(0, Math.round(parsed))}mm`;
}

export function normalizeCvPilotSettings(
  patch: Partial<CvPilotSettings>,
  base: CvPilotSettings = cvSettingsDefaults
): CvPilotSettings {
  return {
    selectedVersion: normalizeSelectValue(patch.selectedVersion, versions, base.selectedVersion),
    cvFontSize: normalizeSelectValue(
      patch.cvFontSize,
      cvFontSizeOptions,
      base.cvFontSize
    ),
    cvFontWeight: normalizeSelectValue(
      patch.cvFontWeight,
      ["300", "400", "450", "500"],
      base.cvFontWeight
    ),
    cvLineHeight: normalizeSliderValue(patch.cvLineHeight, base.cvLineHeight, 1.35, 1.85),
    cvSectionGap: normalizeSliderValue(patch.cvSectionGap, base.cvSectionGap, 8, 24, 0),
    atsFontSize: normalizeSelectValue(patch.atsFontSize, atsFontSizeOptions, base.atsFontSize),
    atsLineHeight: normalizeSliderValue(patch.atsLineHeight, base.atsLineHeight, 1.05, 1.6),
    atsSectionGap: normalizeSliderValue(patch.atsSectionGap, base.atsSectionGap, 4, 16, 0),
    atsPageMargin: normalizeMmSelectValue(patch.atsPageMargin, base.atsPageMargin),
    cvTopMargin: normalizePxSelectValue(patch.cvTopMargin, base.cvTopMargin),
    cvBottomMargin: normalizePxSelectValue(patch.cvBottomMargin, base.cvBottomMargin),
    cvLeftMargin: normalizePxSelectValue(patch.cvLeftMargin, base.cvLeftMargin),
    cvRightMargin: normalizePxSelectValue(patch.cvRightMargin, base.cvRightMargin)
  };
}
