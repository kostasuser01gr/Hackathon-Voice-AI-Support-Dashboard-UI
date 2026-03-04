import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const targetUrl =
  process.env.CLOUDRUN_URL ??
  "https://voice-to-action-agent-zbluqfbniq-ew.a.run.app";
const screenshotPath = "artifacts/smoke.png";

async function run() {
  await mkdir("artifacts", { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleEntries: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    const text = `${message.type()}: ${message.text()}`;
    consoleEntries.push(text);
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? error.message);
  });

  try {
    const response = await page.goto(targetUrl, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    const status = response?.status() ?? 0;
    if (status < 200 || status >= 400) {
      throw new Error(`Expected HTTP 2xx/3xx but got ${status}`);
    }

    await page.waitForTimeout(1_000);

    const bodyText = await page.locator("body").innerText();
    const hasExceptionBanner = bodyText
      .toLowerCase()
      .includes("application error: a client-side exception");
    if (hasExceptionBanner) {
      throw new Error(
        "Found client-side exception banner text on rendered page.",
      );
    }

    const badConsoleEntries = consoleEntries.filter((entry) =>
      /(Uncaught|TypeError|ReferenceError)/i.test(entry),
    );
    if (badConsoleEntries.length > 0) {
      throw new Error(
        `Detected bad console entries: ${badConsoleEntries.join(" | ")}`,
      );
    }

    if (pageErrors.length > 0) {
      throw new Error(`Detected page errors: ${pageErrors.join(" | ")}`);
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Smoke test passed for ${targetUrl}`);
    console.log(`Saved screenshot: ${screenshotPath}`);
  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error(`Smoke test failed for ${targetUrl}`);
    console.error(`Saved screenshot: ${screenshotPath}`);
    if (consoleEntries.length > 0) {
      console.error("Console output:");
      for (const entry of consoleEntries) {
        console.error(entry);
      }
    }
    if (pageErrors.length > 0) {
      console.error("Page errors:");
      for (const entry of pageErrors) {
        console.error(entry);
      }
    }
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
