import { chromium } from "playwright";

const baseUrl = process.env.CVPILOT_QA_URL || "http://127.0.0.1:3030";

const sampleJobText = `
Company: Acme AI Systems
Role: Working Student Full-Stack AI Engineer
Location: Darmstadt / Hybrid

We are looking for a working student who can build React and Node.js tools for AI-assisted document automation.
Required: TypeScript, React, Node.js, REST APIs, PostgreSQL, Docker, prompt engineering, and good English.
Nice to have: OpenAI API, workflow automation, Python, observability, and experience turning ambiguous user needs into production tools.
Responsibilities include building internal dashboards, improving AI prompts, reviewing generated JSON, and writing user-facing cover letters.
`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function firstVisibleText(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      const text = (await locator.textContent())?.trim();
      if (text) return text;
    }
  }
  return "";
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder(/paste everything from the job page here/i).waitFor({ timeout: 30000 });
  await page.waitForFunction(() => /Master CV ready|CV JSON|No roles yet|Working Student/i.test(document.body.innerText), null, { timeout: 30000 });

  await page.screenshot({ path: "$JCODE_SCRATCH_DIR/qa-desktop.png", fullPage: true });

  const pasteBox = page.getByPlaceholder(/paste everything from the job page here/i);
  await pasteBox.click();
  await page.keyboard.insertText(sampleJobText);
  const importButton = page.getByRole("button", { name: /import job/i });
  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll("button")];
    const button = buttons.find((item) => /import job/i.test(item.textContent || ""));
    return button && !button.hasAttribute("disabled");
  });
  await expectButtonEnabled(importButton, "Import job button should be enabled after paste.");

  await importButton.click();
  await page.waitForTimeout(1500);

  const importResult = await firstVisibleText(page, [".alert--success", ".alert--error", ".alert--warning"]);
  assert(
    /job imported|database_url|could not|failed|not configured|unavailable/i.test(importResult),
    `Import should either succeed or show a controlled storage/API error. Got: ${importResult}`
  );

  let prepareResult = "not-run";
  const importedRows = page.locator(".job-row");
  if (await importedRows.count()) {
    await importedRows.first().click();
  }
  const prepareButton = page.getByRole("button", { name: /prepare full application/i }).first();
  await page.waitForTimeout(300);
  const prepareVisible = await prepareButton.count();
  const bodyBeforePrepare = await page.locator("body").innerText();
  const prepareAlreadyRunning = /Scoring|Generating|Improving|Preparing/i.test(bodyBeforePrepare);
  if (prepareAlreadyRunning) {
    prepareResult = "prepare already running";
  }
  if (!(prepareVisible > 0 || prepareAlreadyRunning || /database_url|unavailable|could not/i.test(importResult))) {
    const debug = await page.evaluate(() => ({
      alerts: [...document.querySelectorAll(".alert")].map((item) => item.textContent?.trim()),
      rows: [...document.querySelectorAll(".job-row")].map((item) => item.textContent?.trim()),
      buttons: [...document.querySelectorAll("button")].map((item) => ({
        text: item.textContent?.replace(/\s+/g, " ").trim(),
        disabled: item.hasAttribute("disabled")
      })).filter((item) => /import|prepare|save|skip|archive|inactive/i.test(item.text || ""))
    }));
    throw new Error(`Prepare action or controlled storage error must be visible. Debug: ${JSON.stringify(debug, null, 2)}`);
  }
  if (prepareVisible > 0 && !prepareAlreadyRunning) {
    await prepareButton.click();
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return /Application package ready|OPENAI_API_KEY is not configured|Preparation failed|CV scoring failed|Cover letter generation failed|Set a Master CV/i.test(text);
    }, null, { timeout: 180000 });
    prepareResult = await firstVisibleText(page, [".alert--success", ".alert--error", ".detail-note"]);
    const afterPrepareText = await page.locator("body").innerText();
    assert(
      /Application package ready|OPENAI_API_KEY|Preparation failed|CV scoring failed|Cover letter generation failed|Set a Master CV/i.test(afterPrepareText),
      "Prepare should either complete the package or show a controlled error."
    );
  }

  const aiTransparencyLabels = [
    /prepare full application/i,
    /gpt points/i,
    /improved cv json/i,
    /cover letter review/i
  ];
  const bodyText = await page.locator("body").innerText();
  for (const label of aiTransparencyLabels) {
    assert(label.test(bodyText), `Missing AI transparency copy: ${label}`);
  }

  await page.locator("summary", { hasText: "Layout controls" }).click();
  const lineGap = page.locator("label", { hasText: "Line gap" }).locator("input");
  assert(await lineGap.count(), "Line gap control should exist.");
  await lineGap.fill("8");
  const lineGapState = await page.locator("#cv-preview").evaluate((el) => getComputedStyle(el).getPropertyValue("--cv-line-gap").trim());
  assert(lineGapState === "8px", `Line gap should update CV CSS variable. Got: ${lineGapState}`);

  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: "$JCODE_SCRATCH_DIR/qa-mobile.png", fullPage: true });
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(horizontalOverflow < 24, `Mobile should not have major horizontal overflow. Got ${horizontalOverflow}px.`);

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    importResult,
    prepareResult,
    lineGapState,
    horizontalOverflow,
    screenshots: ["$JCODE_SCRATCH_DIR/qa-desktop.png", "$JCODE_SCRATCH_DIR/qa-mobile.png"]
  }, null, 2));
} finally {
  await browser.close();
}

async function expectButtonEnabled(locator, message) {
  assert(await locator.count(), message);
  const disabled = await locator.first().isDisabled();
  assert(!disabled, message);
}
