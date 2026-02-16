/**
 * Electron Renderer Process
 * Handles UI logic and IPC communication
 */

import './types.js';

let currentStockPlan: any = null;

// DOM Elements
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const outputDirInput = document.getElementById('output-dir') as HTMLInputElement;
const saveSettingsBtn = document.getElementById('save-settings-btn') as HTMLButtonElement;
const selectOutputBtn = document.getElementById('select-output-btn') as HTMLButtonElement;
const selectFileBtn = document.getElementById('select-file-btn') as HTMLButtonElement;
const dropzone = document.getElementById('dropzone') as HTMLDivElement;
const fileInfo = document.getElementById('file-info') as HTMLDivElement;
const runSearchBtn = document.getElementById('run-search-btn') as HTMLButtonElement;
const runDownloadBtn = document.getElementById('run-download-btn') as HTMLButtonElement;
const openFolderBtn = document.getElementById('open-folder-btn') as HTMLButtonElement;
const progressPanel = document.getElementById('progress-panel') as HTMLElement;
const progressBarFill = document.getElementById('progress-bar-fill') as HTMLDivElement;
const progressText = document.getElementById('progress-text') as HTMLParagraphElement;
const resultsPanel = document.getElementById('results-panel') as HTMLElement;
const resultsContent = document.getElementById('results-content') as HTMLDivElement;
const logContent = document.getElementById('log-content') as HTMLDivElement;

// Initialize
async function init() {
  const settings = await window.electronAPI.getSettings();
  apiKeyInput.value = settings.apiKey;
  outputDirInput.value = settings.outputDir;

  addLog('StockBot initialized', 'info');
}

// Logging
function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;
  logContent.appendChild(entry);
  logContent.scrollTop = logContent.scrollHeight;
}

// Settings
saveSettingsBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  const outputDir = outputDirInput.value.trim();

  if (!apiKey) {
    addLog('API Key is required', 'error');
    return;
  }

  await window.electronAPI.saveSettings({ apiKey, outputDir });
  addLog('Settings saved successfully', 'success');
  updateButtonStates();
});

selectOutputBtn.addEventListener('click', async () => {
  const dir = await window.electronAPI.selectOutputDir();
  if (dir) {
    outputDirInput.value = dir;
  }
});

// File Selection
selectFileBtn.addEventListener('click', async () => {
  await selectStockPlan();
});

dropzone.addEventListener('click', async () => {
  await selectStockPlan();
});

// Drag and drop
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.style.borderColor = '#5568d3';
  dropzone.style.background = '#f8f8ff';
});

dropzone.addEventListener('dragleave', () => {
  dropzone.style.borderColor = '#667eea';
  dropzone.style.background = '';
});

dropzone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropzone.style.borderColor = '#667eea';
  dropzone.style.background = '';

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    // For now, just trigger file selector
    // In production, we'd handle the dropped file directly
    await selectStockPlan();
  }
});

async function selectStockPlan() {
  const result = await window.electronAPI.selectStockPlan();

  if (!result) return;

  if (result.error) {
    addLog('Stock plan validation failed', 'error');
    result.error.forEach((err: any) => {
      addLog(`  - ${err.path}: ${err.message}`, 'error');
    });
    return;
  }

  currentStockPlan = result.data;

  // Update UI
  const fileName = result.path.split(/[\\/]/).pop();
  document.getElementById('file-name')!.textContent = fileName;
  document.getElementById('scenes-count')!.textContent = currentStockPlan.scenes?.length || 0;

  const totalClips = currentStockPlan.scenes?.reduce(
    (sum: number, scene: any) =>
      sum + (scene.clips_per_scene || currentStockPlan.global?.clips_per_scene || 3),
    0
  );
  document.getElementById('clips-count')!.textContent = totalClips;

  dropzone.classList.add('hidden');
  fileInfo.classList.remove('hidden');

  addLog(`Loaded: ${fileName}`, 'success');
  addLog(`  Scenes: ${currentStockPlan.scenes?.length || 0}`, 'info');
  addLog(`  Target clips: ${totalClips}`, 'info');

  updateButtonStates();
}

