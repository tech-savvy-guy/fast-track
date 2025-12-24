// popup.js

console.log("Popup Script Fired!");

const DEFAULT_DELAY = 2; // seconds
let currentState = "ready"; // ready, running, paused, stopped, completed

function startExtension() {
    // Load saved delay value
    loadDelay();
    
    // Initialize UI state
    updateUIState("ready");
    
    // Setup delay display click to edit
    const delayDisplay = document.getElementById('delay-display');
    delayDisplay.addEventListener('click', makeDelayEditable);
    
    document.getElementById('start-btn').addEventListener('click', handleStartClick);
    document.getElementById('pause-btn').addEventListener('click', handlePauseClick);
    document.getElementById('resume-btn').addEventListener('click', handleResumeClick);
    document.getElementById('stop-btn').addEventListener('click', handleStopClick);
    document.getElementById('reset-link').addEventListener('click', resetProgress);
    
    // Listen for progress updates from content script
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        if (message.type === "progress") {
            updateProgress(message.current, message.total, message.status);
        } else if (message.type === "complete") {
            completeProgress(message.status);
        } else if (message.type === "error") {
            showError(message.status);
        } else if (message.type === "state") {
            updateState(message.state);
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
    // Send stop message to content script if running
    if (currentState === "running" || currentState === "paused") {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            var activeTab = tabs[0];
            if (activeTab) {
                chrome.tabs.sendMessage(activeTab.id, { msg: "stop" });
            }
        });
    }
    
    updateUIState("ready");
}

function updateState(state) {
    currentState = state;
    updateUIState(state);
}

function updateUIState(state) {
    currentState = state;
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const stopBtn = document.getElementById('stop-btn');
    const controlButtons = document.getElementById('control-buttons');
    const statusValue = document.getElementById('status-value');
    const progressContainer = document.getElementById('progress-container');
    
    // Hide all buttons first
    startBtn.style.display = 'none';
    controlButtons.style.display = 'none';
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    
    if (state === "ready") {
        startBtn.style.display = 'flex';
        startBtn.disabled = false;
        statusValue.textContent = 'Ready';
        progressContainer.classList.remove('active');
    } else if (state === "running") {
        controlButtons.style.display = 'flex';
        pauseBtn.style.display = 'flex';
        stopBtn.style.display = 'flex';
        statusValue.textContent = 'Running';
        progressContainer.classList.add('active');
    } else if (state === "paused") {
        controlButtons.style.display = 'flex';
        resumeBtn.style.display = 'flex';
        stopBtn.style.display = 'flex';
        statusValue.textContent = 'Paused';
        progressContainer.classList.add('active');
    } else if (state === "stopped") {
        startBtn.style.display = 'flex';
        startBtn.disabled = false;
        statusValue.textContent = 'Stopped';
        progressContainer.classList.add('active');
    } else if (state === "completed") {
        startBtn.style.display = 'flex';
        startBtn.disabled = false;
        statusValue.textContent = 'Done';
        progressContainer.classList.add('active');
    }
}

function handleStartClick() {
    sendMsg();
}

function handlePauseClick() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var activeTab = tabs[0];
        if (activeTab) {
            chrome.tabs.sendMessage(activeTab.id, { msg: "pause" }, function (response) {
                if (chrome.runtime.lastError) {
                    console.log("Error:", chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.received) {
                    updateUIState("paused");
                }
            });
        }
    });
}

function handleResumeClick() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var activeTab = tabs[0];
        if (activeTab) {
            chrome.tabs.sendMessage(activeTab.id, { msg: "resume" }, function (response) {
                if (chrome.runtime.lastError) {
                    console.log("Error:", chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.received) {
                    updateUIState("running");
                }
            });
        }
    });
}

function handleStopClick() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var activeTab = tabs[0];
        if (activeTab) {
            chrome.tabs.sendMessage(activeTab.id, { msg: "stop" }, function (response) {
                if (chrome.runtime.lastError) {
                    console.log("Error:", chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.received) {
                    updateUIState("stopped");
                }
            });
        }
    });
}

function sendMsg() {
    const delayDisplay = document.getElementById('delay-display');
    
    // Get current delay value
    const delay = parseFloat(delayDisplay.dataset.delay) || DEFAULT_DELAY;
    
    updateUIState("running");
    
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
    const progressBar = document.getElementById('progress-bar');
    const progressPercent = document.getElementById('progress-percent');
    const progressStatus = document.getElementById('progress-status');
    
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    progressStatus.textContent = status || 'Completed!';
    progressStatus.className = 'progress-status success';
    
    updateUIState("completed");
}

function showError(status) {
    const progressContainer = document.getElementById('progress-container');
    const progressStatus = document.getElementById('progress-status');
    
    progressContainer.classList.add('active');
    progressStatus.textContent = status || 'Error occurred';
    progressStatus.className = 'progress-status error';
    
    updateUIState("ready");
}

document.addEventListener("DOMContentLoaded", startExtension);
