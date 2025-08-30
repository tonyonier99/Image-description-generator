/**
 * DiagnosticSystem - 診斷與驗證系統
 * 檢測底圖對應、文字重影、下載一致性、圖片上傳預覽
 */
class DiagnosticSystem {
  constructor() {
    this.enabled = false;
    this.debugOverlayEnabled = false;
    
    // 診斷數據
    this.textRenderCount = new Map(); // fieldKey -> count per frame
    this.backgroundLoadHistory = [];
    this.uploadHistory = [];
    this.eventLog = [];
    this.maxEventLog = 50;
    
    // DOM 元素
    this.debugPanel = null;
    this.debugOverlay = null;
    this.debugToggleButton = null;
    
    // 計時器
    this.frameId = 0;
    this.renderStartTime = null;
    
    this.init();
  }
  
  init() {
    this.createDebugToggle();
    this.createDebugPanel();
    this.createDebugOverlay();
    this.bindEvents();
  }
  
  // 創建 Debug 切換按鈕
  createDebugToggle() {
    const viewMenu = document.querySelector('.view-menu-dropdown');
    if (!viewMenu) return;
    
    // 添加 Debug 區段
    const debugSection = document.createElement('div');
    debugSection.className = 'view-menu-section';
    debugSection.innerHTML = `
      <h4>診斷工具</h4>
      <label class="view-menu-item">
        <input type="checkbox" id="debugToggle">
        <span>啟用 Debug 模式</span>
      </label>
      <label class="view-menu-item">
        <input type="checkbox" id="debugOverlayToggle">
        <span>顯示 Debug Overlay</span>
      </label>
      <button class="view-menu-button" id="selfCheckButton">
        執行自檢
      </button>
    `;
    
    viewMenu.appendChild(debugSection);
    
    // 綁定事件
    const debugToggle = document.getElementById('debugToggle');
    const debugOverlayToggle = document.getElementById('debugOverlayToggle');
    const selfCheckButton = document.getElementById('selfCheckButton');
    
    if (debugToggle) {
      debugToggle.addEventListener('change', (e) => {
        this.enabled = e.target.checked;
        this.toggleDebugPanel();
        this.logEvent('debug_toggle', { enabled: this.enabled });
      });
    }
    
    if (debugOverlayToggle) {
      debugOverlayToggle.addEventListener('change', (e) => {
        this.debugOverlayEnabled = e.target.checked;
        this.toggleDebugOverlay();
        this.logEvent('debug_overlay_toggle', { enabled: this.debugOverlayEnabled });
      });
    }
    
    if (selfCheckButton) {
      selfCheckButton.addEventListener('click', () => {
        this.runSelfCheck();
      });
    }
  }
  
  // 創建 Debug Panel
  createDebugPanel() {
    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'debug-panel';
    this.debugPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 350px;
      max-height: 60vh;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 10000;
      overflow-y: auto;
      display: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    this.debugPanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0; color: #00ff88;">🔍 診斷面板</h3>
        <button id="debug-panel-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">✕</button>
      </div>
      
      <div class="debug-section">
        <h4 style="color: #ffa500; margin: 10px 0 5px 0;">📊 渲染統計</h4>
        <div id="debug-render-stats"></div>
      </div>
      
      <div class="debug-section">
        <h4 style="color: #ffa500; margin: 10px 0 5px 0;">🖼️ 底圖狀態</h4>
        <div id="debug-background-status"></div>
      </div>
      
      <div class="debug-section">
        <h4 style="color: #ffa500; margin: 10px 0 5px 0;">📤 上傳狀態</h4>
        <div id="debug-upload-status"></div>
      </div>
      
      <div class="debug-section">
        <h4 style="color: #ffa500; margin: 10px 0 5px 0;">📋 最近事件</h4>
        <div id="debug-event-log" style="max-height: 150px; overflow-y: auto;"></div>
      </div>
      
      <div style="margin-top: 15px;">
        <button id="debug-export-report" style="background: #007acc; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-right: 10px;">
          匯出報告
        </button>
        <button id="debug-clear-log" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
          清空記錄
        </button>
      </div>
    `;
    
    document.body.appendChild(this.debugPanel);
    
    // 綁定面板事件
    document.getElementById('debug-panel-close')?.addEventListener('click', () => {
      this.enabled = false;
      document.getElementById('debugToggle').checked = false;
      this.toggleDebugPanel();
    });
    
    document.getElementById('debug-export-report')?.addEventListener('click', () => {
      this.exportDiagnosticReport();
    });
    
    document.getElementById('debug-clear-log')?.addEventListener('click', () => {
      this.clearEventLog();
    });
  }
  
  // 創建 Debug Overlay
  createDebugOverlay() {
    this.debugOverlay = document.createElement('div');
    this.debugOverlay.id = 'debug-overlay';
    this.debugOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      display: none;
    `;
    
    const canvasContainer = document.querySelector('.canvas-container');
    if (canvasContainer) {
      canvasContainer.appendChild(this.debugOverlay);
    }
  }
  
