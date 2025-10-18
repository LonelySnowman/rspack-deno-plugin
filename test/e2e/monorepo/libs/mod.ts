import { union as npmUnion } from "npm:lodash-es";
import { chunk, cloneDeep, flatten, union, uniq } from "lodash-es";

export const add = (a: number, b: number) => a + b;

// 自定义 flat 函数
export const flat = <T>(arr: T[], depth: number = 1): T[] => {
	if (depth <= 0) return arr;

	const result: T[] = [];
	for (const item of arr) {
		if (Array.isArray(item) && depth > 0) {
			result.push(...flat(item, depth - 1));
		} else {
			result.push(item);
		}
	}
	return result;
};

export const lodashUtils = {
	deepClone: <T>(obj: T): T => cloneDeep(obj),
	unionArrays: <T>(...arrays: T[][]): T[] => union(...arrays),
	flattenArray: <T>(arr: T[], depth: number = 1): T[] => flatten(arr, depth),
	uniqueArray: <T>(arr: T[]): T[] => uniq(arr),
	chunkArray: <T>(arr: T[], size: number): T[][] => chunk(arr, size),
	flattenAndUnique: <T>(arr: T[], depth: number = 1): T[] => {
		return uniq(flatten(arr, depth));
	},
};

cloneDeep(1);
union([1, 2, 3], [4, 5, 6]);
npmUnion([1, 2, 3], [4, 5, 6]);
