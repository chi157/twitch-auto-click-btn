// Popup UI 控制邏輯

let twitchTabs = [];
let settings = {
  enabled: true,
  checkInterval: 3,
  autoClaimSettings: {} // { streamerName: true/false }
};

let stats = {
  todayCount: 0,
  todayPoints: 0,
  totalPoints: 0,
  recentActivity: [],
  streamerStats: {} // { streamerName: { count: 0, points: 0 } }
};

// DOM 元素
const elements = {
  globalToggle: null,
  todayCount: null,
  totalCount: null,
  totalPoints: null,
  twitchTabs: null,
  recentActivity: null,
  intervalInput: null,
  clearDataBtn: null,
  refreshBtn: null
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] Initializing...');
  initElements();
  await loadSettings();
  await loadStats();
  await loadTwitchTabs();
  updateUI();
  attachEventListeners();
  
  // 監聽來自 background 的訊息
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // 監聽 storage 變化，立即更新 UI
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.stats) {
      console.log('[Popup] 📦 Storage changed, updating UI immediately');
      loadStats().then(() => {
        updateUI();
      });
    }
  });
  
  // 每 500ms 自動刷新一次資料（當 popup 開啟時）提供即時更新
  setInterval(async () => {
    await loadStats();
    updateUI();
  }, 500);
  
  console.log('[Popup] Initialized successfully');
});

// 初始化 DOM 元素
function initElements() {
  elements.globalToggle = document.getElementById('globalToggle');
  elements.todayCount = document.getElementById('todayCount');
  elements.totalCount = document.getElementById('todayPoints');
  elements.totalPoints = document.getElementById('totalPoints');
  elements.twitchTabs = document.getElementById('twitchTabs');
  elements.recentActivity = document.getElementById('recentActivity');
  elements.intervalInput = document.getElementById('intervalInput');
  elements.clearDataBtn = document.getElementById('clearDataBtn');
  elements.refreshBtn = document.getElementById('refreshBtn');
}

// 載入設定
async function loadSettings() {
  const result = await chrome.storage.local.get(['settings', 'autoClaimSettings']);
  
  if (result.settings) {
    settings = { ...settings, ...result.settings };
  }
  
  if (result.autoClaimSettings) {
    settings.autoClaimSettings = result.autoClaimSettings;
  }
  
  // 更新 UI
  elements.globalToggle.checked = settings.enabled;
  elements.intervalInput.value = settings.checkInterval;
}

// 載入統計資料
async function loadStats() {
  const result = await chrome.storage.local.get(['stats']);
  
  if (result.stats) {
    stats = { ...stats, ...result.stats };
    
    console.log('[Popup] Stats loaded:', {
      todayCount: stats.todayCount,
      todayPoints: stats.todayPoints,
      totalPoints: stats.totalPoints,
      activityCount: stats.recentActivity?.length || 0,
      streamerCount: Object.keys(stats.streamerStats || {}).length
    });
    
    // 確保 recentActivity 是陣列
    if (!Array.isArray(stats.recentActivity)) {
      console.warn('[Popup] recentActivity is not an array, resetting to []');
      stats.recentActivity = [];
    }
    
    // 確保 streamerStats 是物件
    if (!stats.streamerStats || typeof stats.streamerStats !== 'object') {
      console.warn('[Popup] streamerStats is not an object, resetting to {}');
      stats.streamerStats = {};
    }
    
    // 檢查是否需要重置今日計數
    const today = new Date().toDateString();
    if (stats.lastResetDate !== today) {
      stats.todayCount = 0;
      stats.todayPoints = 0;
      stats.lastResetDate = today;
      await saveStats();
    }
  }
}

// 載入 Twitch 分頁
async function loadTwitchTabs() {
  const tabs = await chrome.tabs.query({ url: '*://*.twitch.tv/*' });
  
  twitchTabs = tabs
    .filter(tab => {
      // 只顯示實況主頁面（排除首頁、設定等）
      const url = new URL(tab.url);
      const pathParts = url.pathname.split('/').filter(p => p);
      return pathParts.length >= 1 && !['directory', 'settings', 'subscriptions'].includes(pathParts[0]);
    })
    .map(tab => {
      const url = new URL(tab.url);
      const streamerName = url.pathname.split('/').filter(p => p)[0];
      return {
        id: tab.id,
        streamerName: streamerName,
        url: tab.url,
        title: tab.title,
        enabled: settings.autoClaimSettings[streamerName] !== false
      };
    });
}

// 更新 UI
function updateUI() {
  updateStats();
  updateTwitchTabsList();
  updateRecentActivity();
}

// 更新統計數字
function updateStats() {
  // 今日已領 = 今日領取次數
  elements.todayCount.textContent = stats.todayCount || 0;
  // 今日點數 = 今日獲得的點數
  elements.totalCount.textContent = (stats.todayPoints || 0).toLocaleString();
  // 總計點數 = 累計總點數（跨日累計）
  elements.totalPoints.textContent = (stats.totalPoints || 0).toLocaleString();
}

