#!/usr/bin/env sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
swiftpm_scratch=${SWIFTTUI_COUNTER_DEMO_SWIFTPM_SCRATCH:-}

skip_clean=0
skip_bun_install=0
suite=all
failures=""

usage() {
  cat <<'EOF'
Usage: Scripts/check_counter_demo.sh [--linux-only|--macos-only|--web-only] [--skip-clean] [--skip-bun-install]

Builds and tests the SwiftTUI counter demo. By default the packages resolve
public SwiftTUI release tags and web package release tarballs; no sibling
checkouts are required.

Suites:
  linux  Build the counter package (debug + release) and run CounterCoreTests.
  macos  Linux coverage plus the WebExample/TerminalApp package (build + test).
         On macOS the counter build also covers the CounterSwiftUI host target.
  web    Install the Bun workspace and build the WebExample browser bundle
         (requires the swift-6.3.3-RELEASE_wasm SDK, Bun, and Binaryen).

Set SWIFTTUI_COUNTER_DEMO_SWIFTPM_SCRATCH to reuse one sequential SwiftPM
scratch directory across the package builds. Do not share that directory
across parallel check runs.
EOF
}

add_failure() {
  title=$1
  if [ -z "$failures" ]; then
    failures=$title
  else
    failures=$failures'
'$title
  fi
}

for argument in "$@"; do
  case "$argument" in
    --skip-clean)
      skip_clean=1
      ;;
    --skip-bun-install)
      skip_bun_install=1
      ;;
    --linux-only)
      suite=linux
      ;;
    --macos-only|--mac-only)
      suite=macos
      ;;
    --web-only)
      suite=web
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      >&2 echo "Unknown argument: $argument"
      >&2 echo ""
      usage
      exit 1
      ;;
  esac
done

run_linux_suite() {
  [ "$suite" = "all" ] || [ "$suite" = "linux" ] || [ "$suite" = "macos" ]
}

run_macos_suite() {
  [ "$suite" = "all" ] || [ "$suite" = "macos" ]
}

run_web_suite() {
  [ "$suite" = "all" ] || [ "$suite" = "web" ]
}

require_command() {
  name=$1
  if ! command -v "$name" >/dev/null 2>&1; then
    >&2 echo "Missing required command: $name"
    exit 1
  fi
}

require_command swiftly
if run_web_suite; then
  require_command bun
fi

run_swift() {
  if [ -n "$swiftpm_scratch" ]; then
    swiftly run swift "$@" --scratch-path "$swiftpm_scratch"
  else
    swiftly run swift "$@"
  fi
}

print_section() {
  echo ""
  echo "== $1 =="
}

run_step() {
  title=$1
  directory=$2
  shift 2

  echo ""
  echo "-- $title"
  if (cd "$directory" && "$@"); then
    return 0
  fi
  add_failure "$title"
  return 0
}

run_linux_checks() {
  print_section "Counter package"

  if [ "$skip_clean" -eq 0 ]; then
    run_step \
      "Clean counter" \
      "$repo_root" \
      run_swift package clean --package-path counter
  fi

  run_step \
    "Build counter" \
    "$repo_root" \
    run_swift build --package-path counter

  run_step \
    "Build counter (release)" \
    "$repo_root" \
    run_swift build -c release --package-path counter

  run_step \
    "Test counter" \
    "$repo_root" \
    run_swift test --package-path counter
}

run_macos_checks() {
  print_section "WebExample/TerminalApp package"

  if [ "$skip_clean" -eq 0 ]; then
    run_step \
      "Clean WebExample/TerminalApp" \
      "$repo_root" \
      run_swift package clean --package-path WebExample/TerminalApp
  fi

  run_step \
    "Build WebExample/TerminalApp" \
    "$repo_root" \
    run_swift build --package-path WebExample/TerminalApp

  run_step \
    "Test WebExample/TerminalApp" \
    "$repo_root" \
    run_swift test --package-path WebExample/TerminalApp
}

run_web_checks() {
  print_section "WebExample browser bundle"

  if [ -f "$repo_root/package.json" ] && [ -f "$repo_root/bun.lock" ] && [ "$skip_bun_install" -eq 0 ]; then
    run_step \
      "Install Bun workspace dependencies" \
      "$repo_root" \
      bun install --frozen-lockfile
  fi

  run_step \
    "Build WebExample web demo" \
    "$repo_root/WebExample" \
    bun run build
}

if run_linux_suite; then
  run_linux_checks
fi

if run_macos_suite; then
  run_macos_checks
fi

if run_web_suite; then
  run_web_checks
fi

echo ""
if [ -z "$failures" ]; then
  echo "All counter demo checks succeeded."
  exit 0
fi

>&2 echo "Counter demo check failures:"
OLD_IFS=$IFS
IFS='
'
for failure in $failures; do
  >&2 echo "  - $failure"
done
IFS=$OLD_IFS

exit 1
