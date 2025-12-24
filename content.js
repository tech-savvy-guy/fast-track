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
async function processCompletions() {
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

    // Click each unchecked checkbox with a 1 second delay
    for (let i = 0; i < uncheckedLabels.length; i++) {
        uncheckedLabels[i].click();
        sendProgress(i + 1, total, `Completing item ${i + 1} of ${total}...`);
        
        // Wait 1 second between each completion (except after the last one)
        if (i < uncheckedLabels.length - 1) {
            await delay(1000);
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
        processCompletions();
        sendResponse({ received: true });
    }
    return true; // Keep message channel open for async response
});
