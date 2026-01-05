// Background Service Worker
// 管理擴充功能的背景邏輯

console.log('[Twitch Auto Claim] Background service worker started');

// 初始化
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // 首次安裝，設定預設值
    await chrome.storage.local.set({
      settings: {
        enabled: true,
        checkInterval: 3
      },
      stats: {
        todayCount: 0,
        todayPoints: 0,
        totalPoints: 0,
        recentActivity: [],
        lastResetDate: new Date().toDateString(),
        streamerStats: {} // { streamerName: { count: 0, points: 0 } }
      },
      autoClaimSettings: {}
    });
    
    console.log('[Twitch Auto Claim] Extension installed, default settings saved');
  } else if (details.reason === 'update') {
    console.log('[Twitch Auto Claim] Extension updated');
  }
});

// 監聽來自 content script 和 popup 的訊息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Twitch Auto Claim] Received message:', message);
  
  // 使用 Promise 處理異步操作
  if (message.type === 'BONUS_CLAIMED') {
    handleBonusClaimed(message, sender).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('[Twitch Auto Claim] Error handling bonus claimed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 表示會異步回應
  }
  
  if (message.type === 'UPDATE_INTERVAL') {
    console.log('[Twitch Auto Claim] Update interval to', message.interval);
    sendResponse({ success: true });
    return false;
  }
  
  console.log('[Twitch Auto Claim] Unknown message type:', message.type);
  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

// 處理獎勵領取事件
async function handleBonusClaimed(message, sender) {
  console.log('[Twitch Auto Claim] Bonus claimed:', message.streamer, 'at', message.time);
  console.log('[Twitch Auto Claim] Points earned:', message.pointsEarned);
  
  // 獲取當前統計資料
  const result = await chrome.storage.local.get(['stats', 'settings']);
  let stats = result.stats || {
    todayCount: 0,
    todayPoints: 0,
    totalPoints: 0,
    recentActivity: [],
    lastResetDate: new Date().toDateString(),
    streamerStats: {}
  };
  
  console.log('[Twitch Auto Claim] 📋 Current stats:', {
    todayCount: stats.todayCount,
    todayPoints: stats.todayPoints,
    totalPoints: stats.totalPoints,
    activityCount: stats.recentActivity?.length || 0
  });
  
  // 確保 recentActivity 是陣列
  if (!Array.isArray(stats.recentActivity)) {
    console.warn('[Twitch Auto Claim] ⚠️ recentActivity is not an array, initializing...');
    stats.recentActivity = [];
  }
  
  // 確保 streamerStats 是物件
  if (!stats.streamerStats || typeof stats.streamerStats !== 'object') {
    console.warn('[Twitch Auto Claim] ⚠️ streamerStats is not an object, initializing...');
    stats.streamerStats = {};
  }
  
  // 檢查是否需要重置今日計數
  const today = new Date().toDateString();
  if (stats.lastResetDate !== today) {
    console.log('[Twitch Auto Claim] 🔄 Daily reset triggered');
    stats.todayCount = 0;
    stats.todayPoints = 0;
    stats.lastResetDate = today;
  }
  
  // 更新統計
  const pointsEarned = message.pointsEarned || 50;
  stats.todayCount++;
  stats.todayPoints += pointsEarned;
  stats.totalPoints += pointsEarned;
  
  console.log('[Twitch Auto Claim] 📈 Updated counts:', {
    todayCount: stats.todayCount,
    todayPoints: stats.todayPoints,
    totalPoints: stats.totalPoints
  });
  
  // 更新實況主統計
  if (!stats.streamerStats[message.streamer]) {
    stats.streamerStats[message.streamer] = { count: 0, points: 0 };
  }
  stats.streamerStats[message.streamer].count++;
  stats.streamerStats[message.streamer].points += pointsEarned;
  
  console.log('[Twitch Auto Claim] 👤 Streamer stats for', message.streamer, ':', stats.streamerStats[message.streamer]);
  
  // 新增活動記錄
  const newActivity = {
    streamer: message.streamer,
    time: message.time,
    points: pointsEarned,
    timestamp: Date.now(),
    tabId: sender.tab?.id
  };
  
  console.log('[Twitch Auto Claim] 📝 Adding new activity:', newActivity);
  console.log('[Twitch Auto Claim] 📝 Activity count before:', stats.recentActivity.length);
  
  stats.recentActivity.unshift(newActivity);
  
  console.log('[Twitch Auto Claim] 📝 Activity count after:', stats.recentActivity.length);
  
  // 只保留最近 20 筆
  if (stats.recentActivity.length > 20) {
    stats.recentActivity = stats.recentActivity.slice(0, 20);
    console.log('[Twitch Auto Claim] ✂️ Trimmed to 20 activities');
  }
  
  console.log('[Twitch Auto Claim] 📊 Final stats:', {
    todayCount: stats.todayCount,
    todayPoints: stats.todayPoints,
    totalPoints: stats.totalPoints,
    activityCount: stats.recentActivity.length,
    latestActivity: stats.recentActivity[0]
  });
  
  // 儲存統計
  try {
    await chrome.storage.local.set({ stats });
    console.log('[Twitch Auto Claim] ✅ Stats saved to storage successfully');
    console.log('[Twitch Auto Claim] 📊 New stats:', JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('[Twitch Auto Claim] ❌ Failed to save stats:', error);
    return; // 儲存失敗就不繼續
  }
  
  // 通知所有開啟的 popup（如果有的話）
  try {
    chrome.runtime.sendMessage({
      type: 'BONUS_CLAIMED',
      streamer: message.streamer,
      time: message.time,
      pointsEarned: pointsEarned
    });
    console.log('[Twitch Auto Claim] ✅ Sent update to popup');
  } catch (error) {
    // Popup 可能沒開，忽略錯誤
    console.log('[Twitch Auto Claim] ⚠️ Popup not open, skipping message');
  }
  
  // 顯示通知
  showNotification(message.streamer, pointsEarned, stats.todayPoints, stats.totalPoints);
}

// 顯示通知
function showNotification(streamer, pointsEarned, todayPoints, totalPoints) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: '🎁 Twitch 獎勵已領取',
    message: `在 ${streamer} 頻道獲得 ${pointsEarned} 點！\n今日：${todayPoints} 點 | 總計：${totalPoints} 點`,
    priority: 1,
    requireInteraction: false
  });
}

// 監聽分頁關閉事件
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  // 可以在這裡清理該分頁的相關資料
  console.log('[Twitch Auto Claim] Tab closed:', tabId);
});

// 監聽分頁更新事件
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 當分頁完成載入且是 Twitch 頁面時，可以進行一些初始化
  if (changeInfo.status === 'complete' && tab.url?.includes('twitch.tv')) {
    console.log('[Twitch Auto Claim] Twitch tab loaded:', tab.url);
  }
});

// 定期重置今日計數（每天午夜）
function scheduleDailyReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const timeUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(async () => {
    const result = await chrome.storage.local.get(['stats']);
    if (result.stats) {
      result.stats.todayCount = 0;
      result.stats.todayPoints = 0;
      result.stats.lastResetDate = new Date().toDateString();
      await chrome.storage.local.set({ stats: result.stats });
      console.log('[Twitch Auto Claim] Daily count reset');
    }
    
    // 排程下一次重置
    scheduleDailyReset();
  }, timeUntilMidnight);
}

// 啟動每日重置排程
scheduleDailyReset();

console.log('[Twitch Auto Claim] Background service worker initialized');
