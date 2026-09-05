const { chromium }=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1180,height:820}});
 // This test isolates speech UI from cloud; cloud integration has a separate test.
 await context.route('https://firestore.googleapis.com/**',route=>route.abort());
 await context.addInitScript(()=>{
  window.__spoken=[];window.__response='你';window.__mode='ok';
  document.modelContext={registerTool(tool){window.__progressTool=tool;}};
  window.SpeechRecognition=window.webkitSpeechRecognition=class{
   start(){setTimeout(()=>{if(window.__mode==='denied'){this.onerror?.({error:'not-allowed'});this.onend?.();return;}const last=[{transcript:window.__response}];last.isFinal=true;this.onresult?.({results:[last]});this.onend?.();},10);}abort(){}
  };
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],cancel(){},speak(u){window.__spoken.push(u.text);setTimeout(()=>u.onend?.(),20);}}});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_URL||'http://127.0.0.1:3001/');
 const mic=page.getByRole('button',{name:'換我讀',exact:true});await mic.waitFor();await page.waitForFunction(()=>!document.querySelector('.primary').disabled);
 assert(await page.getByRole('button',{name:/兩個字/}).isDisabled());
 await mic.click();await page.waitForTimeout(100);console.log('First response:',await page.locator('.feedback').innerText());await page.getByText('讀對了！你真棒！').waitFor();
 assert.equal(await page.locator('.big-circle').count(),1);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('zhuyin-quest-v1')).length),1);
 assert.deepEqual(await page.evaluate(()=>window.__progressTool.execute({})),{counts:[1,0,0],unlockedLevel:1});
 assert(await page.evaluate(()=>{try{window.__progressTool.execute({bad:true});return false;}catch{return true;}}));
 await page.getByRole('button',{name:/一個字/}).click();
 await page.evaluate(()=>window.__response='錯');await mic.click();await page.waitForTimeout(120);
 assert.equal(await page.evaluate(()=>window.__spoken.at(-1)),'我');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('zhuyin-quest-v1')).length),1);
 await page.evaluate(()=>window.__mode='denied');await mic.click();await page.getByText('請大人允許麥克風與語音辨識，再試一次。').waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('zhuyin-quest-v1')).length),1);
 const data=JSON.parse(fs.readFileSync('lib/curriculum.json','utf8'));
 await page.evaluate(ids=>{localStorage.removeItem('zhuyin-cloud-v1');localStorage.setItem('zhuyin-quest-v1',JSON.stringify(ids));},data[0].items.slice(0,49).map(x=>x.id));await page.reload();
 await page.waitForFunction(()=>!document.querySelector('.primary').disabled);assert(await page.getByRole('button',{name:/兩個字/}).isDisabled());
 await page.evaluate(()=>{window.__mode='ok';window.__response='陽';});await mic.click();await page.getByRole('button',{name:'前往下一級'}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('zhuyin-quest-v1')).length),50);
 await page.getByRole('button',{name:'前往下一級'}).click();await page.waitForFunction(()=>document.querySelector('.reading').textContent.includes('起'));
 assert(await page.getByRole('button',{name:/一句話/}).isDisabled());
 await page.evaluate(ids=>{localStorage.removeItem('zhuyin-cloud-v1');localStorage.setItem('zhuyin-quest-v1',JSON.stringify(ids));},[...data[0].items,...data[1].items.slice(0,49)].map(x=>x.id));await page.reload();await page.waitForFunction(()=>!document.querySelector('.primary').disabled);
 await page.evaluate(()=>window.__response='泡泡');await mic.click();await page.getByRole('button',{name:'前往下一級'}).click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('zhuyin-quest-v1')).length),100);
 await page.evaluate(()=>window.__response='你我一起走');await mic.click();await page.getByText('讀對了！你真棒！').waitFor();
 await page.getByRole('button',{name:/一個字/}).click();await page.evaluate(()=>window.__response='你');await mic.click();await page.getByText('讀對了！你真棒！').waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('zhuyin-quest-v1')).length),101);
 for(const size of [{width:1180,height:820},{width:820,height:1180},{width:1024,height:768},{width:390,height:844}]){await page.setViewportSize(size);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${size.width}`);}
 assert.deepEqual(errors,[]);
 console.log('PASS: speech success, circle, mismatch replay, permission error, 49/50 and 99/100 gates, persistence, sentence, responsive overflow; speech is simulated.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
