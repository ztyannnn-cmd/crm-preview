export const MAX_MINOR: bigint;
export const MIN_MINOR: bigint;
export type MoneyErrorCode = 'MONEY_TYPE' | 'MONEY_RANGE' | 'MONEY_FORMAT' | 'MONEY_POSITIVE';
export class MoneyError extends Error {
  readonly code: MoneyErrorCode;
  constructor(code: MoneyErrorCode, message: string);
}
/** Decimal API input; total > 0. */
export function parseTotal(value: string): bigint;
/** Decimal API input; allocation >= 0. */
export function parseAllocation(value: string): bigint;
/** Canonical signed integer string for JSON minor units; validate business side separately. */
export function minorFromJSON(value: string): bigint;
export function minorToJSON(value: bigint): string;
export function formatMoney(value: bigint): string;
export function compareMoney(left: bigint, right: bigint): -1 | 0 | 1;
export function addMoney(left: bigint, right: bigint): bigint;
export function difference(left: bigint, right: bigint): bigint;
export function sumMoney(values: Iterable<bigint>): bigint;
