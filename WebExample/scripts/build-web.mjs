// Bundles the browser front end with esbuild and assembles the deployable
// directories:
//
//   dist/        the web bundle: index.html, dom.html, index.js, index.css, and the
//                wasm scene worker
//   pages-dist/  dist/ plus TerminalApp/dist/ — the exact layout the public
//                website deploys under /webexample/
//
// The script runs on Node 18+ or Bun; any npm setup can invoke it. Pass
// --dev to skip minification, or --renderer=dom for a DOM default page.
// Run scripts/build-terminal.mjs first; this
// script only packages what that build produced.

import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import * as SwiftTUIBuild from "@swifttui/build";
import { rendererFromArgs } from "./renderer.mjs";
import { fail, note, step } from "./term-style.mjs";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const sourceDirectory = resolve(scriptsDirectory, "../src");
const webDist = resolve(scriptsDirectory, "../dist");
const terminalAppDist = resolve(scriptsDirectory, "../TerminalApp/dist");
const pagesDist = resolve(scriptsDirectory, "../pages-dist");

/**
 * esbuild options for the two browser entry points. The front end bundle
 * emits dist/index.js plus dist/index.css (esbuild collects the imported
 * CSS); the worker bundles separately because the browser loads it by URL.
 * @param {{ dev?: boolean }} options
 */
export function bundleOptionSets({ dev = false } = {}) {
  const shared = {
    bundle: true,
    format: "esm",
    target: "es2022",
    minify: !dev,
    logLevel: "warning",
  };

  return [
    {
      ...shared,
      entryPoints: [join(sourceDirectory, "frontend.ts")],
      outfile: join(webDist, "index.js"),
      sourcemap: true,
    },
    {
      ...shared,
      entryPoints: [join(sourceDirectory, "wasm-scene-worker.ts")],
      outfile: join(webDist, "wasm-scene-worker.js"),
    },
  ];
}

/**
 * Write the default and DOM pages from src/index.html, pointed at the bundled
 * assets instead of the TypeScript sources.
 */
export async function writeIndexHtml({ renderer = "canvas" } = {}) {
  const source = await readFile(join(sourceDirectory, "index.html"), "utf8");
  const withScript = mustReplace(
    source,
    '<script type="module" src="./frontend.ts"></script>',
    '<script type="module" src="./index.js"></script>',
  );
  const withStylesheet = mustReplace(
    withScript,
    "</head>",
    '  <link rel="stylesheet" href="./index.css" />\n  </head>',
  );
  await mkdir(webDist, { recursive: true });
  const pageFor = (mode) => mustReplace(
    withStylesheet,
    '<div id="root"></div>',
    `<div id="root" data-renderer="${mode}"></div>`,
  );
  await writeFile(join(webDist, "index.html"), pageFor(renderer));
  // Both pages use the same JS, worker, manifest and WASM artifact.
  await writeFile(join(webDist, "dom.html"), pageFor("dom"));
}

/**
 * Copy dist/ and TerminalApp/dist/ into pages-dist/, the layout the website
 * repository deploys.
 */
export async function composePagesDist() {
  if (!existsSync(join(terminalAppDist, "assets", "app.wasm"))) {
    fail(
      "TerminalApp/dist/assets/app.wasm is missing.",
      "Run 'node scripts/build-terminal.mjs' (or 'npm run build') first.",
    );
  }

  const pagesTerminalAppDist = join(pagesDist, "TerminalApp", "dist");
  await rm(pagesDist, { recursive: true, force: true });
  await mkdir(pagesTerminalAppDist, { recursive: true });
  await cp(webDist, pagesDist, { recursive: true });
  await cp(terminalAppDist, pagesTerminalAppDist, { recursive: true });
  await writeFile(join(pagesDist, ".nojekyll"), "");
}

function mustReplace(text, from, to) {
  if (!text.includes(from)) {
    fail(
      `src/index.html no longer contains the expected marker: ${from}`,
      "Update scripts/build-web.mjs to match the new markup.",
    );
  }
  return text.replace(from, to);
}

const isMainScript =
  process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainScript) {
  const dev = process.argv.includes("--dev");
  const renderer = rendererFromArgs(process.argv.slice(2));
  const startedAt = Date.now();

  step(`Bundle the front end (${dev ? "development" : "release"})`);
  await rm(webDist, { recursive: true, force: true });
  for (const options of bundleOptionSets({ dev })) {
    await esbuild.build(options);
  }
  await writeIndexHtml({ renderer });
  // New runtime packages ship the DOM font profile with the WASM assets.
  // The released 0.14.0 builder predates these assets and remains supported.
  if (typeof SwiftTUIBuild.copyDomFontAssets === "function") {
    await SwiftTUIBuild.copyDomFontAssets(terminalAppDist);
  }
  note(`dist/: index.html (${renderer}), dom.html, index.js, index.css, wasm-scene-worker.js`);

  step("Assemble pages-dist/");
  await composePagesDist();
  note("pages-dist/: the web bundle plus TerminalApp/dist/");

  step("Done");
  note(`Bundled in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
  note("Serve the result with 'npm start'.");
}
