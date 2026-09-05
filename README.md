# 注音闖關樂

正式版包含粉紅色滿版練習、雲端同步與星星扭蛋獎勵。使用者於 2026-09-06 明確接受「持有學習代碼即可讀寫與重設進度」的存取方式，Firebase 規則已部署，並通過實際兩裝置同步、離線重設保護、非法存取拒絕及抽獎扣星與收藏還原驗證。

適合一年級學生在 iPad Safari 使用的中文朗讀練習。

- 第一級：50 個不重複的生活常用單字，顯示國字與台灣注音。
- 第二級：完成第一級後開啟，50 個雙字詞。
- 第三級：完成第二級後開啟，20 句自編生活短句。
- 首次讀對才計分；顯示大圈圈，按下一題繼續。
- 辨識內容不同時播放正確字詞；未收音、拒絕權限、連線失敗不計分。
- 進度儲存在 Firebase Firestore 的獨立 `zhuyinProgress` 集合，瀏覽器保留離線暫存。
- 家長可在「給大人看」複製隨機 32 碼學習代碼，在另一台裝置接續。持有代碼者可以讀寫、重設該份進度，請勿公開分享。
- 不收集姓名、音訊、逐題錄音或 Email；資料庫只存題目 ID、獎勵 ID、資料格式與重設版本、時間戳記。

## 教材與發音

生字選自[教育部教育百科 115 學年度翰林一年級上學期](https://pedia.cloud.edu.tw/Bookmark/Textword?category=國語&degree=1&press=翰林版&year=115_1)，2026-09-05 取得。各課生字清單與來源網址保存在 `sources/hanlin-115.json`，其中第一課為「一起走」。此為教育百科的版本標示，尚未對照當年度紙本課本；其他網站出現不同課名，後續若提供紙本生字表應以紙本重新核對。

單字均在來源清單。雙字詞標示 `textbook`（清單收錄）或 `extension`（自編延伸）；句子皆為自編，沒有複製課文。注音人工編製，單獨一字採本調，詞句中的「一起／一個」標示變調，三聲連讀保留本調。

語音使用 Web Speech API，`lang=zh-TW`。以辨識文字比對題目，單字另接受少數明確同音字（例如你／妳、他／她、在／再）；不是聲學發音評分，不能精準評量聲母、韻母或聲調，也不能保證兒童聲音皆被正確辨識。示範為瀏覽器中文語音合成的整字／詞朗讀，不是聲母與韻母拆讀錄音。

## iPad 使用

以 Safari 開啟 HTTPS 網址，允許麥克風與語音辨識。遇到無法辨識時，確認網路及 Siri／聽寫設定。按「聽示範」聽一次，再按「換我讀」。無辨識支援時仍可聽示範，不會自動判為過關。網站不儲存音訊；瀏覽器提供的辨識服務可能將音訊送至其服務供應商。

Safari 支援來源：[WebKit 官方說明](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/)。實際 iPad Air M4 麥克風與中文語音品質尚待真機驗證。

## 開發與發布

Node.js 22.13+。`npm ci` 安裝，`npm run dev` 本機預覽，`npm run check` 型別檢查，`npm test` 題庫檢查，`npm run build` 產生 `dist-pages`。

採 Sites 起始 React 套件，為 GitHub Pages 使用獨立 Vite 靜態入口，以前端 Firebase SDK 連接既有 Firestore；前端 Firebase Web 設定屬公開設定，不含管理憑證或 service-role key。`.github/workflows/pages.yml` 在 main 分支更新後驗證並發布；GitHub Pages 的來源須選 GitHub Actions。

`scripts/browser-check.cjs` 使用 Playwright 與 Edge，需透過 `PLAYWRIGHT_MODULE` 指定可用套件路徑，`BROWSER_PATH` 可指定瀏覽器。該測試的語音回覆是模擬值，只驗證流程，不代表真實發音辨識已驗收。

## 目前驗證範圍

題庫數量、唯一性、單字來源、注音欄位與字數一致、TypeScript、靜態建置。模擬瀏覽器測試涵蓋讀對圈圈、讀錯示範、權限失敗、49→50 及 99→100 解鎖、進度保存、句子作答及不同視窗寬度。真機語音、童聲辨識準確率、紙本教材逐字比對仍須實際確認。

## 雲端進度與權限

目前資料庫選定 `classroom-gacha-rewards`，新增 `zhuyinProgress/{128-bit-random-code}`，不改動 classes、kitty、acjenglish 的權限。禁止集合列舉及刪除；只有持有隨機代碼者可以取得、合併或重設該份進度。此方式為持有代碼即有權限，不是 Firebase Auth 帳號隔離。學習代碼不得出現在公開網址、紀錄或公開截圖。

每次寫入透過 Firestore transaction 合併題目 ID，避免多裝置覆蓋。重設會提高 epoch，舊裝置待上傳的舊 epoch 成績不會恢復已清除的紀錄。尚未同步時禁止切換代碼，重設只能在線上成功後更新畫面。既有 `zhuyin-quest-v1` 本機資料在第一次連線時自動搬入，之後保留本機快取以支援短暫斷線。

`firestore/zhuyin.rules.fragment` 為此網站的獨立規則片段。部署前必須讀取 Firebase 線上最新規則到 `work/firebase-live.rules`，執行 `python scripts/prepare-firestore-rules.py` 產生合併檔，確認其他集合規則完全保留，再使用 `firebase-tools deploy --only firestore:rules --project classroom-gacha-rewards --config work/firebase.json`。不可把只含此片段的規則覆蓋整個共用資料庫。

測試：`npm test` 包含同步控制器的模擬後端測試。這只驗證本機搬移、合併、斷線重送、重設與代碼切換邏輯，不能代替線上安全規則及實際跨裝置讀寫測試。

## 星星與扭蛋

參考使用者既有的班級加分扭蛋機、ACJ English Quest：每個首次通過的題目得 1 顆星，10 顆星抽 1 次，先使用 24 隻寶可夢。角色加入圖鑑，重複角色提升 Lv. 等級。扭蛋不改變已通過題數；辨識不符不扣星，重讀不刷星。資料來源與規則見 `sources/rewards.md`。

扭蛋在雲端交易確認後才計入收藏，星星餘額由通過題數及抽獎次數計算；離線暫停抽獎。相同重設版本與扭蛋序號的重試只使用一次資格。由大人確認的全關卡重設會同時清除星星和收藏。前端選獎只用於無金錢價值的學習收藏，不構成防作弊的商業抽獎系統。

`node scripts/rewards-browser-check.cjs` 搭配 `npx vite --config vite.rewards-test.config.ts` 驗證畫面（模擬後端）。`scripts/cloud-live-check.mjs` 只應在確認及部署規則後執行，用來驗證真正讀寫及安全拒絕；其臨時文件需依 `work/cloud-live-docs.json` 清理。測試組態與模擬後端不包含在正式靜態輸出。