  // 綁定事件
  bindEvents() {
    // 監聽模板變更
    const categorySelect = document.getElementById('category-select');
    if (categorySelect) {
      categorySelect.addEventListener('change', () => {
        this.logEvent('category_change', { category: categorySelect.value });
      });
    }
  }
  
  // 1. 底圖對應檢測
  checkBackgroundMapping(category, templateIndex, actualPath, loadTime, retryCount = 0) {
    const expectedPaths = [
      `${category}_Empty_${templateIndex + 1}`,
      `${category}_Empty${templateIndex + 1}`, // 容錯版本
      `${category.toLowerCase()}_Empty_${templateIndex + 1}`,
      `${category.toLowerCase()}_Empty${templateIndex + 1}`
    ];
    
    const mappingResult = {
      timestamp: Date.now(),
      category,
      templateIndex,
      expectedPaths,
      actualPath,
      loadTime,
      retryCount,
      isCorrect: expectedPaths.some(path => actualPath?.includes(path)),
      status: actualPath ? 'loaded' : 'failed'
    };
    
    this.backgroundLoadHistory.push(mappingResult);
    
    // 保留最近 20 筆記錄
    if (this.backgroundLoadHistory.length > 20) {
      this.backgroundLoadHistory.shift();
    }
    
    this.logEvent('background_check', mappingResult);
    this.updateDebugPanel();
    
    return mappingResult;
  }
  
  // 2. 文字重複渲染檢測
  onTextRenderStart(fieldKey) {
    this.frameId++;
    
    if (!this.textRenderCount.has(this.frameId)) {
      this.textRenderCount.set(this.frameId, new Map());
    }
    
    const frameRenders = this.textRenderCount.get(this.frameId);
    const currentCount = frameRenders.get(fieldKey) || 0;
    frameRenders.set(fieldKey, currentCount + 1);
    
    // 檢測重複渲染
    if (currentCount > 0) {
      this.logEvent('text_duplicate_render', {
        fieldKey,
        frameId: this.frameId,
        renderCount: currentCount + 1,
        stack: new Error().stack
      });
      
      this.showDuplicateRenderWarning(fieldKey, currentCount + 1);
    }
    
    this.updateDebugPanel();
  }
  
