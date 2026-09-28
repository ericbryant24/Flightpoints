import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PARTNERS_BY_ID, citiPointsNeeded } from '../server/data/citi.js';

test('1:1 partners transfer the miles amount, rounded up to 1,000', () => {
  const aa = PARTNERS_BY_ID.get('american');
  assert.equal(citiPointsNeeded(57500, aa), 58000);
  assert.equal(citiPointsNeeded(30000, aa), 30000);
});

test('Emirates 5:4 ratio has no floating-point drift', () => {
  const ek = PARTNERS_BY_ID.get('emirates');
  assert.equal(citiPointsNeeded(60000, ek), 75000);
  assert.equal(citiPointsNeeded(60001, ek), 76000);
});

test('hotel ratios', () => {
  assert.equal(citiPointsNeeded(8000, PARTNERS_BY_ID.get('choice')), 4000);
  assert.equal(citiPointsNeeded(1000, PARTNERS_BY_ID.get('accor')), 2000);
});
