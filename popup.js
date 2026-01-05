// Popup UI 控制邏輯

let twitchTabs = [];
let settings = {
  enabled: true,
  showNotification: true,
  playSound: false,
  checkInterval: 3,
  autoClaimSettings: {} // { streamerName: true/false }
};

let stats = {
  todayCount: 0,
  totalCount: 0,
  recentActivity: []
};

// DOM 元素
const elements = {
  globalToggle: null,
  todayCount: null,
  totalCount: null,
  twitchTabs: null,
  recentActivity: null,
  notificationToggle: null,
  soundToggle: null,
  intervalInput: null,
  clearDataBtn: null,
  refreshBtn: null
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  initElements();
  await loadSettings();
  await loadStats();
  await loadTwitchTabs();
  updateUI();
  attachEventListeners();
  
  // 監聽來自 content script 的訊息
  chrome.runtime.onMessage.addListener(handleMessage);
});

// 初始化 DOM 元素
function initElements() {
  elements.globalToggle = document.getElementById('globalToggle');
  elements.todayCount = document.getElementById('todayCount');
  elements.totalCount = document.getElementById('totalCount');
  elements.twitchTabs = document.getElementById('twitchTabs');
  elements.recentActivity = document.getElementById('recentActivity');
  elements.notificationToggle = document.getElementById('notificationToggle');
  elements.soundToggle = document.getElementById('soundToggle');
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
  elements.notificationToggle.checked = settings.showNotification;
  elements.soundToggle.checked = settings.playSound;
  elements.intervalInput.value = settings.checkInterval;
}

// 載入統計資料
async function loadStats() {
  const result = await chrome.storage.local.get(['stats']);
  
  if (result.stats) {
    stats = { ...stats, ...result.stats };
    
    // 檢查是否需要重置今日計數
    const today = new Date().toDateString();
    if (stats.lastResetDate !== today) {
      stats.todayCount = 0;
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
  elements.todayCount.textContent = stats.todayCount;
  elements.totalCount.textContent = stats.totalCount;
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

  elements.twitchTabs.innerHTML = twitchTabs.map(tab => `
    <div class="tab-item" data-tab-id="${tab.id}">
      <div class="tab-info">
        <div class="tab-streamer">
          <span class="status-indicator ${tab.enabled ? 'status-active' : 'status-inactive'}"></span>
          ${tab.streamerName}
        </div>
        <div class="tab-url">${tab.title}</div>
      </div>
      <div class="tab-toggle">
        <label class="toggle-switch">
          <input type="checkbox" ${tab.enabled ? 'checked' : ''} 
                 onchange="toggleTabAutoClick('${tab.streamerName}', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
    </div>
  `).join('');
}

// 更新最近活動
function updateRecentActivity() {
  if (!stats.recentActivity || stats.recentActivity.length === 0) {
    elements.recentActivity.innerHTML = `
      <div class="empty-state">
        <p>尚無活動記錄</p>
      </div>
    `;
    return;
  }

  elements.recentActivity.innerHTML = stats.recentActivity
    .slice(0, 10) // 只顯示最近 10 筆
    .map(activity => `
      <div class="activity-item">
        <span class="activity-icon">✓</span>
        <span class="activity-text">在 ${activity.streamer} 領取獎勵</span>
        <span class="activity-time">${activity.time}</span>
      </div>
    `).join('');
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

  // 通知開關
  elements.notificationToggle.addEventListener('change', async (e) => {
    settings.showNotification = e.target.checked;
    await saveSettings();
  });

  // 音效開關
  elements.soundToggle.addEventListener('change', async (e) => {
    settings.playSound = e.target.checked;
    await saveSettings();
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
      stats.todayCount = 0;
      stats.totalCount = 0;
      stats.recentActivity = [];
      await saveStats();
      updateUI();
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

// 處理來自 content script 的訊息
function handleMessage(message, sender, sendResponse) {
  if (message.type === 'BONUS_CLAIMED') {
    // 更新統計
    stats.todayCount++;
    stats.totalCount++;
    
    // 新增活動記錄
    stats.recentActivity.unshift({
      streamer: message.streamer,
      time: message.time,
      timestamp: Date.now()
    });
    
    // 只保留最近 50 筆
    if (stats.recentActivity.length > 50) {
      stats.recentActivity = stats.recentActivity.slice(0, 50);
    }
    
    saveStats();
    updateUI();
    
    // 顯示通知
    if (settings.showNotification) {
      showNotification(message.streamer);
    }
    
    // 播放音效
    if (settings.playSound) {
      playSound();
    }
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

// 顯示通知
function showNotification(streamer) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Twitch Auto Claim',
    message: `已在 ${streamer} 頻道領取獎勵！`,
    priority: 0
  });
}

// 播放音效
function playSound() {
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuFzvLaizsIHm7A7+OZSA0PVqzn77BZFQxMouTwtGQcCDKK0fPTeTAFKHzJ79qOPwsVY7rx6KNQDwpDod/xwmceBDqO0vPPdCwFLIHO8tmKNwofa8Ht5plNDw5Tqufo69RiFg1Hp+HzwmsgBCB8yfDek0MLFWHB7+mhURAOUKbl8bllHAg2jdL00HkwBSh+yO/ekkEMFGO68OmjUhEPR6Pg88JrIQQ7jtHz0XQtBSuBzvLZjTgKH27C7eaZTg8PVKzn6+vVYhYNSKfh88JrIQQ7jtLz0HQtBSuAzvLajTgKH2/C7eWaTg8PVqzn6+vVYxYNR6fh88FrIgQ7jtLz0HQuBSt/zvLajTgKIG/C7eWaTg8PVq3o6+vVYxYMR6fh88FrIgQ6jtLz0HQuBSt/zvLajTgKIG7C7eWaTw8PVq3o6+vWYxYMRqfh88FrIgQ6jtHz0HQuBSt/zvLajTgKH27C7eWaTw8PVq3o6+vWYxYMRqfh88FrIgQ6jtHz0HQuBSuAzvLajTgKH27C7eWaTw8PVq3o6+vWYxYMRqfh88FrIgQ6jtHz0HQuBSuAzvLajTgKH27C7eWaTw8PVq3o6+vWYxYMRqfh88FrIgQ6jtHz0HQuBSuAzvLajTgKH27C7eWaTw8PVq3o6+vWYxYMRqfh88FrIgQ6jtHz0HQuBSuAzvLajTgKH27C7eWaTw8PVq3o6+vWYxYMRqfh88FrIgQ6jtHz0HQuBSuAzvLajTgKH27C7eWaTw8PVq3o6+vWYxYMRqfh88FrIgQ6jtHz0HQuBSuAzvLajTgKH27C7eWaTw8PVq3o6+vWYxYMRqfh88FrIgQ6jtHz0HQuBSuAzvLajTgKH27C7eWaTw8PVq3o6+vWYxYMRqfh88FrIg==');
  audio.volume = 0.3;
  audio.play().catch(() => {});
}
