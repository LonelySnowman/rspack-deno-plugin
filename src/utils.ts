export interface JsrSpecifier {
    name: string;
    version: string | null;
    path: string | null;
  }

export function parseJsrSpecifier(specifier: URL): JsrSpecifier {
    if (specifier.protocol !== "jsr:") throw new Error("Invalid jsr specifier");
    const path = specifier.pathname;
    const startIndex = path[0] === "/" ? 1 : 0;
    if (path[startIndex] !== "@") {
      throw new Error(`Invalid jsr specifier: ${specifier}`);
    }
    const firstSlash = path.indexOf("/", startIndex);
    if (firstSlash === -1) {
      throw new Error(`Invalid jsr specifier: ${specifier}`);
    }
    let pathStartIndex = path.indexOf("/", firstSlash + 1);
    let versionStartIndex = path.indexOf("@", firstSlash + 1);
  
    if (pathStartIndex === -1) pathStartIndex = path.length;
    if (versionStartIndex === -1) versionStartIndex = path.length;
  
    if (versionStartIndex > pathStartIndex) {
      versionStartIndex = pathStartIndex;
    }
  
    if (startIndex === versionStartIndex) {
      throw new Error(`Invalid jsr specifier: ${specifier}`);
    }
  
    return {
      name: path.slice(startIndex, versionStartIndex),
      version: versionStartIndex === pathStartIndex
        ? null
        : path.slice(versionStartIndex + 1, pathStartIndex),
      path: pathStartIndex === path.length ? null : path.slice(pathStartIndex),
    };
  }


  async function readLockfile(path: string) {
    try {
      const data = await Deno.readTextFile(path);
      const instance = instantiate();
      return new instance.WasmLockfile(path, data);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        return null;
      }
      throw err;
    }
  }
  