let faceMesh = null;
let isInitialized = false;
let isCalibrating = false;

// Squint detection settings (dynamic)
let SQUINT_THRESHOLD = 0.38;
let WIDE_EYE_THRESHOLD = 0.52;
let SQUINT_DURATION = 400;
const COOLDOWN = 1500;
let lastZoomTime = 0;
let squintStartTime = null;
let wideEyeStartTime = null;

const LEFT_EYE = {
    upper: [159, 145],
    lower: [23, 110],
    left: 33,
    right: 133
};

const RIGHT_EYE = {
    upper: [386, 374],
    lower: [253, 339],
    left: 362,
    right: 263
};

function calculateEAR(eyePoints, landmarks) {
    if (!landmarks || landmarks.length === 0) return 1.0;

    const upper1 = landmarks[eyePoints.upper[0]];
    const upper2 = landmarks[eyePoints.upper[1]];
    const lower1 = landmarks[eyePoints.lower[0]];
    const lower2 = landmarks[eyePoints.lower[1]];
    const left = landmarks[eyePoints.left];
    const right = landmarks[eyePoints.right];

    if (!upper1 || !upper2 || !lower1 || !lower2 || !left || !right) return 1.0;

    const v1 = Math.sqrt(
        Math.pow(upper1.x - lower1.x, 2) +
        Math.pow(upper1.y - lower1.y, 2) +
        Math.pow((upper1.z || 0) - (lower1.z || 0), 2)
    );
    const v2 = Math.sqrt(
        Math.pow(upper2.x - lower2.x, 2) +
        Math.pow(upper2.y - lower2.y, 2) +
        Math.pow((upper2.z || 0) - (lower2.z || 0), 2)
    );
    const vertical = (v1 + v2) / 2;

    const horizontal = Math.sqrt(
        Math.pow(right.x - left.x, 2) +
        Math.pow(right.y - left.y, 2) +
        Math.pow((right.z || 0) - (left.z || 0), 2)
    );

    return vertical / horizontal;
}

function onResults(results) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const leftEAR = calculateEAR(LEFT_EYE, landmarks);
        const rightEAR = calculateEAR(RIGHT_EYE, landmarks);
        const avgEAR = (leftEAR + rightEAR) / 2;

        const now = Date.now();

        // Stream raw EAR if calibrating
        if (isCalibrating) {
            window.parent.postMessage({
                type: 'EAR_UPDATE',
                ear: avgEAR
            }, '*');
        }

        // 1. Squint Detection (Zoom In)
        if (avgEAR < SQUINT_THRESHOLD) {
            if (!squintStartTime) {
                squintStartTime = now;
            } else if (now - squintStartTime >= SQUINT_DURATION) {
                if (now - lastZoomTime >= COOLDOWN) {
                    window.parent.postMessage({
                        type: 'SQUINT_DETECTED',
                        intensity: 1 - avgEAR
                    }, '*');
                    lastZoomTime = now;
                    squintStartTime = null;
                }
            }
            wideEyeStartTime = null; // Reset wide eye timer
        }
        // 2. Wide Eye Detection (Zoom Out)
        else if (avgEAR > WIDE_EYE_THRESHOLD) {
            if (!wideEyeStartTime) {
                wideEyeStartTime = now;
            } else if (now - wideEyeStartTime >= SQUINT_DURATION) {
                if (now - lastZoomTime >= COOLDOWN) {
                    window.parent.postMessage({
                        type: 'WIDE_EYES_DETECTED',
                        intensity: avgEAR
                    }, '*');
                    lastZoomTime = now;
                    wideEyeStartTime = null;
                }
            }
            squintStartTime = null; // Reset squint timer
        }
        // 3. Normal State
        else {
            squintStartTime = null;
            wideEyeStartTime = null;
        }
    } else {
        squintStartTime = null;
        wideEyeStartTime = null;
    }
}

async function initFaceMesh() {
    console.log('Initializing MediaPipe Face Mesh in Sandbox...');
    faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `libs/${file}`;
        }
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onResults);
    await faceMesh.initialize();
    isInitialized = true;
    console.log('MediaPipe Face Mesh initialized in Sandbox');
    window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
}

window.addEventListener('message', async (event) => {
    if (event.data.type === 'INIT') {
        // Apply settings if provided
        if (event.data.settings) {
            if (event.data.settings.squintThreshold) SQUINT_THRESHOLD = event.data.settings.squintThreshold;
            if (event.data.settings.wideEyeThreshold) WIDE_EYE_THRESHOLD = event.data.settings.wideEyeThreshold;
            console.log(`Sandbox settings updated: Squint < ${SQUINT_THRESHOLD}, Wide > ${WIDE_EYE_THRESHOLD}`);
        }

        // Enable calibration mode if requested
        if (event.data.calibration) {
            isCalibrating = true;
            console.log('Sandbox calibration mode: ON');
        } else {
            isCalibrating = false;
        }

        if (!isInitialized) {
            await initFaceMesh();
        }
    } else if (event.data.type === 'FRAME') {
        if (isInitialized && faceMesh) {
            try {
                await faceMesh.send({ image: event.data.image });
            } catch (error) {
                // Silently ignore frame errors to avoid spam
            }
        }
    }
});
