# 注音闖關樂

適合一年級學生在 iPad Safari 使用的中文朗讀練習。

- 第一級：50 個不重複的生活常用單字，顯示國字與台灣注音。
- 第二級：完成第一級後開啟，50 個雙字詞。
- 第三級：完成第二級後開啟，20 句自編生活短句。
- 首次讀對才計分；顯示大圈圈，按下一題繼續。
- 辨識內容不同時播放正確字詞；未收音、拒絕權限、連線失敗不計分。
- 進度存在目前瀏覽器 localStorage，不跨裝置同步。

## 教材與發音

生字選自[教育部教育百科 115 學年度翰林一年級上學期](https://pedia.cloud.edu.tw/Bookmark/Textword?category=國語&degree=1&press=翰林版&year=115_1)，2026-09-05 取得。各課生字清單與來源網址保存在 `sources/hanlin-115.json`，其中第一課為「一起走」。此為教育百科的版本標示，尚未對照當年度紙本課本；其他網站出現不同課名，後續若提供紙本生字表應以紙本重新核對。

單字均在來源清單。雙字詞標示 `textbook`（清單收錄）或 `extension`（自編延伸）；句子皆為自編，沒有複製課文。注音人工編製，單獨一字採本調，詞句中的「一起／一個」標示變調，三聲連讀保留本調。

語音使用 Web Speech API，`lang=zh-TW`。以辨識文字比對題目，單字另接受少數明確同音字（例如你／妳、他／她、在／再）；不是聲學發音評分，不能精準評量聲母、韻母或聲調，也不能保證兒童聲音皆被正確辨識。示範為瀏覽器中文語音合成的整字／詞朗讀，不是聲母與韻母拆讀錄音。

## iPad 使用

以 Safari 開啟 HTTPS 網址，允許麥克風與語音辨識。遇到無法辨識時，確認網路及 Siri／聽寫設定。按「聽示範」聽一次，再按「換我讀」。無辨識支援時仍可聽示範，不會自動判為過關。網站不儲存音訊；瀏覽器提供的辨識服務可能將音訊送至其服務供應商。

Safari 支援來源：[WebKit 官方說明](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/)。實際 iPad Air M4 麥克風與中文語音品質尚待真機驗證。

## 開發與發布

Node.js 22.13+。`npm ci` 安裝，`npm run dev` 本機預覽，`npm run check` 型別檢查，`npm test` 題庫檢查，`npm run build` 產生 `dist-pages`。

採 Sites 起始 React 套件，為 GitHub Pages 使用獨立 Vite 靜態入口，不需要後端、API 金鑰或 Cloudflare。`.github/workflows/pages.yml` 在 main 分支更新後驗證並發布；GitHub Pages 的來源須選 GitHub Actions。

`scripts/browser-check.cjs` 使用 Playwright 與 Edge，需透過 `PLAYWRIGHT_MODULE` 指定可用套件路徑，`BROWSER_PATH` 可指定瀏覽器。該測試的語音回覆是模擬值，只驗證流程，不代表真實發音辨識已驗收。

## 目前驗證範圍

題庫數量、唯一性、單字來源、注音欄位與字數一致、TypeScript、靜態建置。模擬瀏覽器測試涵蓋讀對圈圈、讀錯示範、權限失敗、49→50 及 99→100 解鎖、進度保存、句子作答及不同視窗寬度。真機語音、童聲辨識準確率、紙本教材逐字比對仍須實際確認。