// 更新 Twitch 分頁列表
function updateTwitchTabsList() {
  if (twitchTabs.length === 0) {
    elements.twitchTabs.innerHTML = `
      <div class="empty-state">
        <p>沒有開啟的 Twitch 分頁</p>
        <small>請開啟 Twitch 實況頁面</small>
      </div>
    `;
    return;
  }

  elements.twitchTabs.innerHTML = twitchTabs.map(tab => {
    const streamerStats = stats.streamerStats?.[tab.streamerName] || { count: 0, points: 0 };
    return `
    <div class="tab-item" data-tab-id="${tab.id}">
      <div class="tab-info">
        <div class="tab-streamer">
          <span class="status-indicator ${tab.enabled ? 'status-active' : 'status-inactive'}"></span>
          ${tab.streamerName}
        </div>
        <div class="tab-url">${tab.title}</div>
        <div class="tab-stats">
          <small>🎯 ${streamerStats.count} 次 | 💰 ${streamerStats.points.toLocaleString()} 點</small>
        </div>
      </div>
      <div class="tab-toggle">
        <label class="toggle-switch">
          <input type="checkbox" ${tab.enabled ? 'checked' : ''} 
                 onchange="toggleTabAutoClick('${tab.streamerName}', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
    </div>
  `;
  }).join('');
}

// 更新最近活動
function updateRecentActivity() {
  console.log('[Twitch Auto Claim] Updating recent activity, count:', stats.recentActivity?.length || 0);
  
  if (!stats.recentActivity || stats.recentActivity.length === 0) {
    elements.recentActivity.innerHTML = `
      <div class="empty-state">
        <p>尚無活動記錄</p>
      </div>
    `;
    return;
  }

  elements.recentActivity.innerHTML = stats.recentActivity
    .slice(0, 20) // 顯示最近 20 筆
    .map(activity => `
      <div class="activity-item">
        <span class="activity-icon">✓</span>
        <span class="activity-text">在 ${activity.streamer} 獲得 ${activity.points || 50} 點</span>
        <span class="activity-time">${activity.time}</span>
      </div>
    `).join('');
  
  console.log('[Twitch Auto Claim] Recent activity updated, showing', Math.min(stats.recentActivity.length, 20), 'items');
}

// 附加事件監聽器
function attachEventListeners() {
  // 全域開關
  elements.globalToggle.addEventListener('change', async (e) => {
    settings.enabled = e.target.checked;
    await saveSettings();
    
    // 通知所有 content scripts
    const tabs = await chrome.tabs.query({ url: '*://*.twitch.tv/*' });
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_ENABLED',
        enabled: settings.enabled
      }).catch(() => {});
    });
  });

  // 檢查間隔
  elements.intervalInput.addEventListener('change', async (e) => {
    const value = parseInt(e.target.value);
    if (value >= 2 && value <= 10) {
      settings.checkInterval = value;
      await saveSettings();
      
      // 通知 background script 更新間隔
      chrome.runtime.sendMessage({
        type: 'UPDATE_INTERVAL',
        interval: value * 1000
      });
    }
  });

  // 清除記錄
  elements.clearDataBtn.addEventListener('click', async () => {
    if (confirm('確定要清除所有記錄嗎？')) {
      // 清除統計但保留資料結構
      stats.todayCount = 0;
      stats.todayPoints = 0;
      stats.totalPoints = 0;
      stats.recentActivity = [];
      // 保留 streamerStats 結構，但重置數值
      if (stats.streamerStats) {
        Object.keys(stats.streamerStats).forEach(streamer => {
          stats.streamerStats[streamer] = { count: 0, points: 0 };
        });
      } else {
        stats.streamerStats = {};
      }
      stats.lastResetDate = new Date().toDateString();
      await saveStats();
      updateUI();
      console.log('[Twitch Auto Claim] Data cleared successfully');
    }
  });

  // 重新整理
  elements.refreshBtn.addEventListener('click', async () => {
    await loadTwitchTabs();
    updateUI();
  });
}

// 切換分頁自動點擊
window.toggleTabAutoClick = async function(streamerName, enabled) {
  settings.autoClaimSettings[streamerName] = enabled;
  await chrome.storage.local.set({ autoClaimSettings: settings.autoClaimSettings });
  
  // 通知對應的 content script
  const tab = twitchTabs.find(t => t.streamerName === streamerName);
  if (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'TOGGLE_ENABLED',
      enabled: enabled
    }).catch(() => {});
    
    // 更新本地狀態
    tab.enabled = enabled;
    updateTwitchTabsList();
  }
};

// 處理來自 background 的訊息
function handleMessage(message, sender, sendResponse) {
  console.log('[Popup] 📨 Received message:', message);
  
  if (message.type === 'BONUS_CLAIMED') {
    console.log('[Popup] 🎁 Bonus claimed, updating immediately...');
    // 立即重新載入所有資料
    Promise.all([
      loadStats(),
      loadTwitchTabs()
    ]).then(() => {
      updateUI();
      console.log('[Popup] ✅ UI updated immediately after bonus claimed');
    });
  }
}

// 儲存設定
async function saveSettings() {
  await chrome.storage.local.set({ settings });
}

// 儲存統計
async function saveStats() {
  await chrome.storage.local.set({ stats });
}
