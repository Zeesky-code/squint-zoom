let offscreenCreated = false;
let isMonitoring = false;

// Create offscreen document for camera processing
async function createOffscreenDocument() {
    if (offscreenCreated) return;

    try {
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: 'Camera access for squint detection'
        });
        offscreenCreated = true;
        console.log('Offscreen document created');
    } catch (error) {
        if (error.message.includes('Only a single offscreen')) {
            offscreenCreated = true;
            console.log('Offscreen document already exists');
        } else {
            console.error('Failed to create offscreen document:', error);
        }
    }
}

// Adjust zoom on active tab (Zoom In)
async function handleSquintZoom(intensity) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;

        const currentZoom = await chrome.tabs.getZoom(tab.id);
        const newZoom = Math.min(currentZoom + 0.1, 3.0);
        await chrome.tabs.setZoom(tab.id, newZoom);
        console.log(`Squint In: ${currentZoom.toFixed(2)} -> ${newZoom.toFixed(2)}`);
    } catch (error) {
        console.error('Zoom failed:', error);
    }
}

// Adjust zoom on active tab (Zoom Out)
async function handleWideEyesZoom(intensity) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;

        const currentZoom = await chrome.tabs.getZoom(tab.id);
        const newZoom = Math.max(currentZoom - 0.1, 1.0); // Don't go below 100%
        await chrome.tabs.setZoom(tab.id, newZoom);
        console.log(`Wide Eyes Out: ${currentZoom.toFixed(2)} -> ${newZoom.toFixed(2)}`);
    } catch (error) {
        console.error('Zoom failed:', error);
    }
}

// Handle all messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SQUINT_DETECTED') {
        handleSquintZoom(message.intensity);
        sendResponse({ success: true });
    }
    else if (message.type === 'WIDE_EYES_DETECTED') {
        handleWideEyesZoom(message.intensity);
        sendResponse({ success: true });
    }
    else if (message.type === 'CAMERA_ERROR') {
        console.error('Camera error:', message.error);
        sendResponse({ success: true });
    }
    else if (message.type === 'MONITORING_STATUS') {
        isMonitoring = message.active;
        // Update badge to show status
        chrome.action.setBadgeText({ text: message.active ? 'ON' : '' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        sendResponse({ success: true });
    }
    else if (message.type === 'START_MONITORING') {
        console.log('Starting monitoring...');

        // Check if permission was granted
        chrome.storage.local.get(['cameraPermissionGranted'], (result) => {
            if (!result.cameraPermissionGranted) {
                console.log('Camera permission not granted, opening setup page');
                chrome.tabs.create({ url: 'setup.html' });
                sendResponse({ success: false, error: 'Permission required' });
                return;
            }

            createOffscreenDocument().then(() => {
                console.log('Offscreen document ready, preparing to start camera');

                // Get settings first
                chrome.storage.local.get(['squintThreshold', 'wideEyeThreshold'], (settingsResult) => {
                    const settings = {};
                    if (settingsResult.squintThreshold) settings.squintThreshold = settingsResult.squintThreshold;
                    if (settingsResult.wideEyeThreshold) settings.wideEyeThreshold = settingsResult.wideEyeThreshold;

                    console.log('Retrieved settings for offscreen:', settings);

                    // Give offscreen document time to load, then send message with settings
                    setTimeout(() => {
                        chrome.runtime.sendMessage({
                            type: 'START_CAMERA',
                            settings: settings
                        }, (response) => {
                            console.log('START_CAMERA response:', response);
                            if (response && response.success) {
                                isMonitoring = true;
                                chrome.action.setBadgeText({ text: 'ON' });
                                chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
                                sendResponse({ success: true, active: true });
                            } else {
                                console.error('Failed to start camera in offscreen');
                                sendResponse({ success: false, error: 'Camera failed to start' });
                            }
                        });
                    }, 500); // Wait 500ms for offscreen to fully load
                });
            }).catch(error => {
                console.error('Failed to start monitoring:', error);
                sendResponse({ success: false, error: error.message });
            });
        });
        return true; // Keep channel open for async response
    }
    else if (message.type === 'STOP_MONITORING') {
        console.log('Stopping monitoring...');
        chrome.runtime.sendMessage({ type: 'STOP_CAMERA' });
        isMonitoring = false;
        chrome.action.setBadgeText({ text: '' });
        sendResponse({ success: true, active: false });
    }
    else if (message.type === 'GET_STATUS') {
        sendResponse({ active: isMonitoring });
    }

    return true; // Keep message channel open
});