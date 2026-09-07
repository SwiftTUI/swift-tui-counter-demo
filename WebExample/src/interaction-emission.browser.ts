import { chromium, expect, test, type Browser } from "@playwright/test";

import { serveBuiltWebExample } from "../scripts/serve.mjs";
import { installCounterFigureProbe } from "./counter-figure-probe.ts";

declare global {
  interface Window {
    __swiftTUICounterProbe?: {
      frameCount: number;
      count: number | undefined;
    };
  }
}

const lanes = [
  "",
  "leanProfile=0&renderMode=async&presentedProgressGuard=0",
  "leanProfile=0&renderMode=async&presentedProgressGuard=1",
  "leanProfile=0&renderMode=async-no-cancel&executionMode=main-thread",
  "leanProfile=1&leanReuse=1",
];

test("counter interactions commit across runtime profiles and render modes", async () => {
  test.setTimeout(200_000);
  const server = await serveBuiltWebExample();
  const browser = await chromium.launch();
  try {
    for (const query of lanes) {
      console.info(`counter interaction lane: ${query || "default"}`);
      await expectCounterSequence(server.url.href, browser, query);
    }
  } finally {
    await browser.close();
    server.stop(true);
  }
});

async function expectCounterSequence(
  baseURL: string,
  browser: Browser,
  query: string,
): Promise<void> {
  const context = await browser.newContext({
    viewport: { width: 1100, height: 760 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await installCounterFigureProbe(page);
  await page.addInitScript(() => {
    const originalParse = JSON.parse;
    const probe = { frameCount: 0, count: undefined as number | undefined };
    let rows: WebHostSurfaceCell[][] = [];
    Object.defineProperty(window, "__swiftTUICounterProbe", {
      configurable: true,
      value: probe,
    });

    JSON.parse = function patchedJSONParse(
      text: string,
      reviver?: Parameters<typeof JSON.parse>[1],
    ) {
      const value = originalParse.call(this, text, reviver);
      const frame = value as {
        width?: unknown;
        height?: unknown;
        rows?: WebHostSurfaceCell[][];
        deltaRows?: [number, WebHostSurfaceCell[]][];
        encoding?: unknown;
      };
      if (
        frame &&
        typeof frame === "object" &&
        typeof frame.width === "number" &&
        typeof frame.height === "number"
      ) {
        if (Array.isArray(frame.rows)) rows = frame.rows.slice();
        else if (frame.encoding === "delta" && Array.isArray(frame.deltaRows)) {
          for (const [index, row] of frame.deltaRows) rows[index] = row;
        }
        probe.frameCount += 1;
        const count = window.__swiftTUICounterValue?.(rows.map(rowText));
        probe.count = count ?? probe.count;
      }
      return value;
    };

    function rowText(row: WebHostSurfaceCell[]): string {
      let output = "";
      let cursor = 0;
      for (const [column, cellText, span] of row ?? []) {
        if (column > cursor) output += " ".repeat(column - cursor);
        output += cellText;
        cursor = column + Math.max(1, span);
      }
      return output;
    }
  });

  try {
    const url = query ? `${baseURL}?${query}` : baseURL;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[role="button"][data-focused="true"]', {
      state: "attached",
      timeout: 30_000,
    });
    await page.waitForFunction(
      () => window.__swiftTUICounterProbe?.count === 0,
      undefined,
      { polling: 100, timeout: 30_000 },
    );

    const increment = page.getByRole("button");
    for (let expected = 1; expected <= 8; expected += 1) {
      await increment.press("Enter");
      await page.waitForFunction(
        (count) => window.__swiftTUICounterProbe?.count === count,
        expected,
        { polling: 100, timeout: 30_000 },
      );
    }

    const result = await page.evaluate(() => window.__swiftTUICounterProbe);
    expect(result?.count).toBe(8);
    expect(result?.frameCount ?? 0).toBeGreaterThanOrEqual(9);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
}

type WebHostSurfaceCell = [
  column: number,
  text: string,
  span: number,
  style: number,
];
