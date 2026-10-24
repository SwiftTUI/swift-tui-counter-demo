// D1 adversarial corpus (swift-tui-org adversarial campaign two, STUI-1159):
// conservation of counter activations under adversarial input sequences.
// Every case decodes the painted FIGlet count from the surface frames (the far
// end of browser event → wire record → shared stdin ring → WASI → RunLoop →
// Button action → @State → TextFigure raster), never the input it sent.
//
// Contracts: plan 2026-09-24-001 §5 (exactly N activations; no lost or
// duplicate activations; no page or console error; sustained bursts give exact
// eventual counts), the demo README ("Click, or press Space or Return"), and
// SwiftUI Button semantics (primary press released inside the control
// activates; a release outside cancels), which the framework implements in
// RunLoop+PointerHandling.swift (release pairs with the armed press).
//
// Known-issue guard: bun:test and Playwright have no `withKnownIssue`, so a
// reproduced finding wraps ONLY its failing expectation in `d1KnownIssue`; the
// suite stays green, prints a `D1_KNOWN_ASSERTION` line, and fails loudly once
// the expectation passes again. D1_UNMARKED=1 runs every guard unwrapped.
import {
  type Browser,
  type BrowserContext,
  chromium,
  expect,
  type Page,
  test,
} from "@playwright/test";

import { serveBuiltWebExample } from "../scripts/serve.mjs";
import { installCounterFigureProbe } from "./counter-figure-probe.ts";

interface D1Probe {
  frameCount: number;
  count: number | undefined;
  pointerDowns: number;
  pointerUps: number;
  keyDowns: number;
  /** Canvas-space position of the painted "Increment" label (see repro.mjs). */
  incrementPaint?: { x: number; y: number };
}

declare global {
  interface Window {
    __d1Probe?: D1Probe;
  }
}

type WebHostSurfaceCell = [
  column: number,
  text: string,
  span: number,
  style: number,
];

const queueDeadlinePattern = /web\.input\.queueDeadlineExceeded|Dropped \d+ byte\(s\) of terminal input|dropped \d+/;

function d1KnownIssue(id: string, note: string, expectation: () => void): void {
  if (process.env.D1_UNMARKED === "1") {
    expectation();
    return;
  }
  try {
    expectation();
  } catch (error) {
    const observed = (error instanceof Error ? error.message : String(error))
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(" | ");
    console.log(`D1_KNOWN_ASSERTION ${id}: ${note}; observed: ${observed}`);
    return;
  }
  throw new Error(
    `${id}: the guarded expectation passed, so the known issue no longer reproduces (${note}). Remove the d1KnownIssue wrapper.`,
  );
}

interface CounterPage {
  page: Page;
  context: BrowserContext;
  errors: string[];
  warnings: string[];
  count(): Promise<number | undefined>;
  probe(): Promise<D1Probe | undefined>;
  waitForCount(expected: number, timeoutMilliseconds: number): Promise<number | undefined>;
  buttonCenter(): Promise<{ x: number; y: number }>;
  /** A pointer click on the painted Increment label (primary unless told otherwise). */
  click(options?: { button?: "left" | "right" | "middle" }): Promise<void>;
  blankPoint(): Promise<{ x: number; y: number }>;
  dispatchEnter(times: number): Promise<void>;
}

