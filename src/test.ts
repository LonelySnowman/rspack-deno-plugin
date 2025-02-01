// import { sum } from 'npm:lodash-es';
import * as test from 'jsr:@std/assert';
import { parseJsrSpecifier } from './utils.ts';
import { titleCase } from 'https://jsr.io/@luca/cases/1.0.0/mod.ts';

test.assertInstanceOf

console.log(titleCase('asfas'));

const A = 1;
const B = 2;
// const C = sum(A, B);

console.log(C);

const npmUrl = new URL('npm:lodash-es');
console.log(npmUrl);

const jsrUrl = new URL('jsr:@std/assert@1.0.1');
console.log(jsrUrl);
console.log(parseJsrSpecifier(jsrUrl));

async function streamToString(stream) {
    // 创建一个 Response 对象并使用 .text() 方法
    return await new Response(stream).text();
}

fetch('https://jsr.io/@luca/cases/1.0.0/mod.ts').then(async (res) => {
    const text = await new Response(res.body).text();
    console.log(text);
    console.log(res);
})


// const baseUrl = new URL('lodash-es');
// console.log(baseUrl);
