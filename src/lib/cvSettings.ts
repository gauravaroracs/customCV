export const versions: string[] = ["Java Backend Heavy", "General Tech", "Germany Targeted"];

export type CvPilotSettings = {
  selectedVersion: string;
  cvFontSize: string;
  cvFontWeight: string;
  cvLineHeight: string;
  cvSectionGap: string;
  atsLineHeight: string;
  atsSectionGap: string;
  cvTopMargin: string;
  cvBottomMargin: string;
};

export const cvSettingsDefaults: CvPilotSettings = {
  selectedVersion: versions[0],
  cvFontSize: "9.5px",
  cvFontWeight: "400",
  cvLineHeight: "1.6",
  cvSectionGap: "14",
  atsLineHeight: "1.25",
  atsSectionGap: "7",
  cvTopMargin: "12px",
  cvBottomMargin: "12px"
};
