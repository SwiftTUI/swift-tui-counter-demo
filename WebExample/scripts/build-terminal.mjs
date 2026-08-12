// Builds the Swift artifacts that the browser host serves:
//
//   TerminalApp/dist/scene-manifest.json  — from a native run of the app in
//                                           manifest mode (SWIFTTUI_MODE)
//   TerminalApp/dist/assets/app.wasm      — the release WebAssembly binary,
//                                           optimized and stripped
//
// The script runs on Node 18+ or Bun; any npm setup can invoke it. The Swift
// side needs the swiftly toolchain manager and the swift-6.3.3-RELEASE_wasm
// SDK. The preflight below checks both and explains how to install them.

import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAppWasm, generateSceneManifest } from "@swifttui/build";
import { fail, note, step, warn } from "./term-style.mjs";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const packagePath = resolve(scriptsDirectory, "../TerminalApp");
const outputDirectory = resolve(scriptsDirectory, "../TerminalApp/dist");
const webDistDirectory = resolve(scriptsDirectory, "../dist");
const appExecutable = "WebExampleApp";

const wasmSdk = "swift-6.3.3-RELEASE_wasm";
const wasmSdkUrl =
  `https://download.swift.org/swift-6.3.3-release/wasm-sdk/swift-6.3.3-RELEASE/${wasmSdk}.artifactbundle.tar.gz`;
const wasmSdkChecksum =
  "cabfa08b73bb8ac783927ecd15fa386e99d0c139c5f232445067bcf58379cae7";

const configuration = parseConfiguration(process.argv.slice(2));
const startedAt = Date.now();

checkSwiftToolchain();

step("Generate the scene manifest");
note("This runs the app natively with SWIFTTUI_MODE=manifest.");
note("The first run compiles the package for the host platform first.");
await rm(outputDirectory, { recursive: true, force: true });
await rm(webDistDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await generateSceneManifest({
  packagePath,
  outputPath: join(outputDirectory, "scene-manifest.json"),
  appExecutable,
});

step(`Build the WebAssembly binary (${configuration})`);
note("WebAssembly release builds are slow. A clean build can take several minutes.");
await buildAppWasm({
  configuration,
  packagePath,
  outputDirectory,
  product: appExecutable,
  // Deep non-lean resolves can overflow the default 1 MiB linear-memory stack.
  // Keep this explicit until the bumped @swifttui/build default ships, and keep
  // it in sync with TerminalApp/build.sh.
  stackSize: 16777216,
});

step("Done");
note(`Artifacts are in TerminalApp/dist/ (${elapsedSeconds()}s).`);
note("The usual next step is 'npm run build' or 'npm start' in WebExample/.");

function checkSwiftToolchain() {
  step("Check the Swift toolchain");

  if (!commandSucceeds("swiftly", ["--version"])) {
    fail(
      "This build needs swiftly, the Swift toolchain manager.",
      "swiftly selects the pinned Swift toolchain and the WebAssembly SDK.",
      "",
      "Install swiftly:  https://www.swift.org/swiftly/",
      "Then run this script again.",
    );
  }

  const sdkList = spawnSync("swiftly", ["run", "swift", "sdk", "list"], {
    encoding: "utf8",
  });
  if (sdkList.status !== 0 || !String(sdkList.stdout).includes(wasmSdk)) {
    fail(
      `This build needs the ${wasmSdk} Swift SDK.`,
      "Install it with:",
      "",
      "  swiftly run swift sdk install \\",
      `    ${wasmSdkUrl} \\`,
      `    --checksum ${wasmSdkChecksum}`,
      "",
      "Then run this script again.",
    );
  }

  if (!commandSucceeds("wasm-opt", ["--version"])) {
    warn(
      "wasm-opt (Binaryen) is not installed. The build continues, but the "
        + "wasm binary stays unoptimized and larger. Install it with "
        + "'brew install binaryen' (macOS) or your package manager.",
    );
  }

  note(`Swift SDK: ${wasmSdk}`);
}

function commandSucceeds(command, args) {
  const result = spawnSync(command, args, { stdio: "ignore" });
  return result.error === undefined && result.status === 0;
}

function parseConfiguration(argv) {
  let requested = process.env.WEBEXAMPLE_WASM_CONFIGURATION;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--configuration" || argument === "-c") {
      requested = argv[index + 1];
      index += 1;
      continue;
    }
    if (argument.startsWith("--configuration=")) {
      requested = argument.slice("--configuration=".length);
    }
  }

  switch (requested ?? "release") {
    case "debug":
      return "debug";
    case "release":
      return "release";
    default:
      return fail(`Unsupported WebExample wasm configuration: ${requested}`);
  }
}

function elapsedSeconds() {
  return Math.round((Date.now() - startedAt) / 1000);
}