  // 顯示重複渲染警告
  showDuplicateRenderWarning(fieldKey, count) {
    if (!this.enabled) return;
    
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 50px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff4444;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 10001;
      font-weight: bold;
    `;
    warning.textContent = `⚠️ 文字重複渲染：${fieldKey} (第${count}次)`;
    
    document.body.appendChild(warning);
    
    setTimeout(() => {
      warning.remove();
    }, 3000);
  }
  
  // 3. 下載一致性檢查
  async checkDownloadConsistency(canvas) {
    if (!this.enabled) return { consistent: true };
    
    const startTime = performance.now();
    
    try {
      // 獲取預覽 canvas 的哈希
      const previewDataURL = canvas.toDataURL('image/png');
      const previewHash = await this.calculateHash(previewDataURL);
      
      // 模擬匯出過程
      const exportBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      const exportDataURL = await this.blobToDataURL(exportBlob);
      const exportHash = await this.calculateHash(exportDataURL);
      
      const checkTime = performance.now() - startTime;
      
      const result = {
        timestamp: Date.now(),
        previewHash,
        exportHash,
        consistent: previewHash === exportHash,
        checkTime,
        canvasSize: { width: canvas.width, height: canvas.height },
        exportSize: exportBlob.size
      };
      
      this.logEvent('download_consistency_check', result);
      this.updateDebugPanel();
      
      // 顯示結果
      this.showConsistencyResult(result);
      
      return result;
    } catch (error) {
      this.logEvent('download_consistency_error', { error: error.message });
      return { consistent: false, error: error.message };
    }
  }
  
  // 顯示一致性檢查結果
  showConsistencyResult(result) {
    if (!this.enabled) return;
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: ${result.consistent ? '#28a745' : '#dc3545'};
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      z-index: 10001;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    
    notification.innerHTML = `
      <span style="font-size: 20px;">${result.consistent ? '✅' : '❌'}</span>
      <div>
        <div>下載一致性：${result.consistent ? '通過' : '不一致'}</div>
        <div style="font-size: 12px; opacity: 0.9;">檢查耗時：${result.checkTime.toFixed(1)}ms</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
  
  // 4. 圖片上傳追蹤
  trackImageUpload(step, data = {}) {
    const uploadEvent = {
      timestamp: Date.now(),
      step,
      data,
      success: !data.error
    };
    
    this.uploadHistory.push(uploadEvent);
    
    // 保留最近 30 筆記錄
    if (this.uploadHistory.length > 30) {
      this.uploadHistory.shift();
    }
    
    this.logEvent('image_upload', uploadEvent);
    this.updateDebugPanel();
  }
  
  // 事件記錄
  logEvent(type, data) {
    const event = {
      timestamp: Date.now(),
      type,
      data
    };
    
    this.eventLog.push(event);
    
    // 保留最近 50 筆記錄
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog.shift();
    }
    
    if (this.enabled) {
      this.updateDebugPanel();
    }
  }
  