async function openCounter(browser: Browser, baseURL: string): Promise<CounterPage> {
  const context = await browser.newContext({ viewport: { width: 1100, height: 760 } });
  const page = await context.newPage();
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
    if (message.type() === "warning") warnings.push(message.text());
  });

  await installCounterFigureProbe(page);
  await page.addInitScript(() => {
    const originalParse = JSON.parse;
    const probe: D1Probe = {
      frameCount: 0,
      count: undefined,
      pointerDowns: 0,
      pointerUps: 0,
      keyDowns: 0,
    };
    let rows: WebHostSurfaceCell[][] = [];
    Object.defineProperty(window, "__d1Probe", { configurable: true, value: probe });
    document.addEventListener("pointerdown", () => { probe.pointerDowns += 1; }, { capture: true });
    document.addEventListener("pointerup", () => { probe.pointerUps += 1; }, { capture: true });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") probe.keyDowns += 1;
    }, { capture: true });
    // The accessibility sidecar is not "visible" to Playwright's actionability
    // checks, so pointer cases target the painted label the way the root's
    // counter-burst harness does: intercept the canvas fillText of "Increment".
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function patchedFillText(
      text: string,
      x: number,
      y: number,
      ...rest: [number?]
    ) {
      if (text === "I" || text === "Increment") {
        const size = Number(/([0-9.]+)px/.exec(this.font)?.[1] ?? 16);
        const point = new DOMPoint(
          x + this.measureText("W").width * 0.5,
          y - size * 0.35,
        ).matrixTransform(this.getTransform());
        probe.incrementPaint = { x: point.x, y: point.y };
      }
      return fillText.call(this, text, x, y, ...rest);
    };

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

  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[role="button"][data-focused="true"]', {
    state: "attached",
    timeout: 30_000,
  });
  await page.waitForFunction(
    () => window.__d1Probe?.count === 0,
    undefined,
    { polling: 100, timeout: 30_000 },
  );

  const count = () => page.evaluate(() => window.__d1Probe?.count);
  const probe = () => page.evaluate(() => window.__d1Probe);
  const buttonCenter = () =>
    page.evaluate(() => {
      const paint = window.__d1Probe?.incrementPaint;
      const canvas = document.querySelector<HTMLCanvasElement>("canvas.webhost-scene__surface");
      if (!paint || !canvas) throw new Error("the painted Increment control was not found");
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.x + (paint.x * rect.width) / canvas.width,
        y: rect.y + (paint.y * rect.height) / canvas.height,
      };
    });
  return {
    page,
    context,
    errors,
    warnings,
    count,
    probe,
    async waitForCount(expected, timeoutMilliseconds) {
      try {
        await page.waitForFunction(
          (target) => window.__d1Probe?.count === target,
          expected,
          { polling: 200, timeout: timeoutMilliseconds },
        );
      } catch {
        // Fall through and report the count that was reached.
      }
      return count();
    },
    buttonCenter,
    async click(options?: { button?: "left" | "right" | "middle" }) {
      const center = await buttonCenter();
      await page.mouse.click(center.x, center.y, options);
    },
    async blankPoint() {
      const box = await page.locator("canvas.webhost-scene__surface").boundingBox();
      if (!box) throw new Error("the surface canvas has no bounding box");
      // The counter is centred; the top-left cell of the surface is blank.
      return { x: box.x + 6, y: box.y + 6 };
    },
    async dispatchEnter(times) {
      // Synthetic keydown events on the focused control, inside one task, so
      // the host encodes them back to back (WebHostSceneRuntime handleKeyDown
      // has no isTrusted filter). Bubbling reaches the mount's listener.
      await page.evaluate((n) => {
        const control = document.querySelector<HTMLElement>('[role="button"]');
        const target = control ?? document.activeElement ?? document.body;
        for (let index = 0; index < n; index += 1) {
          target.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              bubbles: true,
              cancelable: true,
              composed: true,
            }),
          );
        }
      }, times);
    },
  };
}

async function withCounter(
  run: (counter: CounterPage) => Promise<void>,
): Promise<void> {
  const server = await serveBuiltWebExample();
  const browser = await chromium.launch();
  let counter: CounterPage | undefined;
  try {
    counter = await openCounter(browser, server.url.href);
    await run(counter);
  } finally {
    await counter?.context.close();
    await browser.close();
    server.stop(true);
  }
}

test("d1s018 a back-to-back pointer burst conserves every activation", async () => {
  test.setTimeout(120_000);
  await withCounter(async (counter) => {
    const startedAt = Date.now();
    for (let index = 0; index < 40; index += 1) {
      await counter.click();
    }
    const burstMs = Date.now() - startedAt;
    const reached = await counter.waitForCount(40, 60_000);
    console.log(`d1s018 burst of 40 clicks in ${burstMs} ms; painted ${reached}`);
    expect(reached).toBe(40);
    expect(counter.warnings.filter((text) => queueDeadlinePattern.test(text))).toEqual([]);
    expect(counter.errors).toEqual([]);
  });
});

test("d1s019 press inside release outside does not activate", async () => {
  test.setTimeout(120_000);
  await withCounter(async (counter) => {
    const center = await counter.buttonCenter();
    const blank = await counter.blankPoint();
    const { mouse } = counter.page;
    await mouse.move(center.x, center.y);
    await mouse.down();
    await mouse.move(blank.x, blank.y, { steps: 4 });
    await mouse.up();
    // The frame after a cancelled press must still show 0; give the runtime a
    // frame's worth of time by waiting for a later, ordinary activation first.
    await counter.click();
    const reached = await counter.waitForCount(1, 30_000);
    const probe = await counter.probe();
    console.log(`d1s019 after cancelled press + one click: painted ${reached}; events ${JSON.stringify(probe)}`);
    expect(reached).toBe(1);
    expect(counter.errors).toEqual([]);
  });
});

