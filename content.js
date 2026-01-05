// Twitch Auto Claim Bonus - Content Script
// 自動點擊 Claim Bonus 按鈕

const CONFIG = {
  CHECK_INTERVAL: 3000, // 每 3 秒檢查一次
  BUTTON_SELECTOR: 'button[aria-label="Claim Bonus"]',
  LOG_PREFIX: '[Twitch Auto Claim]'
};

let isEnabled = true;
let checkInterval = null;
let lastClickTime = 0;

// 初始化：從 storage 讀取設定
async function init() {
  try {
    const result = await chrome.storage.local.get(['enabled', 'autoClaimSettings']);
    
    // 檢查全域是否啟用
    if (result.enabled === false) {
      isEnabled = false;
      console.log(CONFIG.LOG_PREFIX, '全域已停用');
      return;
    }

    // 檢查此分頁是否啟用（根據實況主）
    const streamerName = getStreamerName();
    if (streamerName && result.autoClaimSettings) {
      isEnabled = result.autoClaimSettings[streamerName] !== false;
      console.log(CONFIG.LOG_PREFIX, `實況主 ${streamerName} 自動領取：${isEnabled ? '啟用' : '停用'}`);
    }

    if (isEnabled) {
      startAutoClick();
    }
  } catch (error) {
    console.error(CONFIG.LOG_PREFIX, '初始化失敗：', error);
  }
}

// 獲取當前實況主名稱
function getStreamerName() {
  const pathParts = window.location.pathname.split('/').filter(p => p);
  return pathParts[0] || null;
}

// 開始自動點擊
function startAutoClick() {
  if (checkInterval) {
    clearInterval(checkInterval);
  }

  console.log(CONFIG.LOG_PREFIX, '開始自動點擊');
  
  // 立即執行一次
  checkAndClickBonus();
  
  // 設定定時檢查
  checkInterval = setInterval(checkAndClickBonus, CONFIG.CHECK_INTERVAL);
}

// 停止自動點擊
function stopAutoClick() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log(CONFIG.LOG_PREFIX, '停止自動點擊');
  }
}

// 檢查並點擊 Bonus 按鈕
function checkAndClickBonus() {
  if (!isEnabled) return;

  const button = document.querySelector(CONFIG.BUTTON_SELECTOR);
  
  if (button && isButtonVisible(button)) {
    // 避免重複點擊（3秒內不重複）
    const now = Date.now();
    if (now - lastClickTime < 3000) {
      return;
    }

    console.log(CONFIG.LOG_PREFIX, '找到 Bonus 按鈕，準備點擊');
    
    try {
      button.click();
      lastClickTime = now;
      
      // 發送通知給 popup
      chrome.runtime.sendMessage({
        type: 'BONUS_CLAIMED',
        streamer: getStreamerName(),
        time: new Date().toLocaleTimeString('zh-TW')
      }).catch(() => {
        // Popup 可能沒開，忽略錯誤
      });

      console.log(CONFIG.LOG_PREFIX, '✓ 成功點擊 Bonus 按鈕');
    } catch (error) {
      console.error(CONFIG.LOG_PREFIX, '點擊失敗：', error);
    }
  }
}

// 檢查按鈕是否可見
function isButtonVisible(element) {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

// 監聽來自 popup 的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'TOGGLE_ENABLED':
      isEnabled = message.enabled;
      if (isEnabled) {
        startAutoClick();
      } else {
        stopAutoClick();
      }
      sendResponse({ success: true });
      break;

    case 'GET_STATUS':
      sendResponse({
        enabled: isEnabled,
        streamer: getStreamerName(),
        url: window.location.href
      });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true; // 保持訊息通道開啟
});

// 頁面載入完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 使用 MutationObserver 監聽 DOM 變化（更高效的方式）
const observer = new MutationObserver((mutations) => {
  if (!isEnabled) return;
  
  for (const mutation of mutations) {
    // 檢查新增的節點中是否有 Bonus 按鈕
    for (const node of mutation.addedNodes) {
      if (node.nodeType === 1) { // Element node
        if (node.matches && node.matches(CONFIG.BUTTON_SELECTOR)) {
          console.log(CONFIG.LOG_PREFIX, '偵測到 Bonus 按鈕出現');
          setTimeout(checkAndClickBonus, 500); // 稍微延遲確保按鈕完全載入
          return;
        }
        
        // 檢查子節點
        const button = node.querySelector && node.querySelector(CONFIG.BUTTON_SELECTOR);
        if (button) {
          console.log(CONFIG.LOG_PREFIX, '偵測到 Bonus 按鈕出現（子節點）');
          setTimeout(checkAndClickBonus, 500);
          return;
        }
      }
    }
  }
});

// 開始監聽 DOM 變化
observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log(CONFIG.LOG_PREFIX, '已載入並開始監聽');
