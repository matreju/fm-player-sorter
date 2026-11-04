import test from 'node:test';
import assert from 'node:assert/strict';
import {contractDuration} from '../src/utils/contractDuration.ts';
test('uses the game calendar and does not invent a duration when the world date is unknown',()=>{
  assert.equal(contractDuration('2032-07-14','2030-07-14'),'2 lata');
  assert.equal(contractDuration('2031-07-13','2030-07-14'),'11 mies.');
  assert.equal(contractDuration('2030-07-13','2030-07-14'),'Wygasł');
  assert.equal(contractDuration('2030-07-15','2030-07-14'),'< 1 mies.');
  assert.equal(contractDuration('2032-07-14',null),'—');
  assert.equal(contractDuration(undefined,'2030-07-14'),'—');
});
