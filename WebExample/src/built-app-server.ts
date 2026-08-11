import { existsSync } from "node:fs";
import { join, resolve, sep } from "node:path";

import { serve } from "bun";

const defaultTerminalAppDist = resolve(import.meta.dir, "../TerminalApp/dist");
const defaultWebDist = resolve(import.meta.dir, "../dist");
const isolationHeaders = {
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export interface BuiltWebExampleServerOptions {
  hostname?: string;
  includeScrollChainHarness?: boolean;
  port?: number;
  terminalAppDist?: string;
  webDist?: string;
}

export function serveBuiltWebExample(
  options: BuiltWebExampleServerOptions = {}
) {
  const terminalAppDist = options.terminalAppDist ?? defaultTerminalAppDist;
  const webDist = options.webDist ?? defaultWebDist;

  return serve({
    hostname: options.hostname ?? "127.0.0.1",
    port: options.port ?? 0,
    fetch: (req) => {
      const url = new URL(req.url);

      if (
        options.includeScrollChainHarness
        && url.pathname === "/__scroll-chain-harness"
      ) {
        return withIsolationHeaders(scrollChainHarnessResponse(url));
      }

      if (url.pathname.startsWith("/TerminalApp/dist/")) {
        const pathname = url.pathname.slice("/TerminalApp/dist/".length);
        return fileResponse(resolveWithin(terminalAppDist, pathname));
      }

      const pathname = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      return fileResponse(resolveWithin(webDist, pathname));
    },
  });
}

function scrollChainHarnessResponse(
  url: URL
): Response {
  const requestedMode = url.searchParams.get("mode");
  const mode = requestedMode === "headroom" || requestedMode === "edge"
    ? requestedMode
    : "none";
  const iframeSource = `/?embed=marketing&scrollChainFixture=${mode}`;

  return new Response(
    `<!doctype html>
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
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    }
  );
}

function resolveWithin(
  root: string,
  pathname: string
): string {
  const filePath = resolve(root, pathname);
  if (filePath === root || filePath.startsWith(`${root}${sep}`)) {
    return filePath;
  }

  return join(root, "index.html");
}

function fileResponse(
  filePath: string
): Response {
  if (!existsSync(filePath)) {
    return withIsolationHeaders(
      new Response("Not found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      })
    );
  }

  const file = Bun.file(filePath);
  return withIsolationHeaders(
    new Response(file, {
      headers: file.type
        ? {
            "Content-Type": file.type,
          }
        : undefined,
    })
  );
}

function withIsolationHeaders(
  response: Response
): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(isolationHeaders)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
