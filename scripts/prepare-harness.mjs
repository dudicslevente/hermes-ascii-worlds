// Builds the small React browser modules that the mock host pages in tests/
// import (react, react/jsx-runtime, react-dom/client) into tests/.harness.
// This is test tooling only; the plugin itself has no dependencies.
//
// Needs react, react-dom and esbuild installed somewhere. For example:
//   mkdir -p /tmp/aw-tools && cd /tmp/aw-tools && npm init -y && npm i react react-dom esbuild playwright
//   ASCII_WORLDS_TOOLS=/tmp/aw-tools node scripts/prepare-harness.mjs
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const tools = path.resolve(process.env.ASCII_WORLDS_TOOLS || process.cwd());
const out = path.join(here, "..", "tests", ".harness", "browser-deps");
const requireFromTools = createRequire(path.join(tools, "noop.js"));
const { build } = await import(
  pathToFileURL(requireFromTools.resolve("esbuild"))
);
await mkdir(out, { recursive: true });
const named = {
  react:
    "Component, PureComponent, StrictMode, Fragment, createElement, createContext, useEffect, useLayoutEffect, useMemo, useCallback, useRef, useState, useReducer, useContext, useSyncExternalStore, useId, memo, forwardRef, Children, isValidElement, cloneElement, version",
  "jsx-runtime": "jsx, jsxs, Fragment",
  "react-dom": "createRoot, hydrateRoot",
};
for (const [name, entry] of [
  ["react", "react"],
  ["jsx-runtime", "react/jsx-runtime"],
  ["react-dom", "react-dom/client"],
]) {
  await build({
    stdin: {
      contents: `import module from ${JSON.stringify(requireFromTools.resolve(entry))}; export const { ${named[name]} } = module; export default module;`,
      resolveDir: tools,
    },
    bundle: true,
    format: "esm",
    platform: "browser",
    outfile: path.join(out, `${name}.mjs`),
    external: name === "react" ? [] : ["react"],
    banner:
      name === "react"
        ? {}
        : {
            js: 'import SharedReact from "react"; const require = name => { if (name === "react") return SharedReact; throw Error("Unsupported module: " + name); };',
          },
    define: { "process.env.NODE_ENV": '"development"' },
  });
}
console.log("Prepared shared React browser modules in", out);
