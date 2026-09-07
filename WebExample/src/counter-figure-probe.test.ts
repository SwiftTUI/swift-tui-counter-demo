import { expect, test } from "bun:test";
import { counterValueFromRows } from "./counter-figure-probe.ts";

test("the counter probe recognizes painted glyphs with viewport padding", () => {
  expect(counterValueFromRows(["", "    ┏━┓  ", "    ┃┃┃  ", "    ┗━┛  ", "Increment"])).toBe(0);
  expect(counterValueFromRows(["    ╺┓   ", "     ┃  ", "    ╺┻╸ "])).toBe(1);
});

test("obsolete text, missing rows and mixed glyph generations cannot pass", () => {
  expect(counterValueFromRows(["Count: 1"])).toBeUndefined();
  expect(counterValueFromRows(["╺┓", "┃"])).toBeUndefined();
  expect(counterValueFromRows(["╺┓", "┃┃┃", "┗━┛"])).toBeUndefined();
});

test("counter journeys recognize multidigit painted values through twenty", () => {
  expect(counterValueFromRows(["    ╺┓ ┏━┓  ", "     ┃ ┃┃┃  ", "    ╺┻╸┗━┛  "])).toBe(10);
  expect(counterValueFromRows(["  ┏━┓┏━┓ ", "  ┏━┛┃┃┃ ", "  ┗━╸┗━┛ "])).toBe(20);
  expect(counterValueFromRows(["  ╺┓ ╺┓  ", "   ┃  ┃  ", "  ╺┻╸╺┻╸ "])).toBe(11);
  expect(counterValueFromRows(["  ┏━┓┏━┓ ", "  ┏━┛┃┃┃ ", "  ┗━╸╺┻╸ "])).toBeUndefined();
});
