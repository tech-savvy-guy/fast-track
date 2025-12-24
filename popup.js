// popup.js

console.log("Popup Script Fired!");

const DEFAULT_DELAY = 2; // seconds

function startExtension() {
    // Load saved delay value
    loadDelay();
    
    // Setup delay display click to edit
    const delayDisplay = document.getElementById('delay-display');
    delayDisplay.addEventListener('click', makeDelayEditable);
    
    document.getElementById('start-btn').addEventListener('click', sendMsg);
    document.getElementById('reset-link').addEventListener('click', resetProgress);
    
    // Listen for progress updates from content script
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        if (message.type === "progress") {
            updateProgress(message.current, message.total, message.status);
        } else if (message.type === "complete") {
            completeProgress(message.status);
        } else if (message.type === "error") {
            showError(message.status);
        }
    });
}

function loadDelay() {
    chrome.storage.sync.get(['delay'], function(result) {
        const delay = result.delay !== undefined ? result.delay : DEFAULT_DELAY;
        const delayDisplay = document.getElementById('delay-display');
        delayDisplay.textContent = delay + 's';
        delayDisplay.dataset.delay = delay;
    });
}

function makeDelayEditable() {
    const delayDisplay = document.getElementById('delay-display');
    const currentDelay = parseFloat(delayDisplay.dataset.delay) || DEFAULT_DELAY;
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0.1';
    input.max = '10';
    input.step = '0.1';
    input.value = currentDelay;
    input.style.width = '100%';
    
    // Replace text with input
    delayDisplay.textContent = '';
    delayDisplay.appendChild(input);
    input.focus();
    input.select();
    
    // Handle save on blur or enter
    const saveDelayValue = () => {
        const delay = parseFloat(input.value) || DEFAULT_DELAY;
        const clampedDelay = Math.max(0.1, Math.min(10, delay));
        
        chrome.storage.sync.set({ delay: clampedDelay }, function() {
            delayDisplay.textContent = clampedDelay + 's';
            delayDisplay.dataset.delay = clampedDelay;
        });
    };
    
    input.addEventListener('blur', saveDelayValue);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            delayDisplay.textContent = currentDelay + 's';
            delayDisplay.dataset.delay = currentDelay;
        }
    });
}

function resetProgress(e) {
    e.preventDefault();
    const btn = document.getElementById('start-btn');
    const statusValue = document.getElementById('status-value');
    const progressContainer = document.getElementById('progress-container');
    
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Start Completion';
    statusValue.textContent = 'Ready';
    progressContainer.classList.remove('active');
}

function sendMsg() {
    const btn = document.getElementById('start-btn');
    const statusValue = document.getElementById('status-value');
    const progressContainer = document.getElementById('progress-container');
    const delayDisplay = document.getElementById('delay-display');
    
    // Get current delay value
    const delay = parseFloat(delayDisplay.dataset.delay) || DEFAULT_DELAY;
    
    btn.disabled = true;
    btn.textContent = 'Processing...';
    statusValue.textContent = 'Running';
    progressContainer.classList.add('active');
    
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var activeTab = tabs[0];
        if (activeTab) {
            chrome.tabs.sendMessage(activeTab.id, { msg: "start", delay: delay }, function (response) {
                // Check for errors (e.g., content script not loaded)
                if (chrome.runtime.lastError) {
                    console.log("Error:", chrome.runtime.lastError.message);
                    showError("Please refresh the Udemy page and try again");
                    return;
                }
                console.log("Message sent to content script");
            });
        }
    });
}

function updateProgress(current, total, status) {
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    const progressStatus = document.getElementById('progress-status');
    const statusValue = document.getElementById('status-value');
    
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    progressBar.style.width = percentage + '%';
    progressPercent.textContent = percentage + '%';
    progressStatus.textContent = status || 'Processing...';
    progressStatus.className = 'progress-status';
    statusValue.textContent = `${current}/${total}`;
}

function completeProgress(status) {
    const btn = document.getElementById('start-btn');
    const statusValue = document.getElementById('status-value');
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    const progressStatus = document.getElementById('progress-status');
    
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    progressStatus.textContent = status || 'Completed!';
    progressStatus.className = 'progress-status success';
    statusValue.textContent = 'Done';
    
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Complete';
}

function showError(status) {
    const btn = document.getElementById('start-btn');
    const statusValue = document.getElementById('status-value');
    const progressContainer = document.getElementById('progress-container');
    const progressStatus = document.getElementById('progress-status');
    
    progressContainer.classList.add('active');
    progressStatus.textContent = status || 'Error occurred';
    progressStatus.className = 'progress-status error';
    statusValue.textContent = 'Error';
    
    btn.disabled = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Start Completion';
}

document.addEventListener("DOMContentLoaded", startExtension);
