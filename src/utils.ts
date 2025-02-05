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
