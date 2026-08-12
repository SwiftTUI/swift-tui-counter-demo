import { expect, test } from "bun:test";
import { chromium } from "playwright";

import { serveBuiltWebExample } from "../scripts/serve.mjs";

declare global {
  interface Window {
    __swiftTUICounterFrames?: CounterFrame[];
  }
}

interface CounterFrame {
  timestamp: number;
  count: number;
}

test("WebExample commits every authored counter activation in order", async () => {
  const server = await serveBuiltWebExample();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  await page.addInitScript(() => {
    const originalParse = JSON.parse;
    const samples: CounterFrame[] = [];
    let rows: WebHostSurfaceCell[][] = [];
    Object.defineProperty(window, "__swiftTUICounterFrames", {
      configurable: true,
      value: samples,
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
        const match = rows.map(rowText).join("\n").match(/\bCount:\s*(\d+)/);
        if (match) {
          samples.push({
            timestamp: performance.now(),
            count: Number(match[1]),
          });
        }
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
    await page.goto(server.url.href, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[role="button"][data-focused="true"]', {
      state: "attached",
      timeout: 30_000,
    });
    await page.waitForFunction(
      () => window.__swiftTUICounterFrames?.some((sample) => sample.count === 0),
      undefined,
      { polling: 100, timeout: 30_000 },
    );

    const increment = page.locator('[role="button"][data-focused="true"]');
    for (let expected = 1; expected <= 6; expected += 1) {
      await increment.press("Enter");
      await page.waitForFunction(
        (count) =>
          window.__swiftTUICounterFrames?.some((sample) => sample.count === count),
        expected,
        { polling: 100, timeout: 30_000 },
      );
    }

    const counts = await page.evaluate(() => [
      ...new Set((window.__swiftTUICounterFrames ?? []).map((sample) => sample.count)),
    ]);
    expect(counts).toEqual([0, 1, 2, 3, 4, 5, 6]);
  } finally {
    await page.close();
    await browser.close();
    server.stop(true);
  }
}, 120_000);

type WebHostSurfaceCell = [
  column: number,
  text: string,
  span: number,
  style: number,
];
