import test from 'node:test';
import assert from 'node:assert/strict';
import { oracleFailureCode, oracleAvailabilityMessage, ORACLE_UNAVAILABLE, ORACLE_CREDITS_EXHAUSTED } from '../src/lib/oracleAvailability.mjs';

test('identifies exhausted credits without claiming every failure is a billing problem', () => {
  assert.equal(oracleFailureCode({ code: 'insufficient_quota' }), ORACLE_CREDITS_EXHAUSTED);
  assert.equal(oracleFailureCode({ error: { code: 'insufficient_quota' } }), ORACLE_CREDITS_EXHAUSTED);
  for (const error of [undefined, new Error('Missing API key'), { status: 429, code: 'rate_limit_exceeded' }, { status: 503 }]) assert.equal(oracleFailureCode(error), ORACLE_UNAVAILABLE);
  assert.match(oracleAvailabilityMessage(ORACLE_CREDITS_EXHAUSTED), /AI credits/);
  assert.ok(oracleAvailabilityMessage(ORACLE_CREDITS_EXHAUSTED).length >= 2 * 108);
  assert.doesNotMatch(oracleAvailabilityMessage(ORACLE_UNAVAILABLE), /AI credits/);
});
