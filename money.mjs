// Decimal strings at the API boundary; signed BIGINT minor units internally.
// This module has no currency conversion, storage, or legacy-model side effects.
export const MAX_MINOR = 9223372036854775807n;
export const MIN_MINOR = -9223372036854775808n;

export class MoneyError extends Error {
  constructor(code, message) { super(message); this.name = 'MoneyError'; this.code = code; }
}

function checked(value) {
  if (typeof value !== 'bigint') throw new MoneyError('MONEY_TYPE', 'Minor units must be bigint.');
  if (value < MIN_MINOR || value > MAX_MINOR) throw new MoneyError('MONEY_RANGE', 'Amount exceeds signed BIGINT minor-unit range.');
  return value;
}

function decimal(value, allowZero) {
  if (typeof value !== 'string' || !/^[0-9]+(?:\.[0-9]{1,2})?$/.test(value)) {
    throw new MoneyError('MONEY_FORMAT', 'Use an unsigned decimal string with at most two decimal places.');
  }
  const [whole, fraction = ''] = value.split('.');
  const digits = whole.replace(/^0+(?=\d)/, '');
  if (digits.length > 17) throw new MoneyError('MONEY_RANGE', 'Amount exceeds signed BIGINT minor-unit range.');
  const minor = checked(BigInt(digits) * 100n + BigInt(fraction.padEnd(2, '0')));
  if (!allowZero && minor === 0n) throw new MoneyError('MONEY_POSITIVE', 'Total must be greater than zero.');
  return minor;
}

/** Business totals must be positive. Never coerce a JSON number to a string. */
export const parseTotal = value => decimal(value, false);
/** Individual allocations may be zero, but may not be negative. */
export const parseAllocation = value => decimal(value, true);

/** JSON uses canonical integer strings, including signed differences/Margin. */
export function minorFromJSON(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*|-[1-9][0-9]*)$/.test(value)) {
    throw new MoneyError('MONEY_FORMAT', 'JSON minor units must be a canonical integer string.');
  }
  if (value.length > 20) throw new MoneyError('MONEY_RANGE', 'Amount exceeds signed BIGINT minor-unit range.');
  return checked(BigInt(value));
}

export const minorToJSON = value => checked(value).toString();

/** Formatting accepts signed results, including MIN_MINOR, without Number. */
export function formatMoney(value) {
  const minor = checked(value), negative = minor < 0n, magnitude = negative ? -minor : minor;
  return `${negative ? '-' : ''}${magnitude / 100n}.${(magnitude % 100n).toString().padStart(2, '0')}`;
}

export function compareMoney(left, right) {
  checked(left); checked(right);
  return left < right ? -1 : left > right ? 1 : 0;
}

export const addMoney = (left, right) => checked(checked(left) + checked(right));
export const difference = (left, right) => checked(checked(left) - checked(right));

/** Every intermediate sum must also fit signed BIGINT. */
export function sumMoney(values) {
  let sum = 0n;
  for (const value of values) sum = addMoney(sum, value);
  return sum;
}
