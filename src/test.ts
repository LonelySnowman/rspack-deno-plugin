import { sum } from 'npm:lodash-es';
import { assert } from '@std/assert';
import { titleCase } from 'https://jsr.io/@luca/cases/1.0.0/mod.ts';
// import { resolve } from 'node:path';

const num1 = 1;
const num2 = 2;

console.log(sum(num1, num2));
console.log(assert('I am truthy'));
console.log(titleCase('asfas'));
// console.log(resolve(Deno.cwd(), './index.ts'));
