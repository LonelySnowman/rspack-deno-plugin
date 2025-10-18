import { union } from "npm:lodash-es";
import { add as libsAdd } from "@test/libs";
import { cloneDeep } from "lodash-es";

export const add = (a: number, b: number) => a + b;

cloneDeep(1);
union([1, 2, 3], [4, 5, 6]);
add(1, 2);
libsAdd(1, 2);
