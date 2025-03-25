import { Specifiers } from './types.ts';

export function parseNpmSpecifier(request: string) {
  if (!request.startsWith(Specifiers.NPM)) throw new Error('Invalid npm specifier');
  request = request.slice(Specifiers.NPM.length);
  if (request.startsWith('/')) {
    request = request.slice(1);
  }
  request = request.replaceAll(/@[\^|~|>|<|>=|<=|=]\d+(\.\d+)?(\.\d+)?/g, '');
  return request;
}

export function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  if (parts.length <= 1) {
    return '';
  }
  const ext = parts.pop();
  return ext && !ext.includes('/') ? ext : '';
}

export function startWithSpecifier(str: string): boolean {
  const regex = /[^*.: | ^*\.*\/]/;
  return regex.test(str);
}

export function parsePackageName(dep: string): [string, string] {
  const RE_SCOPED = /^(@[^\/]+\/[^@\/]+)(?:@([^\/]+))?(\/.*)?$/;
  const RE_NON_SCOPED = /^([^@\/]+)(?:@([^\/]+))?(\/.*)?$/;
  const mode = RE_SCOPED.exec(dep) || RE_NON_SCOPED.exec(dep);
  if (!mode) {
    return ['', ''];
  }
  // 1 name 2 version 3 path
  const pkgName = mode[1] || '';
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
      throw error;
    }
  }
}

export function ensureDirSync(dir: string) {
  try {
    Deno.mkdirSync(dir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}
