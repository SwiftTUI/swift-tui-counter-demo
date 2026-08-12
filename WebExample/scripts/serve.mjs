// Serves the built WebExample with the required isolation headers.
//
// SwiftTUI's browser stdin uses a SharedArrayBuffer. Browsers only enable
// SharedArrayBuffer on cross-origin-isolated pages, so every response here
// carries:
//
//   Cross-Origin-Opener-Policy: same-origin
//   Cross-Origin-Embedder-Policy: require-corp
//
// Any static host works in production if it sends these two headers.
//
// The script runs on Node 18+ or Bun; any npm setup can invoke it. The
// browser tests import `serveBuiltWebExample` from this module. As a command
// it serves dist/ on PORT (default 3000); pass --watch to also rebuild the
// front-end bundle when src/ changes (refresh the browser after edits).

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const defaultTerminalAppDist = resolve(scriptsDirectory, "../TerminalApp/dist");
const defaultWebDist = resolve(scriptsDirectory, "../dist");

const isolationHeaders = {
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin",
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
};

/**
 * Start the static server. Resolves once the server listens, so `url` is
 * ready to use.
 *
 * @param {{
 *   hostname?: string,
 *   includeScrollChainHarness?: boolean,
 *   port?: number,
 *   terminalAppDist?: string,
 *   webDist?: string,
 * }} [options]
 * @returns {Promise<{ url: URL, stop: (force?: boolean) => void }>}
 */
export async function serveBuiltWebExample(options = {}) {
  const hostname = options.hostname ?? "127.0.0.1";
  const terminalAppDist = options.terminalAppDist ?? defaultTerminalAppDist;
  const webDist = options.webDist ?? defaultWebDist;

  const server = createServer((request, response) => {
    handleRequest(request, response, {
      includeScrollChainHarness: options.includeScrollChainHarness === true,
      terminalAppDist,
      webDist,
    }).catch(() => {
      respond(response, 500, "text/plain; charset=utf-8", "Internal error");
    });
  });

  const sockets = new Set();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise((ready) => {
    server.listen(options.port ?? 0, hostname, ready);
  });
  const address = server.address();

  return {
    url: new URL(`http://${hostname}:${address.port}/`),
    stop(force = false) {
      if (force) {
        for (const socket of sockets) {
          socket.destroy();
        }
      }
      server.close();
    },
  };
}

async function handleRequest(request, response, options) {
  const url = new URL(request.url ?? "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  if (
    options.includeScrollChainHarness
    && pathname === "/__scroll-chain-harness"
  ) {
    respond(
      response,
      200,
      "text/html; charset=utf-8",
      scrollChainHarnessHtml(url),
    );
    return;
  }

  if (pathname.startsWith("/TerminalApp/dist/")) {
    const relative = pathname.slice("/TerminalApp/dist/".length);
    await respondWithFile(
      response,
      resolveWithin(options.terminalAppDist, relative),
    );
    return;
  }

  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  await respondWithFile(response, resolveWithin(options.webDist, relative));
}

// Keep every resolved path inside its root directory. A path that escapes
// (for example with `..`) falls back to the SPA index page.
function resolveWithin(root, pathname) {
  const filePath = resolve(root, pathname);
  if (filePath === root || filePath.startsWith(`${root}${sep}`)) {
    return filePath;
  }

  return join(root, "index.html");
}

async function respondWithFile(response, filePath) {
  if (!existsSync(filePath)) {
    respond(response, 404, "text/plain; charset=utf-8", "Not found");
    return;
  }

  const body = await readFile(filePath);
  const type = contentTypes[extname(filePath)] ?? "application/octet-stream";
  respond(response, 200, type, body);
}

function respond(response, status, contentType, body) {
  response.writeHead(status, {
    ...isolationHeaders,
    "Content-Type": contentType,
  });
  response.end(body);
}

// A tall page with the demo in an iframe, used by the scroll-chaining
// browser tests to observe wheel events that leave the terminal.
function scrollChainHarnessHtml(url) {
  const requestedMode = url.searchParams.get("mode");
  const mode = requestedMode === "headroom" || requestedMode === "edge"
    ? requestedMode
    : "none";
  const iframeSource = `/?embed=marketing&scrollChainFixture=${mode}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SwiftTUI scroll-chain browser harness</title>
    <style>
      html, body { margin: 0; min-height: 100%; }
      main { min-height: 2400px; padding-top: 80px; }
      iframe { display: block; width: 720px; height: 480px; margin: 0 auto; border: 0; }
    </style>
  </head>
  <body>
    <main>
      <iframe src="${iframeSource}" title="SwiftTUI scroll-chain fixture"></iframe>
    </main>
  </body>
</html>`;
}

const isMainScript =
  process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainScript) {
  const { fail, note, step } = await import("./term-style.mjs");
  const watch = process.argv.includes("--watch");

  if (!existsSync(join(defaultTerminalAppDist, "assets", "app.wasm"))) {
    fail(
      "TerminalApp/dist/assets/app.wasm is missing.",
      "Run 'npm run build' once before serving.",
    );
  }

  if (watch) {
    step("Watch the front-end sources");
    const esbuild = await import("esbuild");
    const { bundleOptionSets, writeIndexHtml } = await import("./build-web.mjs");
    await writeIndexHtml();
    for (const options of bundleOptionSets({ dev: true })) {
      const context = await esbuild.context(options);
      await context.watch();
    }
    note("Edits under src/ rebuild automatically. Refresh the browser to load them.");
  } else if (!existsSync(join(defaultWebDist, "index.html"))) {
    fail(
      "dist/index.html is missing.",
      "Run 'npm run build' once before serving.",
    );
  }

  const server = await serveBuiltWebExample({
    port: Number(process.env.PORT ?? "3000"),
  });
  step("Serve the WebExample");
  note(`Open ${server.url}`);
  note("Stop the server with Ctrl-C.");
}
