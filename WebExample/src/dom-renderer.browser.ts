import { chromium, expect, test, webkit } from "@playwright/test";
import { serveBuiltWebExample } from "../scripts/serve.mjs";

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  test(`DOM counter loads, increments, resizes and respects text-selection boundaries in ${name}`, async () => {
    test.setTimeout(120_000);
    const server = await serveBuiltWebExample();
    let browser;
    try {
      browser = await engine.launch();
      const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(new URL("dom.html", server.url).href);
      await expect(page.locator('.terminal-shell[data-state="ready"]')).toBeVisible({ timeout: 60_000 });
      const surface = page.locator(".webhost-scene__surface--dom");
      await expect(surface).toContainText("Increment");
      await expect(page.locator("canvas.webhost-scene__surface")).toHaveCount(0);
      const increment = page.getByRole("button", { name: "Increment", exact: true });
      const paintedText = async () => (await surface.textContent())?.replace(/\s/g, "");
      await expect.poll(paintedText).toBe("┏━┓┃┃┃┗━┛Increment");
      // CounterView centers its button in this painted row. Click the visible
      // control: semantic sidecars older than 0.15.0 can have stale bounds.
      await surface.locator(".webhost-scene__surface-row").filter({ hasText: "Increment" }).click();
      await expect.poll(paintedText).toBe("╺┓┃╺┻╸Increment");
      await increment.press("Enter");
      await expect.poll(paintedText).toBe("┏━┓┏━┛┗━╸Increment");
      const fontSize = await surface.evaluate((element) => getComputedStyle(element).fontSize);
      await page.setViewportSize({ width: 375, height: 600 });
      await expect(increment).toBeVisible();
      await expect.poll(() => surface.evaluate((element) => getComputedStyle(element).fontSize)).toBe(fontSize);
      // This scene contains graphical FIGlet digits and a button label. Both
      // are excluded from native selection; ordinary prose selection is
      // exercised by the web package's DOM surface browser suite.
      const selected = await page.evaluate(() => {
        const surface = document.querySelector(".webhost-scene__surface--dom")!;
        const range = document.createRange();
        range.selectNodeContents(surface);
        const selection = document.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        return {
          text: selection.toString(),
          painted: surface.textContent?.replace(/\s/g, ""),
        };
      });
      expect(selected.painted).toBe("┏━┓┏━┛┗━╸Increment");
      expect(selected.text.trim()).toBe("");
      expect(errors).toEqual([]);
    } finally {
      await browser?.close();
      server.stop(true);
    }
  });
}
