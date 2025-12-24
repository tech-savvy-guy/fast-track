// popup.js

console.log("Popup Script Fired!");

function startExtension() {
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
    
    btn.disabled = true;
    btn.textContent = 'Processing...';
    statusValue.textContent = 'Running';
    progressContainer.classList.add('active');
    
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var activeTab = tabs[0];
        if (activeTab) {
            chrome.tabs.sendMessage(activeTab.id, { msg: "start" }, function (response) {
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
