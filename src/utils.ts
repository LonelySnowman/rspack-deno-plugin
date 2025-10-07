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

// 检查当前目录是否在 workspace 子包中，并返回根目录路径
export function findWorkspaceRoot(currentDir: string, workspacePaths: string[]): string {
  // 如果 workspacePaths 为空，直接返回当前目录
  if (!workspacePaths || workspacePaths.length === 0) {
    return currentDir;
  }

  // 检查当前目录是否在某个 workspace 子包中
  for (const workspacePath of workspacePaths) {
    const normalizedWorkspacePath = workspacePath.replace(/^\.\//, '');
    const workspaceFullPath = `${currentDir}/${normalizedWorkspacePath}`;
    
    // 检查当前目录是否在子包目录中
    if (currentDir.startsWith(workspaceFullPath)) {
      // 找到根目录（当前目录的父目录，直到找到包含 deno.json 的目录）
      let rootDir = currentDir;
      while (rootDir !== '/' && rootDir !== '') {
        const parentDir = rootDir.substring(0, rootDir.lastIndexOf('/'));
        if (parentDir === '') break;
        
        // 检查父目录是否包含 deno.json
        if (fileExistsSync(`${parentDir}/deno.json`)) {
          return parentDir;
        }
        rootDir = parentDir;
      }
      break;
    }
  }

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