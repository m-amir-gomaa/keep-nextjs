import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import vm from "node:vm";

export const projectRoot = resolve(import.meta.dirname, "../..");
export const projectRequire = createRequire(
  resolve(projectRoot, "package.json"),
);
const ts = projectRequire("typescript");

// Load real TypeScript modules with explicit boundary replacements, without a server.
export function loader(mocks = {}) {
  const cache = new Map();
  function load(path) {
    const filename = [".ts", ".tsx", ""]
      .map((extension) => path + extension)
      .find(existsSync);
    if (!filename) throw new Error("Cannot resolve " + path);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const require = (name) =>
      name in mocks
        ? mocks[name]
        : name.startsWith("@/")
          ? load(resolve(projectRoot, "src", name.slice(2)))
          : name.startsWith(".")
            ? load(resolve(dirname(filename), name))
            : projectRequire(name);
    new vm.Script(`(function(require,module,exports){${compiled}\n})`, {
      filename,
    }).runInThisContext()(require, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return load;
}
