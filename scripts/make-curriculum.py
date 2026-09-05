import json
from pathlib import Path
rows=json.loads(Path('sources/hanlin-115.json').read_text(encoding='utf-8-sig'))
pairs='你:ㄋㄧˇ 我:ㄨㄛˇ 左:ㄗㄨㄛˇ 右:ㄧㄡˋ 前:ㄑㄧㄢˊ 大:ㄉㄚˋ 風:ㄈㄥ 來:ㄌㄞˊ 玩:ㄨㄢˊ 跑:ㄆㄠˇ 火:ㄏㄨㄛˇ 車:ㄔㄜ 山:ㄕㄢ 出:ㄔㄨ 小:ㄒㄧㄠˇ 開:ㄎㄞ 心:ㄒㄧㄣ 草:ㄘㄠˇ 天:ㄊㄧㄢ 多:ㄉㄨㄛ 少:ㄕㄠˇ 水:ㄕㄨㄟˇ 去:ㄑㄩˋ 上:ㄕㄤˋ 好:ㄏㄠˇ 看:ㄎㄢˋ 花:ㄏㄨㄚ 下:ㄒㄧㄚˋ 空:ㄎㄨㄥ 早:ㄗㄠˇ 田:ㄊㄧㄢˊ 是:ㄕˋ 他:ㄊㄚ 找:ㄓㄠˇ 回:ㄏㄨㄟˊ 到:ㄉㄠˋ 人:ㄖㄣˊ 笑:ㄒㄧㄠˋ 走:ㄗㄡˇ 在:ㄗㄞˋ 吹:ㄔㄨㄟ 停:ㄊㄧㄥˊ 有:ㄧㄡˇ 高:ㄍㄠ 想:ㄒㄧㄤˇ 爬:ㄆㄚˊ 說:ㄕㄨㄛ 叫:ㄐㄧㄠˋ 星:ㄒㄧㄥ 陽:ㄧㄤˊ'
m=dict(x.split(':') for x in pairs.split()); chars=list(m)
m.update(x.split(':') for x in '一:ㄧ 起:ㄑㄧˇ 們:˙ㄇㄣ 不:ㄅㄨˋ 洞:ㄉㄨㄥˋ 個:ㄍㄜˋ 請:ㄑㄧㄥˇ 問:ㄨㄣˋ 太:ㄊㄞˋ 珠:ㄓㄨ 滑:ㄏㄨㄚˊ 梯:ㄊㄧ 秋:ㄑㄧㄡ 千:ㄑㄧㄢ 音:ㄧㄣ 谷:ㄍㄨˇ 棉:ㄇㄧㄢˊ 泡:ㄆㄠˋ 池:ㄔˊ 子:ㄗˇ 低:ㄉㄧ 彩:ㄘㄞˇ 過:ㄍㄨㄛˋ 沒:ㄇㄟˊ 的:˙ㄉㄜ 了:˙ㄌㄜ 嗎:˙ㄇㄚ 也:ㄧㄝˇ 陪:ㄆㄟˊ 向:ㄒㄧㄤˋ 邊:ㄅㄧㄢ'.split())
words='一起 我們 不停 火車 山洞 一個 請問 小草 星星 多少 太陽 水珠 滑梯 天上 下去 秋千 天空 回音 山谷 開心 左右 向前 大小 來回 出來 出去 開花 水田 上下 好玩 看看 花草 下車 早上 找到 回來 小人 大人 大火 風吹 跑車 上山 下山 高山 爬山 說笑 叫好 棉花 水池 泡泡'.split()
sentences=['你我一起走','我們去看花','小草開花了','太陽出來了','我們去爬山','火車來了','你看天空','我看到星星','小花開了','我們玩滑梯','我想玩秋千','你在我左邊','他在我右邊','早上好','你看小水珠','我們好開心','我找到你了','風來了','你也一起來','我們看太陽']
sourcewords={w for r in rows for w in r['words']}
assert len(chars)==50 and len(words)==len(set(words))==50
assert set(chars)<=sourcewords
def item(text,level,n):
 z=[m[c] for c in text]
 if text=='一個':z[0]='ㄧˊ'
 if text=='看看':z[1]='˙ㄎㄢ'
 if text=='泡泡':z[1]='˙ㄆㄠ'
 for i in range(len(text)-1):
  if text[i:i+2]=='一起':z[i]='ㄧˋ'
  if text[i:i+2]=='星星':z[i+1]='˙ㄒㄧㄥ'
 return {'id':f'{level}-{n+1}','text':text,'zhuyin':z,'source':'textbook' if text in sourcewords else 'extension'}
data=[{'name':name,'items':[item(t,l,n) for n,t in enumerate(texts)]} for l,(name,texts) in enumerate(zip(['一個字','兩個字','一句話'],[chars,words,sentences]))]
Path('lib/curriculum.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print([len(l['items']) for l in data])