// Actions
runSearchBtn.addEventListener('click', async () => {
  if (!currentStockPlan) return;

  addLog('Starting video search...', 'info');
  progressPanel.classList.remove('hidden');
  resultsPanel.classList.add('hidden');
  runSearchBtn.disabled = true;
  runDownloadBtn.disabled = true;

  const result = await window.electronAPI.runSearch(currentStockPlan);

  if (result.error) {
    addLog(`Search failed: ${result.error}`, 'error');
    progressPanel.classList.add('hidden');
    runSearchBtn.disabled = false;
    return;
  }

  addLog('Search completed successfully!', 'success');
  progressPanel.classList.add('hidden');

  // Show results
  displayResults(result.results);
  runSearchBtn.disabled = false;
  runDownloadBtn.disabled = false;
  openFolderBtn.disabled = false;
});

runDownloadBtn.addEventListener('click', async () => {
  if (!currentStockPlan) return;

  addLog('Starting video download...', 'info');
  progressPanel.classList.remove('hidden');
  runSearchBtn.disabled = true;
  runDownloadBtn.disabled = true;

  const result = await window.electronAPI.runDownload(currentStockPlan);

  if (result.error) {
    addLog(`Download failed: ${result.error}`, 'error');
    progressPanel.classList.add('hidden');
    runSearchBtn.disabled = false;
    runDownloadBtn.disabled = false;
    return;
  }

  addLog('Download completed successfully!', 'success');
  progressPanel.classList.add('hidden');
  runSearchBtn.disabled = false;
  runDownloadBtn.disabled = false;
});

openFolderBtn.addEventListener('click', async () => {
  await window.electronAPI.openOutputFolder();
  addLog('Opened output folder', 'info');
});

// Progress listeners
window.electronAPI.onSearchProgress((data) => {
  const percent = Math.round((data.current / data.total) * 100);
  progressBarFill.style.width = `${percent}%`;
  progressText.textContent = `Processing scene ${data.current}/${data.total}: ${data.sceneName}`;
  addLog(`  Scene ${data.current}/${data.total}: ${data.sceneName}`, 'info');
});

window.electronAPI.onDownloadProgress((data) => {
  const percent = Math.round((data.completedFiles / data.totalFiles) * 100);
  progressBarFill.style.width = `${percent}%`;
  progressText.textContent = `Downloading ${data.completedFiles}/${data.totalFiles}: ${data.currentFile}`;
});

function displayResults(results: any) {
  resultsPanel.classList.remove('hidden');
  resultsContent.innerHTML = '';

  const summary = document.createElement('div');
  summary.className = 'result-card';
  summary.innerHTML = `
    <h3>📊 Summary</h3>
    <p>Total scenes: ${results.selection.length}</p>
    <p>Fulfilled: ${results.selection.filter((s: any) => s.status === 'fulfilled').length}</p>
    <p>Partial: ${results.selection.filter((s: any) => s.status === 'partial').length}</p>
    <p>Unfulfilled: ${results.selection.filter((s: any) => s.status === 'unfulfilled').length}</p>
  `;
  resultsContent.appendChild(summary);

  results.selection.forEach((scene: any) => {
    const card = document.createElement('div');
    card.className = 'result-card';

    const statusClass = `status-${scene.status}`;
    card.innerHTML = `
      <h3>${scene.scene_slug}</h3>
      <p>Status: <span class="status-badge ${statusClass}">${scene.status}</span></p>
      <p>Selected clips: ${scene.selected?.length || 0}</p>
    `;
    resultsContent.appendChild(card);
  });
}

function updateButtonStates() {
  const hasApiKey = apiKeyInput.value.trim().length > 0;
  const hasStockPlan = currentStockPlan !== null;

  runSearchBtn.disabled = !hasApiKey || !hasStockPlan;
}

// Initialize on load
init();
