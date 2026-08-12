import { expect, test } from "bun:test";
import { chromium, webkit } from "playwright";

import { serveBuiltWebExample } from "../scripts/serve.mjs";

declare global {
  interface Window {
    __swiftTUIScrollFixtureFrames?: number;
  }
}

type ScrollFixtureMode = "none" | "headroom" | "edge";

const browserLanes = [
  { name: "Chromium", launch: () => chromium.launch() },
  { name: "WebKit", launch: () => webkit.launch() },
];

const scenarios: Array<{
  mode: ScrollFixtureMode;
  parentShouldScroll: boolean;
}> = [
  { mode: "none", parentShouldScroll: true },
  { mode: "headroom", parentShouldScroll: false },
  { mode: "edge", parentShouldScroll: true },
];

test("embedded WebHost wheels chain to the outer page only without inner headroom", async () => {
  const server = await serveBuiltWebExample({ includeScrollChainHarness: true });

  try {
    for (const browserLane of browserLanes) {
      const browser = await browserLane.launch();
      try {
        for (const scenario of scenarios) {
          const context = await browser.newContext({
            viewport: { width: 1000, height: 800 },
          });
          try {
            await context.addInitScript(() => {
              const originalParse = JSON.parse;
              window.__swiftTUIScrollFixtureFrames = 0;

              JSON.parse = function patchedJSONParse(
                text: string,
                reviver?: Parameters<typeof JSON.parse>[1],
              ) {
                const value = originalParse.call(this, text, reviver);
                const frame = value as {
                  width?: unknown;
                  height?: unknown;
                  rows?: unknown;
                  deltaRows?: unknown;
                  scrollRegions?: unknown;
                };
                const mode = new URLSearchParams(window.location.search)
                  .get("scrollChainFixture");
                if (
                  !frame
                  || typeof frame !== "object"
                  || typeof frame.width !== "number"
                  || typeof frame.height !== "number"
                  || (!Array.isArray(frame.rows) && !Array.isArray(frame.deltaRows))
                  || !mode
                ) {
                  return value;
                }

                if (mode === "none") {
                  delete frame.scrollRegions;
                } else {
                  const overflow = 20;
                  const width = frame.width;
                  const height = frame.height;
                  frame.scrollRegions = [{
                    id: "browser-scroll-chain-fixture",
                    rect: [0, 0, width, height],
                    offset: [0, mode === "edge" ? overflow : 0],
                    content: [width, height + overflow],
                  }];
                }
                window.__swiftTUIScrollFixtureFrames =
                  (window.__swiftTUIScrollFixtureFrames ?? 0) + 1;
                return value;
              };
            });

            const page = await context.newPage();
            const harnessURL = new URL("/__scroll-chain-harness", server.url);
            harnessURL.searchParams.set("mode", scenario.mode);
            await page.goto(harnessURL.href, { waitUntil: "domcontentloaded" });

            const iframe = page.locator("iframe");
            await iframe.waitFor({ state: "visible", timeout: 30_000 });
            const childFrame = page.frames().find((frame) => frame.parentFrame() !== null);
            if (!childFrame) {
              throw new Error(`${browserLane.name}: scroll-chain iframe did not attach`);
            }
            await childFrame.waitForSelector(".webhost-scene__surface", {
              state: "attached",
              timeout: 60_000,
            });
            await childFrame.waitForFunction(
              () => (window.__swiftTUIScrollFixtureFrames ?? 0) > 0,
              undefined,
              { timeout: 60_000 },
            );

            const iframeBounds = await iframe.boundingBox();
            if (!iframeBounds) {
              throw new Error(`${browserLane.name}: scroll-chain iframe has no bounds`);
            }
            await page.mouse.move(
              iframeBounds.x + iframeBounds.width / 2,
              iframeBounds.y + iframeBounds.height / 2,
            );
            await page.mouse.wheel(0, 400);

            if (scenario.parentShouldScroll) {
              await page.waitForFunction(() => window.scrollY > 0, undefined, {
                timeout: 5_000,
              });
              expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
            } else {
              await page.waitForTimeout(250);
              expect(await page.evaluate(() => window.scrollY)).toBe(0);
            }
          } finally {
            await context.close();
          }
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    server.stop(true);
  }
}, 480_000);
