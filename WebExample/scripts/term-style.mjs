// Shared console output helpers for the WebExample build scripts.
//
// Style rules: step titles are bold, detail lines are dim, and nothing prints
// in red. A detail line is information, not an error; even failure text stays
// plain so it reads as guidance.

const styled = process.stdout.isTTY === true;
const bold = styled ? "\u001b[1m" : "";
const dim = styled ? "\u001b[2m" : "";
const reset = styled ? "\u001b[0m" : "";

/** Print a bold step title. */
export function step(title) {
  console.log(`\n${bold}${title}${reset}`);
}

/** Print a dim detail line under the current step. */
export function note(text) {
  console.log(`${dim}${text}${reset}`);
}

/** Print a plain warning line. The build continues. */
export function warn(text) {
  console.log(`${bold}warning:${reset} ${text}`);
}

/**
 * Print a failure message with indented guidance lines, then exit.
 * @param {string} message
 * @param {...string} guidance
 * @returns {never}
 */
export function fail(message, ...guidance) {
  console.error(`\n${message}`);
  for (const line of guidance) {
    console.error(line === "" ? "" : `  ${line}`);
  }
  process.exit(1);
}
