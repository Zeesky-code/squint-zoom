const video = document.getElementById('video');
const sandbox = document.getElementById('sandbox');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let isSandboxReady = false;
let currentEAR = 0;
let processingInterval = null;

// UI Elements
const earDisplays = document.querySelectorAll('[id^=earValue]');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4');
const resultSummary = document.getElementById('resultsSummary');

const btnNormal = document.getElementById('btnNormal');
const btnSquint = document.getElementById('btnSquint');
const btnWide = document.getElementById('btnWide');
const btnClose = document.getElementById('btnClose');

// Initialize UI state
if (btnNormal) {
    btnNormal.disabled = true;
    btnNormal.textContent = 'Loading...';
}
if (btnSquint) btnSquint.disabled = true;
if (btnWide) btnWide.disabled = true;

// Captured Values
let normalEAR = 0;
let squintEAR = 0;
let wideEAR = 0;

// Initialize Camera and Sandbox
async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { width: { ideal: 320 }, height: { ideal: 240 } }
        });
        video.srcObject = stream;
        await video.play();

        // Init sandbox with calibration mode
        sandbox.onload = () => {
            sandbox.contentWindow.postMessage({
                type: 'INIT',
                calibration: true // Enable raw EAR streaming
            }, '*');
        };

        startProcessingLoop();

    } catch (error) {
        alert('Camera access failed! Cannot calibrate.');
        console.error(error);
    }
}

// Processing Loop (Send Frames)
function startProcessingLoop() {
    processingInterval = setInterval(() => {
        if (video.readyState === video.HAVE_ENOUGH_DATA && isSandboxReady) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            sandbox.contentWindow.postMessage({
                type: 'FRAME',
                image: imageData
            }, '*');
        }
    }, 100);
}

// Message Handler
window.addEventListener('message', (event) => {
    if (event.data.type === 'SANDBOX_READY') {
        isSandboxReady = true;
        // Enable start button only when ready
        btnNormal.disabled = false;
        btnNormal.textContent = 'Record Normal State';
    } else if (event.data.type === 'EAR_UPDATE') {
        currentEAR = event.data.ear;
        updateUI(currentEAR);
    }
});

function updateUI(ear) {
    earDisplays.forEach(el => el.textContent = ear.toFixed(3));
}

// Wizard Logic
function captureAverage(duration = 2000) {
    return new Promise(resolve => {
        const samples = [];

        const sampleInterval = setInterval(() => {
            // Only push valid EAR values
            if (currentEAR > 0 && !isNaN(currentEAR)) {
                samples.push(currentEAR);
            }
        }, 50);

        setTimeout(() => {
            clearInterval(sampleInterval);
            if (samples.length === 0) {
                resolve(0); // Return 0 if no samples captured
                return;
            }
            const sum = samples.reduce((a, b) => a + b, 0);
            const avg = sum / samples.length;
            resolve(avg);
        }, duration);
    });
}

btnNormal.onclick = async () => {
    btnNormal.textContent = 'Recording... (Hold still)';
    btnNormal.disabled = true;

    normalEAR = await captureAverage(2000);
    console.log('Normal EAR:', normalEAR);

    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    btnSquint.disabled = false; // Enable next button
};

btnSquint.onclick = async () => {
    btnSquint.textContent = 'Recording... (Keep squinting)';
    btnSquint.disabled = true;

    squintEAR = await captureAverage(2000);
    console.log('Squint EAR:', squintEAR);

    step2.classList.add('hidden');
    step3.classList.remove('hidden');
    btnWide.disabled = false; // Enable next button
};

btnWide.onclick = async () => {
    btnWide.textContent = 'Recording... (Hold Wide)';
    btnWide.disabled = true;

    wideEAR = await captureAverage(2000);
    console.log('Wide EAR:', wideEAR);

    finishCalibration();
};

async function finishCalibration() {
    step3.classList.add('hidden');
    step4.classList.remove('hidden');

    // Validate recordings
    if (normalEAR === 0 || squintEAR === 0 || wideEAR === 0) {
        resultSummary.innerHTML = 'Error: Calibration failed. Camera did not capture data. Please try again.';
        return;
    }

    // Calculate Thresholds
    // Squint Threshold: midpoint between Squint and Normal
    let newSquintThreshold = (normalEAR + squintEAR) / 2;
    // Wide Threshold: midpoint between Normal and Wide
    let newWideThreshold = (normalEAR + wideEAR) / 2;

    // Validation: Ensure Squint < Normal < Wide
    if (newSquintThreshold >= normalEAR) newSquintThreshold = normalEAR - 0.05;
    if (newWideThreshold <= normalEAR) newWideThreshold = normalEAR + 0.05;

    const settings = {
        squintThreshold: parseFloat(newSquintThreshold.toFixed(3)),
        wideEyeThreshold: parseFloat(newWideThreshold.toFixed(3))
    };

    resultSummary.innerHTML = `
        Normal: ${normalEAR.toFixed(3)}<br>
        Squint: ${squintEAR.toFixed(3)} (Thresh: <b>${settings.squintThreshold}</b>)<br>
        Wide: ${wideEAR.toFixed(3)} (Thresh: <b>${settings.wideEyeThreshold}</b>)
    `;

    // Save to Storage
    await chrome.storage.local.set(settings);
    console.log('Settings saved:', settings);
}

btnClose.onclick = () => {
    window.close();
};

// Start
init();
