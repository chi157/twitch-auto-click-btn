// Twitch Auto Claim Bonus - Content Script
// 自動點擊 Claim Bonus 按鈕

const CONFIG = {
  CHECK_INTERVAL: 3000, // 每 3 秒檢查一次
  BUTTON_SELECTOR: 'button[aria-label="Claim Bonus"]',
  LOG_PREFIX: '[Twitch Auto Claim]',
  DEBUG_MODE: true // 開啟除錯模式
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

// 獲取當前頻道點數
function getCurrentPoints() {
  try {
    // 嘗試從頁面讀取點數餘額
    const pointsElement = document.querySelector('[data-test-selector="copo-balance-string"]');
    if (pointsElement) {
      const pointsText = pointsElement.textContent.replace(/,/g, '');
      const points = parseInt(pointsText);
      return isNaN(points) ? 0 : points;
    }
  } catch (error) {
    console.log(CONFIG.LOG_PREFIX, '無法讀取點數：', error);
  }
  return 0;
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

  // 除錯模式：列出所有可能相關的按鈕
  if (CONFIG.DEBUG_MODE) {
    const allButtons = document.querySelectorAll('button');
    const bonusRelated = Array.from(allButtons).filter(btn => {
      const ariaLabel = btn.getAttribute('aria-label') || '';
      const className = btn.className || '';
      const text = btn.textContent || '';
      return (
        ariaLabel.toLowerCase().includes('claim') ||
        ariaLabel.toLowerCase().includes('bonus') ||
        className.includes('claimable') ||
        className.includes('bonus') ||
        text.toLowerCase().includes('claim')
      );
    });

    if (bonusRelated.length > 0) {
      console.log(CONFIG.LOG_PREFIX, `🔍 找到 ${bonusRelated.length} 個可能的獎勵按鈕：`);
      bonusRelated.forEach((btn, index) => {
        console.log(`  [${index + 1}] aria-label:`, btn.getAttribute('aria-label'));
        console.log(`      class:`, btn.className);
        console.log(`      text:`, btn.textContent.substring(0, 50));
        console.log(`      visible:`, isButtonVisible(btn));
      });
    }
  }

  // 嘗試多種 selector（以防 Twitch 更新）
  const selectors = [
    'button[aria-label="Claim Bonus"]',
    'button[aria-label*="Claim"]',
    'button[aria-label*="claim"]',
    'button[aria-label*="bonus"]',
    'button[data-a-target="community-points-bonus-claim"]',
    '.claimable-bonus button',
    '[class*="claimable-bonus"] button'
  ];

  let button = null;
  let usedSelector = '';

  // 逐一嘗試所有 selector
  for (const selector of selectors) {
    button = document.querySelector(selector);
    if (button) {
      usedSelector = selector;
      break;
    }
  }

  if (button && isButtonVisible(button)) {
    // 避免重複點擊（3秒內不重複）
    const now = Date.now();
    if (now - lastClickTime < 3000) {
      return;
    }

    console.log(CONFIG.LOG_PREFIX, '🎯 找到 Bonus 按鈕！');
    console.log(CONFIG.LOG_PREFIX, '使用的 selector:', usedSelector);
    console.log(CONFIG.LOG_PREFIX, '按鈕 aria-label:', button.getAttribute('aria-label'));
    
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

      console.log(CONFIG.LOG_PREFIX, '✅ 成功點擊 Bonus 按鈕');
    } catch (error) {
      console.error(CONFIG.LOG_PREFIX, '❌ 點擊失敗：', error);
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
        // 檢查多種可能的 selector
        const selectors = [
          'button[aria-label="Claim Bonus"]',
          'button[aria-label*="Claim"]',
          'button[aria-label*="claim"]',
          '[class*="claimable-bonus"]'
        ];

        for (const selector of selectors) {
          if (node.matches && node.matches(selector)) {
            console.log(CONFIG.LOG_PREFIX, '🎁 偵測到 Bonus 按鈕出現！（直接匹配）');
            console.log(CONFIG.LOG_PREFIX, '按鈕詳情:', node);
            // 立即點擊，不延遲
            setTimeout(checkAndClickBonus, 100);
            return;
          }
          
          // 檢查子節點
          const button = node.querySelector && node.querySelector(selector);
          if (button) {
            console.log(CONFIG.LOG_PREFIX, '🎁 偵測到 Bonus 按鈕出現！（子節點）');
            console.log(CONFIG.LOG_PREFIX, '按鈕 selector:', selector);
            console.log(CONFIG.LOG_PREFIX, '按鈕詳情:', button);
            console.log(CONFIG.LOG_PREFIX, 'aria-label:', button.getAttribute('aria-label'));
            console.log(CONFIG.LOG_PREFIX, 'visible:', isButtonVisible(button));
            
            // 立即嘗試點擊，不要等太久
            if (isButtonVisible(button)) {
              console.log(CONFIG.LOG_PREFIX, '⚡ 立即點擊按鈕！');
              try {
                // 點擊前記錄當前點數
                const pointsBefore = getCurrentPoints();
                
                button.click();
                lastClickTime = Date.now();
                
                // 等待點數更新後發送訊息
                setTimeout(() => {
                  const pointsAfter = getCurrentPoints();
                  const pointsEarned = pointsAfter - pointsBefore;
                  
                  const message = {
                    type: 'BONUS_CLAIMED',
                    streamer: getStreamerName(),
                    time: new Date().toLocaleTimeString('zh-TW'),
                    pointsEarned: pointsEarned > 0 ? pointsEarned : 50, // 預設50點
                    totalPoints: pointsAfter
                  };
                  
                  console.log(CONFIG.LOG_PREFIX, `📤 發送訊息到 background:`, message);
                  
                  chrome.runtime.sendMessage(message).then(() => {
                    console.log(CONFIG.LOG_PREFIX, `✅ 訊息發送成功`);
                  }).catch((error) => {
                    console.error(CONFIG.LOG_PREFIX, `❌ 訊息發送失敗:`, error);
                    console.error(CONFIG.LOG_PREFIX, `❌ 錯誤詳情:`, error.message);
                  });
                  
                  console.log(CONFIG.LOG_PREFIX, `✅ 成功點擊！獲得 ${pointsEarned > 0 ? pointsEarned : 50} 點`);
                }, 1000);
                
                console.log(CONFIG.LOG_PREFIX, '✅ 成功點擊 Bonus 按鈕（MutationObserver）');
              } catch (error) {
                console.error(CONFIG.LOG_PREFIX, '❌ 點擊失敗：', error);
              }
            } else {
              console.log(CONFIG.LOG_PREFIX, '⚠️ 按鈕不可見，稍後再試');
              setTimeout(checkAndClickBonus, 100);
            }
            return;
          }
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

console.log(CONFIG.LOG_PREFIX, '✅ 已載入並開始監聽（多重 selector 模式）');
