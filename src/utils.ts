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

// 查找包含 workspace 配置的根目录
export function findWorkspaceRoot(currentDir: string, rootDir: string, workspacePaths: string[]): string {
  // 如果 workspacePaths 为空，说明不是 workspace 项目，返回当前目录
  if (!workspacePaths || workspacePaths.length === 0) {
    return currentDir;
  }

  // 标准化路径，移除末尾的斜杠
  const normalizedCurrentDir = currentDir.replace(/\/$/, '');
  const normalizedRootDir = rootDir.replace(/\/$/, '');

  // 如果当前目录就是根目录，直接返回
  if (normalizedCurrentDir === normalizedRootDir) {
    return rootDir;
  }

  // 检查当前目录是否在某个 workspace 子包中
  for (const workspacePath of workspacePaths) {
    // 构建子包的绝对路径
    const normalizedWorkspacePath = workspacePath.replace(/^\.\//, '').replace(/\/$/, '');
    const subPackageFullPath = `${normalizedRootDir}/${normalizedWorkspacePath}`;
    
    // 检查当前目录是否是子包目录或其子目录
    if (normalizedCurrentDir === subPackageFullPath || normalizedCurrentDir.startsWith(`${subPackageFullPath}/`)) {
      // 当前目录在子包中，返回根目录
      return rootDir;
    }
  }

  // 当前目录不在任何子包中，返回当前目录
  return currentDir;
}

export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  try {
    const content = await Deno.readTextFile(filePath);
    return JSON.parse(content) as T;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`File not found: ${filePath}`);
    } else if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in file: ${filePath}`);
    } else {
      throw error;
    }
  }
}

// 匹配 .ts 结尾文件的正则表达式
export const TS_FILE_REGEX = /\.ts$/;

// 检查文件是否为 TypeScript 文件
export function isTypeScriptFile(filePath: string): boolean {
  return TS_FILE_REGEX.test(filePath);
}