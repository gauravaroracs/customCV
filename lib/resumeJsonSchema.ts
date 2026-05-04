/**
 * JSON Schema (draft-07) for CVPilot ResumeData — used by Monaco for validation / IntelliSense.
 * Skill groups are open-ended objects (Frontend, Backend, Programming, etc.).
 */
export const RESUME_JSON_SCHEMA_URI = "https://cvpilot.local/schemas/resume-data.json";

export const resumeDataJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: RESUME_JSON_SCHEMA_URI,
  title: "ResumeData",
  type: "object",
  additionalProperties: false,
  required: ["personal", "profile", "skills", "languages", "education", "experience", "projects"],
  properties: {
    personal: {
      type: "object",
      additionalProperties: false,
      required: ["name", "email", "phone", "location", "linkedin", "website", "photoUrl"],
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        linkedin: { type: "string" },
        website: { type: "string" },
        photoUrl: {
          type: "string",
          description: "Usually empty here — preview uses the photo from Upload in the toolbar."
        }
      }
    },
    profile: { type: "string", description: "Summary / profile paragraph" },
    skills: {
      type: "object",
      description: "Named skill groups → list of skill strings",
      additionalProperties: {
        type: "array",
        items: { type: "string" }
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
    experience: {
      type: "array",
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
} as const;
