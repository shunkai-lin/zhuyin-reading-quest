import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const levels=JSON.parse(readFileSync('lib/curriculum.json','utf8'));
const source=JSON.parse(readFileSync('sources/hanlin-115.json','utf8').replace(/^\uFEFF/,''));
assert.deepEqual(levels.map(l=>l.items.length),[50,50,20]);
assert.equal(new Set(levels.flatMap(l=>l.items.map(x=>x.id))).size,120);
const official=new Set(source.flatMap(l=>l.words));
for(const [level,l] of levels.entries()){
 assert.equal(new Set(l.items.map(x=>x.text)).size,l.items.length);
 for(const item of l.items){
  assert.equal(item.zhuyin.length,[...item.text].length);
  assert(item.zhuyin.every(z=>/^[\u3105-\u3129ˊˇˋ˙]+$/.test(z)));
  if(level<2)assert.equal(item.text.length,level+1);
  if(level===0)assert(official.has(item.text));
  if(item.source==='textbook')assert(official.has(item.text));
 }
}
console.log('PASS: 50 unique source characters, 50 unique two-character words, 20 sentences, annotations and source labels.');
