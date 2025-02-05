import { ResolveData } from '@rspack/core';
import { Loader } from '../types.ts';

export class PortableLoader implements Loader {
  beforeResolve(_resolveData: ResolveData) {
    // TODO: Update loader not use deno cache
  }
}
