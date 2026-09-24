/** Select the default page's presenter without changing the Swift artifact. */
export function rendererFromArgs(argv) {
  let renderer = "canvas";
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--renderer") renderer = argv[++index];
    else if (argument.startsWith("--renderer=")) renderer = argument.slice(11);
  }
  if (renderer !== "canvas" && renderer !== "dom") {
    throw new Error(`Unsupported renderer: ${renderer}. Use --renderer=canvas or --renderer=dom.`);
  }
  return renderer;
}
