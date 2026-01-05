# 📦 圖示檔案說明

## 需要什麼圖示？

這個資料夾需要放 **4 個 PNG 圖片檔案**（都是同一張圖，只是大小不同）：

```
icons/
├── icon16.png   ← 16x16 像素（工具列小圖示）
├── icon32.png   ← 32x32 像素（擴充功能列表）
├── icon48.png   ← 48x48 像素（管理頁面）
└── icon128.png  ← 128x128 像素（高解析度版本）
```

---

## 🎨 建議的圖片

選一張你喜歡的圖片，例如：

| 圖示 | 說明 | 適合度 |
|------|------|--------|
| 🎁 | 禮物盒（最符合「Claim Bonus」主題） | ⭐⭐⭐⭐⭐ |
| 🎮 | 遊戲手把（代表遊戲/Twitch） | ⭐⭐⭐⭐ |
| 📺 | 電視（代表實況） | ⭐⭐⭐ |
| 💎 | 寶石（代表獎勵） | ⭐⭐⭐⭐ |
| 🤖 | 機器人（代表自動化） | ⭐⭐⭐⭐ |

---

## 🚀 快速生成（3 分鐘搞定）

### 步驟 1：下載一張圖片

**選項 A：使用 Emoji**
1. Google 搜尋「gift emoji png」或「twitch logo png」
2. 下載任何你喜歡的圖片

**選項 B：自己截圖 Emoji**
1. 按 `Win + .` 開啟 Windows emoji 面板
2. 找到 🎁 或其他圖示
3. 截圖並裁切成正方形

### 步驟 2：轉換成 4 種尺寸

**使用線上工具（最簡單）：**
1. 前往：https://redketchup.io/icon-converter
2. 上傳你的圖片
3. 勾選尺寸：16, 32, 48, 128
4. 點擊「Convert」並下載
5. 重新命名為：`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
6. 放到這個資料夾（`icons/`）

**或使用 Windows 小畫家：**
1. 開啟圖片 → 調整大小 → 輸入 128x128 → 另存為 `icon128.png`
2. 重複步驟，做出 48x48、32x32、16x16
3. 全部放到這個資料夾

---

## ⚡ 超級懶人方法

**如果你只想快速測試：**

1. 隨便找 1 張圖片（任何圖都可以）
2. 複製 4 份，分別重新命名為：
   - `icon16.png`
   - `icon32.png`
   - `icon48.png`
   - `icon128.png`
3. 放到這個資料夾

**尺寸不對也沒關係！** Chrome 會自動縮放，只是可能會有點模糊。

---

## ❓ 沒有圖示會怎樣？

- ❌ 擴充功能「無法安裝」（manifest.json 要求必須有圖示）
- ✅ 必須至少有這 4 個檔案，擴充功能才能正常載入

---

## 💡 推薦資源

**免費圖示下載：**
- https://www.flaticon.com/search?word=gift
- https://icons8.com/icons/set/gift
- https://www.iconfinder.com/search?q=gift&price=free

**線上轉換工具：**
- https://redketchup.io/icon-converter （推薦）
- https://www.favicon-generator.org/
- https://realfavicongenerator.net/

---

**完成後，這個資料夾應該有 5 個檔案：**
```
icons/
├── README.md      ← 這個說明檔
├── icon16.png     ← 你新增的
├── icon32.png     ← 你新增的
├── icon48.png     ← 你新增的
└── icon128.png    ← 你新增的
```

然後就可以安裝擴充功能了！🎉
