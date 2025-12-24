// content.js

// State management for pause/resume/stop
let processState = {
    isRunning: false,
    isPaused: false,
    isStopped: false,
    currentIndex: 0,
    uncheckedLabels: [],
    delayMs: 2000
};

// Helper function to create a delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Send progress update to popup (with error handling for closed popup)
function sendProgress(current, total, status) {
    chrome.runtime.sendMessage({
        type: "progress",
        current: current,
        total: total,
        status: status
    }, () => {
        // Suppress errors if popup is closed
        if (chrome.runtime.lastError) return;
    });
}

// Send completion message to popup
function sendComplete(status) {
    chrome.runtime.sendMessage({
        type: "complete",
        status: status
    }, () => {
        if (chrome.runtime.lastError) return;
    });
}

// Send error message to popup
function sendError(status) {
    chrome.runtime.sendMessage({
        type: "error",
        status: status
    }, () => {
        if (chrome.runtime.lastError) return;
    });
}

// Send state update to popup
function sendStateUpdate(state) {
    chrome.runtime.sendMessage({
        type: "state",
        state: state
    }, () => {
        if (chrome.runtime.lastError) return;
    });
}

// Main async function to process completions with delay
async function processCompletions(delayMs = 1000, startIndex = 0) {
    // Reset state if starting fresh
    if (startIndex === 0) {
        processState.isRunning = true;
        processState.isPaused = false;
        processState.isStopped = false;
        processState.currentIndex = 0;
        processState.delayMs = delayMs;
    } else {
        // Resuming from pause
        processState.isRunning = true;
        processState.isPaused = false;
        processState.isStopped = false;
    }

    const acc = document.querySelectorAll('div.ud-accordion-panel-toggler');

    if (acc.length === 0) {
        sendError("Please Open Course Page!");
        alert("Please Open Course Page!");
        processState.isRunning = false;
        return;
    }

    // Open all accordion panels first (only if starting fresh)
    if (startIndex === 0) {
        sendProgress(0, 0, "Opening sections...");
        acc.forEach((ac) => {
            ac.click();
        });
        
        await delay(500); // Small delay to let panels open

        // Get all checkbox labels and filter out already completed ones
        const allLabels = document.querySelectorAll('.item-link > div > label');
        processState.uncheckedLabels = [];
        
        // Filter to only include unchecked items
        allLabels.forEach((label) => {
            // Find the associated checkbox input (sibling or child)
            const container = label.parentElement;
            const checkbox = container.querySelector('input[type="checkbox"]');
            
            // Only add if checkbox exists and is NOT checked
            if (checkbox && !checkbox.checked) {
                processState.uncheckedLabels.push(label);
            }
        });
    }

    const uncheckedLabels = processState.uncheckedLabels;
    const total = uncheckedLabels.length;
    const alreadyCompleted = startIndex === 0 ? document.querySelectorAll('.item-link > div > label').length - total : 0;

    if (total === 0 && startIndex === 0) {
        sendComplete(`All items already completed!`);
        processState.isRunning = false;
        return;
    }

    if (startIndex === 0) {
        sendProgress(0, total, `Found ${total} incomplete items (${alreadyCompleted} already done)...`);
    } else {
        sendProgress(startIndex, total, `Resuming from item ${startIndex + 1} of ${total}...`);
    }

    // Click each unchecked checkbox with the specified delay
    for (let i = startIndex; i < uncheckedLabels.length; i++) {
        // Check if stopped
        if (processState.isStopped) {
            sendProgress(i, total, "Stopped");
            processState.isRunning = false;
            processState.isStopped = false;
            sendStateUpdate("stopped");
            return;
        }

        // Check if paused
        while (processState.isPaused && !processState.isStopped) {
            await delay(100); // Small delay to avoid busy waiting
        }

        // Check again if stopped while paused
        if (processState.isStopped) {
            sendProgress(i, total, "Stopped");
            processState.isRunning = false;
            processState.isStopped = false;
            sendStateUpdate("stopped");
            return;
        }

        uncheckedLabels[i].click();
        processState.currentIndex = i + 1;
        sendProgress(i + 1, total, `Completing item ${i + 1} of ${total}...`);
        
        // After every 10 items, wait 3 seconds to prevent logout (except after the last item)
        if ((i + 1) % 10 === 0 && i < uncheckedLabels.length - 1) {
            sendProgress(i + 1, total, `Waiting 3s after batch of 10...`);
            
            // Wait 3 seconds, but check for pause/stop every 100ms
            const waitTime = 3000; // 3 seconds
            const checkInterval = 100; // Check every 100ms
            let elapsed = 0;
            
            while (elapsed < waitTime) {
                // Check if stopped
                if (processState.isStopped) {
                    sendProgress(i + 1, total, "Stopped");
                    processState.isRunning = false;
                    processState.isStopped = false;
                    sendStateUpdate("stopped");
                    return;
                }
                
                // Check if paused
                if (processState.isPaused) {
                    sendProgress(i + 1, total, "Paused during batch wait...");
                    while (processState.isPaused && !processState.isStopped) {
                        await delay(checkInterval);
                    }
                    
                    // Check again if stopped while paused
                    if (processState.isStopped) {
                        sendProgress(i + 1, total, "Stopped");
                        processState.isRunning = false;
                        processState.isStopped = false;
                        sendStateUpdate("stopped");
                        return;
                    }
                    
                    // Resume waiting after pause
                    sendProgress(i + 1, total, `Waiting 3s after batch of 10...`);
                }
                
                await delay(checkInterval);
                elapsed += checkInterval;
            }
        }
        
        // Wait for the specified delay between each completion (except after the last one)
        if (i < uncheckedLabels.length - 1) {
            await delay(delayMs);
        }
    }

    // Only check for certificate if we completed all items
    if (processState.currentIndex >= total && !processState.isStopped) {
        sendProgress(total, total, "Checking for certificate...");
        await delay(500);

        // Click progress button
        const progressBtn = document.querySelector('.progress--progress-btn--3q_tr');
        if (progressBtn) {
            progressBtn.click();
            
            await delay(500);
            
            const certElement = document.querySelector('div.popover-module--inner--Sbv-I > div > :last-child');
            if (certElement) {
                const certCheck = certElement.innerHTML;

                if (certCheck.includes('Get certificate')) {
                    certElement.click();
                    sendComplete("Course completed! Certificate available.");
                } else {
                    const msg = certElement.innerText;
                    sendComplete(msg || "Course completed!");
                    alert(msg);
                }
            } else {
                sendComplete("Course completed!");
            }
        } else {
            sendComplete("Course completed!");
        }
    }

    processState.isRunning = false;
    processState.isPaused = false;
    sendStateUpdate("completed");
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.msg === "start") {
        // Convert delay from seconds to milliseconds, default to 2000ms (2 seconds)
        const delayMs = message.delay ? Math.round(message.delay * 1000) : 2000;
        processCompletions(delayMs, 0);
        sendResponse({ received: true });
    } else if (message.msg === "pause") {
        if (processState.isRunning && !processState.isPaused) {
            processState.isPaused = true;
            sendStateUpdate("paused");
            sendResponse({ received: true });
        } else {
            sendResponse({ received: false, error: "Process is not running or already paused" });
        }
    } else if (message.msg === "resume") {
        if (processState.isPaused && !processState.isStopped) {
            sendStateUpdate("running");
            processCompletions(processState.delayMs, processState.currentIndex);
            sendResponse({ received: true });
        } else {
            sendResponse({ received: false, error: "Process is not paused" });
        }
    } else if (message.msg === "stop") {
        processState.isStopped = true;
        processState.isPaused = false;
        processState.isRunning = false;
        sendStateUpdate("stopped");
        sendResponse({ received: true });
    }
    return true; // Keep message channel open for async response
});
