import { Specifiers } from "./types.ts";

export function parseNpmSpecifier(request: string) {
  if (!request.startsWith(Specifiers.NPM))
    throw new Error("Invalid npm specifier");
  request = request.slice(Specifiers.NPM.length);
  if (request.startsWith("/")) {
    request = request.slice(1);
  }
  request = request.replaceAll(/@[\^|~|>|<|>=|<=|=]\d+(\.\d+)?(\.\d+)?/g, "");
  return request;
}

export function getFileExtension(filePath: string): string {
  // 提取最后一个部分作为扩展名
  const parts = filePath.split(".");
  // 如果 parts 只有一个元素，那么表示没有后缀名
  if (parts.length <= 1) {
    return "";
  }
  // 提取最后一个部分（假设后缀名）
  const ext = parts.pop();
  // 再次验证提取的部分是否符合扩展名规则
  return ext && !ext.includes("/") ? ext : "";
}

export function startWithSpecifier(str: string): boolean {
  // 正则表达式匹配以任意字符后跟一个冒号的字符串
  const regex = /[^*.: | ^*\.*\/]/;
  // 测试输入字符串是否匹配正则表达式
  return regex.test(str);
}

export function parsePackageName(dep: string): [string, string] {
  const RE_SCOPED = /^(@[^\/]+\/[^@\/]+)(?:@([^\/]+))?(\/.*)?$/;
  const RE_NON_SCOPED = /^([^@\/]+)(?:@([^\/]+))?(\/.*)?$/;
  const mode = RE_SCOPED.exec(dep) || RE_NON_SCOPED.exec(dep);
  if (!mode) {
    return ["", ""];
  }
  // 1 name 2 version 3 path
  const pkgName = mode[1] || "";
  const pkgPath = mode[2] ? `@${mode[2]}${mode[3]}` : `${mode[3]}`;
  return [pkgName, pkgPath];
}

export function fileExistsSync(filePath: string): boolean {
  try {
    Deno.statSync(filePath);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw error; // 处理其他错误
    }
  }
}

export function ensureDirSync(dir: string) {
  try {
    Deno.mkdirSync(dir, { recursive: true });
  } catch (error) {
    if (error instanceof Deno.errors.AlreadyExists) {
      // 目录已经存在，不需要创建
    } else {
      throw error; // 处理其他错误
    }
  }
}
