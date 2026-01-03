const grantBtn = document.getElementById('grantBtn');
const statusDiv = document.getElementById('status');
const video = document.getElementById('video');
const setupView = document.getElementById('setupView');
const doneView = document.getElementById('doneView');

function showStatus(message, type) {
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
}

async function requestPermission() {
    try {
        grantBtn.disabled = true;
        grantBtn.textContent = 'Requesting permission...';

        // Request camera permission - this will prompt the user
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 320 },
                height: { ideal: 240 }
            }
        });

        console.log('Permission granted! Stream:', stream);
        console.log('Video tracks:', stream.getVideoTracks());

        // Show video preview
        video.srcObject = stream;
        video.style.display = 'block';

        showStatus('Camera permission granted! Chrome will remember this.', 'success');

        // Save permission status in our storage
        await chrome.storage.local.set({ cameraPermissionGranted: true });
        console.log('Saved permission status to storage');

        // Stop preview after 2 seconds and show done view
        setTimeout(() => {
            stream.getTracks().forEach(track => {
                console.log('Stopping track:', track.label);
                track.stop();
            });
            setupView.style.display = 'none';
            doneView.style.display = 'block';
        }, 2000);

    } catch (error) {
        console.error('Permission error:', error);

        let errorMsg = 'Camera permission denied. ';
        if (error.name === 'NotAllowedError') {
            errorMsg += 'Please click "Allow" when Chrome asks for camera access. Check that camera is enabled in System Settings.';
        } else if (error.name === 'NotFoundError') {
            errorMsg += 'No camera detected. Please connect a camera.';
        } else if (error.name === 'NotReadableError') {
            errorMsg += 'Camera is in use by another application.';
        } else {
            errorMsg += error.message;
        }

        showStatus('Error: ' + errorMsg, 'error');
        grantBtn.disabled = false;
        grantBtn.textContent = 'Try Again';
    }
}

grantBtn.addEventListener('click', requestPermission);

// Check if permission already granted
chrome.storage.local.get(['cameraPermissionGranted'], (result) => {
    if (result.cameraPermissionGranted) {
        setupView.style.display = 'none';
        doneView.style.display = 'block';
    }
});

// Setup page calibrate button
const setupCalibrateBtn = document.getElementById('calibrateBtn');
if (setupCalibrateBtn) {
    setupCalibrateBtn.addEventListener('click', () => {
        window.location.href = 'calibration.html';
    });
}