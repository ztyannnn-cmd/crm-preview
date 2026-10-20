import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_MINOR, MIN_MINOR, MoneyError, parseTotal, parseAllocation, minorFromJSON,
  minorToJSON, formatMoney, compareMoney, addMoney, difference, sumMoney } from './money.mjs';

test('decimal strings normalize to exact two-place amounts without coercion', () => {
  for (const [input, output] of [['100', '100.00'], ['100.0', '100.00'], ['100.01', '100.01'], ['0001.2', '1.20'], ['0.01', '0.01']]) {
    assert.equal(formatMoney(parseTotal(input)), output);
  }
});

test('rejects JSON numbers, empty values, whitespace, signs, exponents and invalid precision', () => {
  for (const input of [100, 100.01, 0, NaN, Infinity, null, undefined, {}, [], 1n, '', ' ', ' 1', '1 ', '+1', '-1', '-0', '1e2', '0x10', '1,000', '.1', '1.', '1.001', '1\n', '１２', '1_00']) {
    assert.throws(() => parseTotal(input), { code: 'MONEY_FORMAT' });
    assert.throws(() => parseAllocation(input), { code: 'MONEY_FORMAT' });
  }
});

test('business totals reject zero while individual allocations allow it', () => {
  for (const input of ['0', '0.0', '0.00', '000']) {
    assert.throws(() => parseTotal(input), { code: 'MONEY_POSITIVE' });
    assert.equal(parseAllocation(input), 0n);
  }
  assert.equal(formatMoney(parseAllocation('0')), '0.00');
});

test('signed BIGINT positive boundary is exact, with no rounding on overflow', () => {
  assert.equal(parseTotal('92233720368547758.07'), MAX_MINOR);
  assert.equal(formatMoney(MAX_MINOR), '92233720368547758.07');
  for (const input of ['92233720368547758.08', '92233720368547759', '999999999999999999999999999999999999']) {
    assert.throws(() => parseTotal(input), { code: 'MONEY_RANGE' });
  }
});

test('amounts beyond Number safe integer precision retain every cent', () => {
  const a = parseTotal('9007199254740992.01'), b = parseTotal('9007199254740992.02');
  assert.equal(minorToJSON(a), '900719925474099201');
  assert.equal(formatMoney(a), '9007199254740992.01');
  assert.equal(difference(b, a), 1n);
  assert.equal(compareMoney(a, b), -1);
});

test('negative Margin is a legal signed result, separate from total validation', () => {
  const margin = difference(parseTotal('90.01'), parseTotal('100.02'));
  assert.equal(margin, -1001n);
  assert.equal(formatMoney(margin), '-10.01');
  assert.equal(minorToJSON(margin), '-1001');
  assert.equal(formatMoney(-1n), '-0.01');
  assert.equal(formatMoney(MIN_MINOR), '-92233720368547758.08');
});

test('comparison, sum and difference operate on checked integer minor units', () => {
  assert.equal(sumMoney([parseTotal('0.1'), parseTotal('0.2')]), 30n);
  assert.equal(sumMoney([]), 0n);
  assert.equal(sumMoney(new Set([1n, 2n])), 3n);
  assert.equal(compareMoney(1n, 1n), 0);
  assert.equal(compareMoney(1n, -1n), 1);
  assert.equal(addMoney(MAX_MINOR, -1n), MAX_MINOR - 1n);
  assert.equal(difference(MIN_MINOR, -1n), MIN_MINOR + 1n);
});

test('arithmetic rejects positive, negative and intermediate overflow', () => {
  for (const action of [() => addMoney(MAX_MINOR, 1n), () => addMoney(MIN_MINOR, -1n),
    () => difference(MAX_MINOR, -1n), () => difference(MIN_MINOR, 1n),
    () => difference(MAX_MINOR, MIN_MINOR), () => sumMoney([MAX_MINOR, 1n, -1n])]) {
    assert.throws(action, { code: 'MONEY_RANGE' });
  }
});

test('JSON boundaries use integer strings and round-trip signed extremes', () => {
  for (const value of [MIN_MINOR, -1001n, -1n, 0n, 1n, 9007199254740993n, MAX_MINOR]) {
    const json = JSON.stringify({ amountMinor: minorToJSON(value) });
    assert.equal(minorFromJSON(JSON.parse(json).amountMinor), value);
  }
  for (const input of [1, null, '', '+1', '-0', '01', '1.0', '1e2', ' 1']) {
    assert.throws(() => minorFromJSON(input), { code: 'MONEY_FORMAT' });
  }
  for (const input of ['9223372036854775808', '-9223372036854775809']) {
    assert.throws(() => minorFromJSON(input), { code: 'MONEY_RANGE' });
  }
});

test('formatters and arithmetic reject lossy numbers and unchecked out-of-range bigint', () => {
  for (const value of [100, '100', null, undefined]) {
    for (const action of [() => formatMoney(value), () => minorToJSON(value),
      () => compareMoney(value, 0n), () => addMoney(0n, value), () => difference(value, 0n)]) {
      assert.throws(action, error => error instanceof MoneyError && error.code === 'MONEY_TYPE');
    }
  }
  assert.throws(() => formatMoney(MAX_MINOR + 1n), { code: 'MONEY_RANGE' });
});
