# 🎁 Twitch Auto Claim Bonus - Chrome 擴充功能

自動點擊 Twitch 頻道的 "Claim Bonus" 按鈕，支援多分頁管理和統計功能。

## ✨ 功能特色

- ✅ **自動領取獎勵**：自動偵測並點擊 Twitch 的 Claim Bonus 按鈕
- 🎯 **多分頁管理**：可以同時管理多個 Twitch 實況分頁
- 🔧 **個別控制**：為每個實況主獨立設定是否自動領取
- 📊 **統計功能**：追蹤今日和總計領取次數
- 📝 **活動記錄**：顯示最近的領取記錄
- 🔔 **通知提醒**：領取成功時顯示桌面通知（可選）
- 🎨 **美觀 UI**：簡潔直觀的控制面板

## 📦 安裝方式

### 方法 1：開發者模式安裝（本地）

1. 下載或克隆此專案到本地
2. 開啟 Chrome 瀏覽器
3. 進入 `chrome://extensions/`（在網址列輸入）
4. 開啟右上角的「開發人員模式」
5. 點擊「載入未封裝項目」
6. 選擇此專案的資料夾
7. 完成！擴充功能圖示會出現在瀏覽器工具列

### 方法 2：Edge 瀏覽器

Edge 瀏覽器也支援 Chrome 擴充功能：
1. 開啟 `edge://extensions/`
2. 開啟「開發人員模式」
3. 點擊「載入解壓縮的擴充功能」
4. 選擇此專案資料夾

## 🚀 使用方法

### 基本使用

1. **開啟 Twitch 實況**
   - 打開一個或多個 Twitch 實況主頁面
   - 例如：`https://www.twitch.tv/vedal987`

2. **啟用自動領取**
   - 點擊瀏覽器工具列的擴充功能圖示
   - 確認「全域啟用」開關是開啟的
   - 在「開啟的實況」列表中查看所有 Twitch 分頁

3. **個別控制**
   - 每個實況主旁邊都有獨立開關
   - 關閉特定實況主的開關，該分頁就不會自動領取

### 進階設定

- **檢查間隔**：調整自動檢查按鈕的時間間隔（2-10 秒）
- **顯示通知**：領取成功時是否顯示桌面通知
- **播放音效**：領取成功時是否播放提示音

### 查看統計

- **今日已領取**：今天已經領取的次數（每日午夜自動重置）
- **總計領取**：累計總共領取的次數
- **最近活動**：查看最近 10 筆領取記錄

## 🔧 技術細節

### 檔案結構

```
twtich_auto_click_btn/
├── manifest.json          # 擴充功能配置檔
├── background.js          # 背景服務（統計、通知）
├── content.js            # 內容腳本（自動點擊邏輯）
├── popup.html            # 控制面板 HTML
├── popup.css             # 控制面板樣式
├── popup.js              # 控制面板邏輯
├── icons/                # 圖示資料夾
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # 說明文件
```

### 工作原理

1. **Content Script**（content.js）
   - 在每個 Twitch 分頁中執行
   - 使用 `MutationObserver` 監聽 DOM 變化
   - 定期檢查 `button[aria-label="Claim Bonus"]`
   - 找到按鈕後自動點擊

2. **Background Service Worker**（background.js）
   - 管理全域設定和統計資料
   - 處理通知顯示
   - 每日午夜自動重置今日計數

3. **Popup UI**（popup.html/css/js）
   - 提供使用者控制介面
   - 顯示所有開啟的 Twitch 分頁
   - 管理每個實況主的自動領取設定
   - 顯示統計和活動記錄

### 按鈕選擇器

擴充功能透過以下 CSS 選擇器找到按鈕：
```javascript
'button[aria-label="Claim Bonus"]'
```

這個選擇器對應 Twitch 的 HTML 結構：
```html
<button aria-label="Claim Bonus" class="...">
  <!-- 按鈕內容 -->
</button>
```

## ⚙️ 設定檔案

擴充功能使用 Chrome Storage API 儲存設定，包括：

- **settings**：全域設定（啟用狀態、通知、音效等）
- **autoClaimSettings**：每個實況主的個別設定
- **stats**：統計資料（計數、活動記錄）

## 🛡️ 隱私與安全

- ✅ **本地執行**：所有程式碼都在你的瀏覽器本地執行
- ✅ **無資料上傳**：不會將任何資料傳送到外部伺服器
- ✅ **最小權限**：只請求必要的 `storage` 和 `tabs` 權限
- ✅ **開源透明**：所有程式碼都可以檢查

## 📝 注意事項

1. **分頁必須開啟**
   - 擴充功能只能在「已開啟」的 Twitch 分頁中運作
   - 關閉分頁後，該分頁的自動領取會停止

2. **瀏覽器必須執行**
   - Chrome/Edge 必須保持開啟
   - 最小化視窗仍然有效，但關閉瀏覽器就無法運作

3. **背景執行**
   - 你可以切換到其他分頁或程式
   - 只要 Twitch 分頁還開著，擴充功能就會在背景自動執行

4. **Twitch 更新**
   - 如果 Twitch 更新網站結構或按鈕屬性
   - 可能需要更新擴充功能的選擇器

## 🐛 疑難排解

### 擴充功能沒有自動點擊

1. 檢查「全域啟用」開關是否開啟
2. 檢查該實況主的個別開關是否開啟
3. 開啟瀏覽器開發者工具（F12）→ Console
4. 查看是否有 `[Twitch Auto Claim]` 的日誌訊息

### 看不到 Twitch 分頁

1. 確認你開啟的是實況主頁面（例如 `/vedal987`）
2. 不是 Twitch 首頁或其他頁面
3. 點擊「重新整理」按鈕更新列表

### 統計數字不正確

1. 點擊「清除記錄」重置統計
2. 今日計數會在每天午夜自動重置

## 🔄 開機自動啟動

Chrome 擴充功能會隨瀏覽器自動載入：

1. **Windows 開機自動啟動 Chrome**
   - 按 `Win + R` 輸入 `shell:startup`
   - 建立 Chrome 的捷徑到這個資料夾
   - 或在 Chrome 設定中啟用「在背景繼續執行應用程式」

2. **Mac 開機自動啟動 Chrome**
   - 系統偏好設定 → 使用者與群組 → 登入項目
   - 新增 Chrome 應用程式

## 📚 開發者資訊

### 修改程式碼

如果你想修改擴充功能：

1. 編輯相應的檔案（content.js、popup.js 等）
2. 回到 `chrome://extensions/`
3. 點擊擴充功能卡片上的「重新載入」圖示
4. 重新整理 Twitch 分頁以套用變更

### 自訂按鈕選擇器

如果 Twitch 更新了按鈕的屬性，在 [content.js](content.js) 中修改：

```javascript
const CONFIG = {
  BUTTON_SELECTOR: 'button[aria-label="Claim Bonus"]', // 修改這裡
  // ...
};
```

### 調整檢查頻率

在 [content.js](content.js) 中修改預設檢查間隔：

```javascript
const CONFIG = {
  CHECK_INTERVAL: 3000, // 修改這裡（毫秒）
  // ...
};
```

## 📄 授權

MIT License - 可自由使用、修改和分發

## 🙏 致謝

- 感謝 Twitch 提供精彩的實況平台
- 感謝所有使用和貢獻的使用者

## 📮 回饋與支援

如有問題或建議，歡迎：
- 提交 Issue
- 提交 Pull Request
- 分享使用心得

---

**注意**：此擴充功能僅供個人使用和學習目的，請遵守 Twitch 服務條款。
