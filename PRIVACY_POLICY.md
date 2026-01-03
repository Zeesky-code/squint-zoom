# Privacy Policy for Squint Zoom

**Last Updated:** January 3, 2026

## 1. Overview
Squint Zoom ("the Extension") is a productivity tool that adjusts your web page zoom level based on your facial expressions (squinting or opening eyes wide). This policy describes how we handle your data.

## 2. Data Collection and Usage
The Extension requires access to your device's **camera (webcam)** to function. 

*   **Video Data**: The camera feed is processed **locally on your device** in real-time.
*   **Purpose**: We use the video feed solely to calculate the "Eye Aspect Ratio" (EAR) to detect specific gestures (squinting).
*   **No Transmission**: **No video data, images, or facial recognition data is ever sent to external servers.** All processing happens within your browser's memory and is discarded immediately after analysis.

## 3. Data Storage
*   **Settings**: We store your sensitivity preferences (e.g., calibration thresholds) locally in your browser using the `chrome.storage` API. This data never leaves your browser.
*   **Facial Data**: We **do not** store any facial data, landmarks, or images.

## 4. Third-Party Services
The Extension uses **MediaPipe Face Mesh** (by Google) for landmark detection. This library is bundled with the Extension and runs locally/offline. It does not communicate with external servers.

## 5. Contact
If you have questions about this privacy policy, you can open an issue on our [GitHub Repository](https://github.com/Zeesky-code/squint-zoom).
