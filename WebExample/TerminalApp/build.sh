#!/usr/bin/env bash
#
# Builds the WebExampleApp WebAssembly binary with the required release flags.
#
# The optimization flags are load-bearing. A plain `-O` release build (and on
# some machines a plain `-Osize` build) emits merged helper functions whose
# signatures exceed the browser WebAssembly limit of 1000 parameters. The
# module then fails to parse at startup. Keep the flags below in sync with
# `WebExample/scripts/build-terminal.mjs`.

set -euo pipefail

wasm_sdk="swift-6.3.3-RELEASE_wasm"
wasm_sdk_url="https://download.swift.org/swift-6.3.3-release/wasm-sdk/swift-6.3.3-RELEASE/${wasm_sdk}.artifactbundle.tar.gz"
wasm_sdk_checksum="cabfa08b73bb8ac783927ecd15fa386e99d0c139c5f232445067bcf58379cae7"

swift_args=(
  --swift-sdk "$wasm_sdk"
  -c release
  -Xswiftc -Osize
  -Xswiftc -Xfrontend
  -Xswiftc -disable-llvm-merge-functions-pass
  -Xlinker --initial-memory=536870912
  -Xlinker --max-memory=4294967296
  -Xlinker -z
  -Xlinker stack-size=16777216
)

# Details print in bold or dim only. Red is reserved for nothing here: a
# detail line is information, not an error.
if [ -t 1 ]; then
  bold=$(tput bold) dim=$(tput dim) reset=$(tput sgr0)
else
  bold="" dim="" reset=""
fi

step() { printf '\n%s%s%s\n' "$bold" "$1" "$reset"; }
note() { printf '%s%s%s\n' "$dim" "$1" "$reset"; }

fail() {
  printf '\n%s\n' "$1" >&2
  shift
  for line in "$@"; do
    printf '  %s\n' "$line" >&2
  done
  exit 1
}

step "Check the Swift toolchain"

if ! command -v swiftly >/dev/null 2>&1; then
  fail "This build needs swiftly, the Swift toolchain manager." \
    "swiftly selects the pinned Swift toolchain and the WebAssembly SDK." \
    "" \
    "Install swiftly:  https://www.swift.org/swiftly/" \
    "Then run this script again."
fi

if ! swiftly run swift sdk list 2>/dev/null | grep -q "$wasm_sdk"; then
  fail "This build needs the $wasm_sdk Swift SDK." \
    "Install it with:" \
    "" \
    "  swiftly run swift sdk install \\" \
    "    $wasm_sdk_url \\" \
    "    --checksum $wasm_sdk_checksum" \
    "" \
    "Then run this script again."
fi

note "swiftly: $(command -v swiftly)"
note "Swift SDK: $wasm_sdk"

step "Build WebExampleApp for WebAssembly"
note "A clean release build is slow. It can take several minutes."
note "Command: swiftly run swift build ${swift_args[*]}"

swiftly run swift build "${swift_args[@]}"

step "Done"
note "The binary is in .build/release/. The usual next step is"
note "'npm run build' in WebExample/, which packages it with the manifest."