test("d1s020 a duplicated release record activates once", async () => {
  test.setTimeout(120_000);
  await withCounter(async (counter) => {
    const center = await counter.buttonCenter();
    const { page } = counter;
    const { mouse } = page;
    await mouse.move(center.x, center.y);
    await mouse.down();
    await mouse.up();
    // A second release for the same, already released press: once through
    // the browser's input pipeline and once as a synthetic pointer event
    // dispatched at the same point (the host encodes it at :689-700).
    await mouse.up();
    await page.evaluate(({ x, y }) => {
      const target = document.elementFromPoint(x, y) ?? document.body;
      target.dispatchEvent(
        new PointerEvent("pointerup", {
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: 0,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
    }, center);
    const reached = await counter.waitForCount(1, 30_000);
    const probe = await counter.probe();
    console.log(`d1s020 one press, three releases: painted ${reached}; events ${JSON.stringify(probe)}`);
    expect(probe?.pointerUps ?? 0).toBeGreaterThanOrEqual(2);
    expect(reached).toBe(1);
    // A later ordinary click still works and lands on exactly 2.
    await counter.click();
    expect(await counter.waitForCount(2, 30_000)).toBe(2);
    expect(counter.errors).toEqual([]);
  });
});

test("d1s021 a doubled press followed by one release activates once", async () => {
  test.setTimeout(120_000);
  await withCounter(async (counter) => {
    const center = await counter.buttonCenter();
    const { page } = counter;
    const { mouse } = page;
    await mouse.move(center.x, center.y);
    await mouse.down();
    await mouse.down();
    await mouse.up();
    const reached = await counter.waitForCount(1, 30_000);
    const probe = await counter.probe();
    console.log(`d1s021 two presses, one release: painted ${reached}; events ${JSON.stringify(probe)}`);
    expect(reached).toBe(1);
    await counter.click();
    expect(await counter.waitForCount(2, 30_000)).toBe(2);
    expect(counter.errors).toEqual([]);
  });
});

test("d1s022 a same-task keyboard burst inside the ring capacity conserves every activation", async () => {
  test.setTimeout(150_000);
  await withCounter(async (counter) => {
    // Precondition: a single synthetic Enter reaches the runtime.
    await counter.dispatchEnter(1);
    expect(await counter.waitForCount(1, 20_000)).toBe(1);
    const startedAt = Date.now();
    await counter.dispatchEnter(149);
    const reached = await counter.waitForCount(150, 90_000);
    const probe = await counter.probe();
    console.log(
      `d1s022 150 Enter keydowns in one task: painted ${reached} after ${Date.now() - startedAt} ms; keydowns seen ${probe?.keyDowns}; warnings ${JSON.stringify(counter.warnings)}`,
    );
    expect(probe?.keyDowns).toBe(150);
    expect(counter.warnings.filter((text) => queueDeadlinePattern.test(text))).toEqual([]);
    expect(reached).toBe(150);
    expect(counter.errors).toEqual([]);
  });
});

test("d1s023 a same-task keyboard burst larger than the ring is delivered without drops", async () => {
  // Hypothesis d1s023 predicted a `web.input.queueDeadlineExceeded` drop once
  // the 64 KiB shared stdin ring overflowed; the unmarked run refuted it (the
  // reader drains between frames and batched dispatch coalesces the
  // increments), so this case pins the conservation that held.
  test.setTimeout(240_000);
  await withCounter(async (counter) => {
    const total = 5000;
    await counter.dispatchEnter(1);
    expect(await counter.waitForCount(1, 20_000)).toBe(1);
    const startedAt = Date.now();
    await counter.dispatchEnter(total - 1);
    // Wait for the exact count, or until a drop has been reported and the
    // painted count has had 20 s more to settle, whichever comes first.
    let reached = await counter.count();
    let dropSeenAt: number | undefined;
    const deadline = startedAt + 150_000;
    while (Date.now() < deadline) {
      reached = await counter.waitForCount(total, 1_000);
      if (reached === total) break;
      if (dropSeenAt === undefined && counter.warnings.some((text) => queueDeadlinePattern.test(text))) {
        dropSeenAt = Date.now();
      }
      if (dropSeenAt !== undefined && Date.now() - dropSeenAt > 20_000) break;
    }
    const probe = await counter.probe();
    const drops = counter.warnings.filter((text) => queueDeadlinePattern.test(text));
    console.log(
      `d1s023 ${total} Enter keydowns in one task: painted ${reached} after ${Date.now() - startedAt} ms; frames ${probe?.frameCount}; keydowns seen ${probe?.keyDowns}; drop warnings ${JSON.stringify(drops)}; errors ${JSON.stringify(counter.errors)}`,
    );
    expect(probe?.keyDowns).toBe(total);
    expect(drops).toEqual([]);
    expect(reached).toBe(total);
    expect(counter.errors).toEqual([]);
  });
});

test("d1s024 interleaved pointer Return and Space sources conserve every activation", async () => {
  test.setTimeout(120_000);
  await withCounter(async (counter) => {
    const increment = counter.page.getByRole("button");
    for (let round = 0; round < 10; round += 1) {
      await counter.click();
      await increment.press("Enter");
      await increment.press(" ");
    }
    const reached = await counter.waitForCount(30, 60_000);
    const probe = await counter.probe();
    console.log(`d1s024 10 x (click, Enter, Space): painted ${reached}; events ${JSON.stringify(probe)}`);
    expect(reached).toBe(30);
    expect(counter.errors).toEqual([]);
  });
});

test("d1s025 secondary and middle buttons do not activate", async () => {
  test.setTimeout(120_000);
  await withCounter(async (counter) => {
    await counter.click({ button: "right" });
    await counter.click({ button: "middle" });
    // Settle through an ordinary activation so a late secondary activation
    // would show up as 2 or 3 rather than hide behind a still-pending frame.
    await counter.click();
    const reached = await counter.waitForCount(1, 30_000);
    const probe = await counter.probe();
    console.log(`d1s025 right, middle, then primary click: painted ${reached}; events ${JSON.stringify(probe)}`);
    expect(reached).toBe(1);
    expect(counter.errors).toEqual([]);
  });
});
