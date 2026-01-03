const video = document.getElementById('video');
const sandbox = document.getElementById('sandbox');
let isActive = false;
let isSandboxReady = false;

// Listen for messages from the sandbox
window.addEventListener('message', (event) => {
    if (event.data.type === 'SANDBOX_READY') {
        console.log('Sandbox is ready');
        isSandboxReady = true;
    } else if (event.data.type === 'SQUINT_DETECTED') {
        console.log('Squint detected from sandbox. Forwarding to background.');
        chrome.runtime.sendMessage({
            type: 'SQUINT_DETECTED',
            intensity: event.data.intensity
        });
    } else if (event.data.type === 'WIDE_EYES_DETECTED') {
        console.log('Wide eyes detected from sandbox. Forwarding to background.');
        chrome.runtime.sendMessage({
            type: 'WIDE_EYES_DETECTED',
            intensity: event.data.intensity
        });
    }
});

// Start camera
async function startCamera(settings = {}) {
    if (isActive) {
        console.log('Camera already active');
        return;
    }

    try {
        console.log('Requesting camera access...');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API not available in this browser');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                width: { ideal: 320 },
                height: { ideal: 240 },
                frameRate: { ideal: 10, max: 15 }
            }
        });

        video.srcObject = stream;
        await video.play();

        console.log('Camera started, video dimensions:', video.videoWidth, 'x', video.videoHeight);
        isActive = true;

        // Initialize sandbox with settings received from background
        console.log('Initializing sandbox with settings:', settings);
        sandbox.contentWindow.postMessage({
            type: 'INIT',
            settings: settings
        }, '*');

        console.log('Squint detection started (Sandbox mode)');

        // Start processing loop
        startProcessingLoop();

        chrome.runtime.sendMessage({
            type: 'MONITORING_STATUS',
            active: true
        });

    } catch (error) {
        console.error('Camera access failed:', error);
        isActive = false;

        let errorMsg = error.message;
        if (error.name === 'NotAllowedError') {
            errorMsg = 'Camera access denied. Please allow access in Chrome settings.';
        } else if (error.name === 'NotFoundError') {
            errorMsg = 'No camera found.';
        }

        chrome.runtime.sendMessage({
            type: 'CAMERA_ERROR',
            error: errorMsg
        });

        chrome.runtime.sendMessage({
            type: 'MONITORING_STATUS',
            active: false,
            error: errorMsg
        });

        throw error;
    }
}

let processingInterval = null;

function startProcessingLoop() {
    if (processingInterval) clearInterval(processingInterval);

    console.log('Starting processing loop (setInterval)...');

    processingInterval = setInterval(() => {
        if (!isActive) {
            clearInterval(processingInterval);
            processingInterval = null; // Clear the interval ID
            return;
        }

        if (video.readyState === video.HAVE_ENOUGH_DATA && isSandboxReady) {
            try {
                const canvas = document.getElementById('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(video, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                sandbox.contentWindow.postMessage({
                    type: 'FRAME',
                    image: imageData
                }, '*');
            } catch (error) {
                console.error('Frame capture error:', error);
            }
        }
    }, 100); // 10 FPS
}

function stopCamera() {
    console.log('Stopping camera...');
    isActive = false;
    if (processingInterval) {
        clearInterval(processingInterval);
        processingInterval = null; // Clear the interval ID
    }

    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }

    chrome.runtime.sendMessage({
        type: 'MONITORING_STATUS',
        active: false
    });

    console.log('Squint detection stopped');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Offscreen received message:', message);

    if (message.type === 'START_CAMERA') {
        startCamera(message.settings).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            console.error('Start camera error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (message.type === 'STOP_CAMERA') {
        stopCamera();
        sendResponse({ success: true });
    }

    return true;
});

console.log('Offscreen script loaded (Bridge mode)');