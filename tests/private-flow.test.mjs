import test from 'node:test';
import assert from 'node:assert/strict';
import { privateFlow, clearLegacyReadings } from '../src/lib/privateFlow.mjs';

test('private flow keeps only bounded known fields and can clear all tab state',()=>{
  privateFlow.clear();
  let updates=0;const unsubscribe=privateFlow.subscribe(()=>updates++);
  privateFlow.save('/cards',{question:'A private question?',adjectives:'["Helper"]',token:'secret',cards:'x'.repeat(1025)});
  assert.deepEqual(privateFlow.snapshot()['/cards'],{question:'A private question?',adjectives:'["Helper"]'});
  privateFlow.clear();assert.deepEqual(privateFlow.snapshot(),{});assert.equal(updates,2);unsubscribe();
});
test('legacy private caches are removed while language preference is retained',()=>{
  const values=new Map([['oracle-reading-v1:private','reading'],['oracle-translation-v1:private','translation'],['oracle-language','de'],['unrelated','keep']]);
  const storage={get length(){return values.size;},key:index=>[...values.keys()][index],removeItem:key=>values.delete(key)};
  clearLegacyReadings(storage);
  assert.deepEqual([...values.keys()],['oracle-language','unrelated']);
});
