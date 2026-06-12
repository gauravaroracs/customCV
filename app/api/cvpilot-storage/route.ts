import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

type CvPilotSettings = {
  selectedVersion?: string;
  cvFontSize?: string;
  cvFontWeight?: string;
  cvTopMargin?: string;
  cvBottomMargin?: string;
};

type CvPilotStorage = {
  masterCV?: unknown;
  workingCV?: unknown;
  recentApplications?: unknown[];
  settings?: CvPilotSettings;
  photo?: string;
  coverLetter?: string;
};

const storageDir = process.env.VERCEL
  ? path.join("/tmp", "cvpilot")
  : path.join(process.cwd(), "data", "cvpilot");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const files = {
  masterCV: "master-cv.json",
  workingCV: "working-cv.json",
  recentApplications: "recent.json",
  settings: "settings.json",
  photo: "photo.txt",
  coverLetter: "cover-letter.txt"
} as const;

let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureStorageDir() {
  await fs.mkdir(storageDir, { recursive: true });
}

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(storageDir, filename), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function readTextFile(filename: string): Promise<string> {
  try {
    return await fs.readFile(path.join(storageDir, filename), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

async function writeJsonFile(filename: string, value: unknown) {
  await ensureStorageDir();
  await writeFileAtomic(filename, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeTextFile(filename: string, value: string) {
  await ensureStorageDir();
  await writeFileAtomic(filename, value);
}

async function writeFileAtomic(filename: string, value: string) {
  const destination = path.join(storageDir, filename);
  const temporary = path.join(
    storageDir,
    `.${filename}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );

  await fs.writeFile(temporary, value, "utf8");
  await fs.rename(temporary, destination);
}

async function readStorage(): Promise<CvPilotStorage> {
  await ensureStorageDir();

  return {
    masterCV: await readJsonFile(files.masterCV, null),
    workingCV: await readJsonFile(files.workingCV, null),
    recentApplications: await readJsonFile(files.recentApplications, []),
    settings: await readJsonFile(files.settings, {}),
    photo: await readTextFile(files.photo),
    coverLetter: await readTextFile(files.coverLetter)
  };
}

function stringifyForGuard(value: unknown) {
  try {
    return JSON.stringify(value ?? "").toLowerCase();
  } catch {
    return "";
  }
}

function isFraunhoferNlpCv(value: unknown) {
  const text = stringifyForGuard(value);
  return (
    text.includes("fraunhofer sit") ||
    text.includes("introduction to large language models") ||
    text.includes("ai / ml / nlp")
  );
}

function isKnownStaleBackendCv(value: unknown) {
  const text = stringifyForGuard(value);
  return (
    text.includes("currently upskilling into ml") ||
    text.includes("b1 learning") ||
    (text.includes("programming") && text.includes("soft skills") && !text.includes("fraunhofer sit"))
  );
}

export async function GET() {
  try {
    return NextResponse.json(await readStorage());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read CVPilot storage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as CvPilotStorage;
    const nextWrite = writeQueue
      .catch(() => undefined)
      .then(async () => {
        const current = await readStorage();

        if ("masterCV" in body) {
          await writeJsonFile(files.masterCV, body.masterCV ?? null);
        }

        if ("workingCV" in body) {
          const isExplicitMasterAndWorkingPair = "masterCV" in body;
          const shouldIgnoreStaleWorkingCv =
            !isExplicitMasterAndWorkingPair && isKnownStaleBackendCv(body.workingCV);

          if (!shouldIgnoreStaleWorkingCv) {
            await writeJsonFile(files.workingCV, body.workingCV ?? null);
          }
        }

        if ("recentApplications" in body) {
          await writeJsonFile(files.recentApplications, body.recentApplications ?? []);
        }

        if ("settings" in body) {
          await writeJsonFile(files.settings, {
            ...current.settings,
            ...body.settings
          });
        }

        if ("photo" in body) {
          await writeTextFile(files.photo, body.photo ?? "");
        }

        if ("coverLetter" in body) {
          await writeTextFile(files.coverLetter, body.coverLetter ?? "");
        }
      });

    writeQueue = nextWrite;
    await nextWrite;

    return NextResponse.json(await readStorage());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write CVPilot storage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
