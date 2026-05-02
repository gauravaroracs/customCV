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
};

const storageDir = path.join(process.cwd(), "data", "cvpilot");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const files = {
  masterCV: "master-cv.json",
  workingCV: "working-cv.json",
  recentApplications: "recent.json",
  settings: "settings.json",
  photo: "photo.txt"
} as const;

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
  await fs.writeFile(path.join(storageDir, filename), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeTextFile(filename: string, value: string) {
  await ensureStorageDir();
  await fs.writeFile(path.join(storageDir, filename), value, "utf8");
}

async function readStorage(): Promise<CvPilotStorage> {
  await ensureStorageDir();

  return {
    masterCV: await readJsonFile(files.masterCV, null),
    workingCV: await readJsonFile(files.workingCV, null),
    recentApplications: await readJsonFile(files.recentApplications, []),
    settings: await readJsonFile(files.settings, {}),
    photo: await readTextFile(files.photo)
  };
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
    const current = await readStorage();

    if ("masterCV" in body) {
      await writeJsonFile(files.masterCV, body.masterCV ?? null);
    }

    if ("workingCV" in body) {
      await writeJsonFile(files.workingCV, body.workingCV ?? null);
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

    return NextResponse.json(await readStorage());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write CVPilot storage.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
