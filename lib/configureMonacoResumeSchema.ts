import type { Monaco } from "@monaco-editor/react";
import { RESUME_JSON_SCHEMA_URI, resumeDataJsonSchema } from "@/lib/resumeJsonSchema";

declare global {
  interface Window {
    __cvpilotResumeJsonSchemaConfigured?: boolean;
  }
}

/** Configure JSON diagnostics once per browser tab — survives Fast Refresh without stacking schemas. */
export function configureResumeJsonSchema(monaco: Monaco) {
  if (typeof window !== "undefined" && window.__cvpilotResumeJsonSchemaConfigured) {
    return;
  }

  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    schemas: [
      {
        uri: RESUME_JSON_SCHEMA_URI,
        fileMatch: ["*"],
        schema: resumeDataJsonSchema as unknown as Record<string, unknown>
      }
    ]
  });

  if (typeof window !== "undefined") {
    window.__cvpilotResumeJsonSchemaConfigured = true;
  }
}
