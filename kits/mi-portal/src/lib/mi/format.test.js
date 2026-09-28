import { test } from 'node:test';
import assert from 'node:assert/strict';
import { num, compact, pct, signedPct, growth } from './format.js';

test('천 단위 쉼표', () => assert.equal(num(1234567), '1,234,567'));
test('만/억/조', () => {
  assert.equal(compact(9800), '9,800');
  assert.equal(compact(11523), '1.2만');
  assert.equal(compact(123456), '12.3만');
  assert.equal(compact(20000), '2만');
  assert.equal(compact(34500000), '3,450만');
  assert.equal(compact(123000000), '1.2억');
  assert.equal(compact(2500000000000), '2.5조');
  assert.equal(compact(-150000000), '-1.5억');
});
test('백분율', () => {
  assert.equal(pct(12.345), '12.3%');
  assert.equal(pct(0.1234, { ratio: true }), '12.3%');
});
test('부호 붙은 증감', () => {
  assert.equal(signedPct(3.21), '+3.2%');
  assert.equal(signedPct(-1), '-1%');
  assert.equal(signedPct(0), '0%');
});
test('증감률은 기준 0 이면 null', () => {
  assert.equal(growth(110, 100), 10);
  assert.equal(growth(5, 0), null);
});
test('값이 없으면 -', () => {
  assert.equal(num(null), '-');
  assert.equal(compact(NaN), '-');
});
