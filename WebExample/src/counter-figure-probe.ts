import type { Page } from "@playwright/test";

declare global {
  interface Window {
    __swiftTUICounterValue?: (rows: string[]) => number | undefined;
    __swiftTUICounterCount?: number;
  }
}

// Independent expected glyphs from CounterView's public .future FIGlet font.
// The font uses three-column, unsmushed digits. Decode painted rows rather
// than inferring application state from the activation events sent by tests.
export function counterValueFromRows(rows: string[]): number | undefined {
  const figures = [
    ["┏━┓", "┃┃┃", "┗━┛"], ["╺┓ ", " ┃ ", "╺┻╸"],
    ["┏━┓", "┏━┛", "┗━╸"], ["┏━┓", "╺━┫", "┗━┛"],
    ["╻ ╻", "┗━┫", "  ╹"], ["┏━╸", "┗━┓", "┗━┛"],
    ["┏━┓", "┣━┓", "┗━┛"], ["┏━┓", "  ┃", "  ╹"],
    ["┏━┓", "┣━┫", "┗━┛"], ["┏━┓", "┗━┫", "┗━┛"],
  ];
  for (let row = 0; row + 2 < rows.length; row += 1) {
    const lines = rows.slice(row, row + 3);
    const firstColumns = lines.map((line) => line.search(/\S/));
    if (firstColumns.some((column) => column < 0)) continue;
    const start = Math.min(...firstColumns);
    const end = Math.max(...lines.map((line) => line.trimEnd().length));
    if ((end - start) % 3 !== 0) continue;
    let digits = "";
    for (let column = start; column < end; column += 3) {
      const digit = figures.findIndex((figure) => figure.every((line, offset) =>
        lines[offset]?.slice(column, column + 3).padEnd(3) === line));
      if (digit < 0) { digits = ""; break; }
      digits += digit;
    }
    const value = Number(digits);
    if (digits && Number.isSafeInteger(value)) return value;
  }
  return undefined;
}

export async function installCounterFigureProbe(page: Page): Promise<void> {
  await page.addInitScript({
    content: `window.__swiftTUICounterValue = ${counterValueFromRows.toString()};`,
  });
}