  // 更新 Debug Panel
  updateDebugPanel() {
    if (!this.enabled || !this.debugPanel) return;
    
    // 更新渲染統計
    const renderStats = document.getElementById('debug-render-stats');
    if (renderStats) {
      let duplicateCount = 0;
      this.textRenderCount.forEach(frameRenders => {
        frameRenders.forEach(count => {
          if (count > 1) duplicateCount++;
        });
      });
      
      renderStats.innerHTML = `
        <div>總幀數：${this.textRenderCount.size}</div>
        <div style="color: ${duplicateCount > 0 ? '#ff4444' : '#00ff88'};">
          重複渲染：${duplicateCount} 次
        </div>
        <div>當前幀 ID：${this.frameId}</div>
      `;
    }
    
    // 更新底圖狀態
    const backgroundStatus = document.getElementById('debug-background-status');
    if (backgroundStatus && this.backgroundLoadHistory.length > 0) {
      const latest = this.backgroundLoadHistory[this.backgroundLoadHistory.length - 1];
      backgroundStatus.innerHTML = `
        <div style="color: ${latest.isCorrect ? '#00ff88' : '#ff4444'};">
          ${latest.isCorrect ? '✅' : '❌'} ${latest.actualPath || '未載入'}
        </div>
        <div>載入時間：${latest.loadTime || 'N/A'}ms</div>
        <div>重試次數：${latest.retryCount}</div>
      `;
    }
    
    // 更新上傳狀態
    const uploadStatus = document.getElementById('debug-upload-status');
    if (uploadStatus) {
      const recentUploads = this.uploadHistory.slice(-5);
      uploadStatus.innerHTML = recentUploads.length > 0 
        ? recentUploads.map(upload => 
            `<div style="color: ${upload.success ? '#00ff88' : '#ff4444'};">
              ${upload.success ? '✅' : '❌'} ${upload.step}
            </div>`
          ).join('')
        : '<div style="color: #666;">無上傳記錄</div>';
    }
    
    // 更新事件記錄
    const eventLog = document.getElementById('debug-event-log');
    if (eventLog) {
      const recentEvents = this.eventLog.slice(-10);
      eventLog.innerHTML = recentEvents.map(event => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        return `<div style="margin-bottom: 2px; font-size: 11px;">
          <span style="color: #888;">${time}</span> 
          <span style="color: #ffa500;">${event.type}</span>
        </div>`;
      }).join('');
    }
  }
  
  // 切換 Debug Panel
  toggleDebugPanel() {
    if (this.debugPanel) {
      this.debugPanel.style.display = this.enabled ? 'block' : 'none';
      if (this.enabled) {
        this.updateDebugPanel();
      }
    }
  }
  
  // 切換 Debug Overlay
  toggleDebugOverlay() {
    if (this.debugOverlay) {
      this.debugOverlay.style.display = this.debugOverlayEnabled ? 'block' : 'none';
    }
  }
  
  // 執行自檢
  async runSelfCheck() {
    this.logEvent('self_check_start', {});
    
    const report = {
      timestamp: Date.now(),
      backgroundMapping: this.backgroundLoadHistory,
      textRenderIssues: this.getTextRenderIssues(),
      uploadHistory: this.uploadHistory,
      eventLog: this.eventLog,
      summary: {
        backgroundIssues: this.backgroundLoadHistory.filter(h => !h.isCorrect).length,
        textDuplicates: this.getTextRenderIssues().length,
        uploadErrors: this.uploadHistory.filter(h => !h.success).length,
        totalEvents: this.eventLog.length
      }
    };
    
    // 顯示報告
    const reportText = JSON.stringify(report, null, 2);
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10002;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 20px;
        border-radius: 10px;
        max-width: 80%;
        max-height: 80%;
        overflow: auto;
      ">
        <h3>🔍 自檢報告</h3>
        <div style="margin: 15px 0;">
          <strong>摘要：</strong><br>
          底圖問題：${report.summary.backgroundIssues}<br>
          文字重複：${report.summary.textDuplicates}<br>
          上傳錯誤：${report.summary.uploadErrors}<br>
          總事件數：${report.summary.totalEvents}
        </div>
        <textarea style="width: 100%; height: 300px; font-family: monospace; font-size: 12px;" readonly>${reportText}</textarea>
        <div style="margin-top: 15px; text-align: right;">
          <button id="copy-report" style="background: #007acc; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; margin-right: 10px;">
            複製報告
          </button>
          <button id="close-report" style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
            關閉
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 綁定事件
    modal.querySelector('#copy-report').addEventListener('click', () => {
      navigator.clipboard.writeText(reportText);
      alert('報告已複製到剪貼板');
    });
    
    modal.querySelector('#close-report').addEventListener('click', () => {
      modal.remove();
    });
    
    this.logEvent('self_check_complete', { summary: report.summary });
  }
  
  // 獲取文字渲染問題
  getTextRenderIssues() {
    const issues = [];
    this.textRenderCount.forEach((frameRenders, frameId) => {
      frameRenders.forEach((count, fieldKey) => {
        if (count > 1) {
          issues.push({ frameId, fieldKey, count });
        }
      });
    });
    return issues;
  }
  
  // 匯出診斷報告
  exportDiagnosticReport() {
    const report = {
      timestamp: Date.now(),
      version: '1.0.0',
      backgroundMapping: this.backgroundLoadHistory,
      textRenderIssues: this.getTextRenderIssues(),
      uploadHistory: this.uploadHistory,
      eventLog: this.eventLog
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostic-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  // 清空事件記錄
  clearEventLog() {
    this.eventLog = [];
    this.textRenderCount.clear();
    this.backgroundLoadHistory = [];
    this.uploadHistory = [];
    this.updateDebugPanel();
    this.logEvent('log_cleared', {});
  }
  
  // 輔助函數
  async calculateHash(dataURL) {
    const encoder = new TextEncoder();
    const data = encoder.encode(dataURL);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  async blobToDataURL(blob) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
}

// 導出類別
export { DiagnosticSystem };