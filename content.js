// content.js

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

// Main async function to process completions with delay
async function processCompletions(delayMs = 1000) {
    const acc = document.querySelectorAll('div.ud-accordion-panel-toggler');

    if (acc.length === 0) {
        sendError("Please Open Course Page!");
        alert("Please Open Course Page!");
        return;
    }

    // Open all accordion panels first
    sendProgress(0, acc.length, "Opening sections...");
    acc.forEach((ac) => {
        ac.click();
    });
    
    await delay(500); // Small delay to let panels open

    // Get all checkbox labels and filter out already completed ones
    const allLabels = document.querySelectorAll('.item-link > div > label');
    const uncheckedLabels = [];
    
    // Filter to only include unchecked items
    allLabels.forEach((label) => {
        // Find the associated checkbox input (sibling or child)
        const container = label.parentElement;
        const checkbox = container.querySelector('input[type="checkbox"]');
        
        // Only add if checkbox exists and is NOT checked
        if (checkbox && !checkbox.checked) {
            uncheckedLabels.push(label);
        }
    });

    const total = uncheckedLabels.length;
    const alreadyCompleted = allLabels.length - total;

    if (total === 0) {
        sendComplete(`All ${allLabels.length} items already completed!`);
        return;
    }

    sendProgress(0, total, `Found ${total} incomplete items (${alreadyCompleted} already done)...`);

    // Click each unchecked checkbox with the specified delay
    for (let i = 0; i < uncheckedLabels.length; i++) {
        uncheckedLabels[i].click();
        sendProgress(i + 1, total, `Completing item ${i + 1} of ${total}...`);
        
        // After every 10 items, wait 5 seconds to prevent logout (except after the last item)
        if ((i + 1) % 10 === 0 && i < uncheckedLabels.length - 1) {
            sendProgress(i + 1, total, `Pausing 5s after batch of 10...`);
            await delay(5000);
        }
        
        // Wait for the specified delay between each completion (except after the last one)
        if (i < uncheckedLabels.length - 1) {
            await delay(delayMs);
        }
    }

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

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.msg === "start") {
        // Convert delay from seconds to milliseconds, default to 2000ms (2 seconds)
        const delayMs = message.delay ? Math.round(message.delay * 1000) : 2000;
        processCompletions(delayMs);
        sendResponse({ received: true });
    }
    return true; // Keep message channel open for async response
});
