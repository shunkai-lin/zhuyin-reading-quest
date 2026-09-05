"""Merge only this app's fragment into a previously retrieved LIVE rules snapshot."""
import json,re
from pathlib import Path
source=Path('work/firebase-live.rules').read_text(encoding='utf-8')
fragment=Path('firestore/zhuyin.rules.fragment').read_text(encoding='utf-8')
ids=[i['id'] for l in json.loads(Path('lib/curriculum.json').read_text(encoding='utf-8')) for i in l['items']]
fragment=fragment.replace('VALID_IDS',', '.join("'"+i+"'" for i in ids))
rewards=json.loads(Path('lib/reward-pool.json').read_text(encoding='utf-8'))
fragment=fragment.replace('REWARD_IDS',', '.join("'"+r['id']+"'" for r in rewards))
assert source.count('match /databases/{database}/documents {')==1
if '// BEGIN ZHUYIN READING QUEST' in source:
 updated=re.sub(r'    // BEGIN ZHUYIN READING QUEST.*?    // END ZHUYIN READING QUEST\n?',lambda m:fragment,source,flags=re.S)
else:
 start=source.index('match /databases/{database}/documents {')+len('match /databases/{database}/documents {')
 updated=source[:start]+'\n'+fragment+source[start:]
assert updated.count('match /zhuyinProgress/{code}')==1
Path('work/firestore.rules').write_text(updated,encoding='utf-8')
Path('work/firebase.json').write_text(json.dumps({'firestore':{'rules':'firestore.rules'}}),encoding='utf-8')
print('Prepared additive rules for 120 valid item IDs; existing rules retained.')
