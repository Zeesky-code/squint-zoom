const toggleBtn = document.getElementById('toggleBtn');
const setupBtn = document.getElementById('setupBtn');
const statusDiv = document.getElementById('status');
const sensitivitySlider = document.getElementById('sensitivity');
const durationSlider = document.getElementById('duration');
const sensitivityValue = document.getElementById('sensitivityValue');
const durationValue = document.getElementById('durationValue');

let isMonitoring = false;
let hasPermission = false;

// Check camera permission status
chrome.storage.local.get(['cameraPermissionGranted'], (result) => {
  hasPermission = result.cameraPermissionGranted || false;
  updateButtons();
});

function updateButtons() {
  if (!hasPermission) {
    toggleBtn.style.display = 'none';
    setupBtn.style.display = 'block';
  } else {
    toggleBtn.style.display = 'block';
    setupBtn.style.display = 'none';
  }
}

// Setup button - opens setup page
setupBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'setup.html' });
});

// Calibrate button
document.getElementById('calibrateBtn')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'calibration.html' });
});

// Listen for permission changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.cameraPermissionGranted) {
    hasPermission = changes.cameraPermissionGranted.newValue;
    updateButtons();
  }
});

// Update UI based on monitoring state
function updateUI() {
  if (isMonitoring) {
    statusDiv.className = 'status active';
    statusDiv.innerHTML = '<div class="indicator"></div><span>Monitoring: Active</span>';
    toggleBtn.className = 'stop';
    toggleBtn.textContent = 'Stop Monitoring';
  } else {
    statusDiv.className = 'status inactive';
    statusDiv.innerHTML = '<div class="indicator"></div><span>Monitoring: Inactive</span>';
    toggleBtn.className = 'start';
    toggleBtn.textContent = 'Start Monitoring';
  }
}

// Toggle monitoring
toggleBtn.addEventListener('click', async () => {
  console.log('Toggle clicked, current state:', isMonitoring);

  // Check permission first
  if (!hasPermission) {
    chrome.tabs.create({ url: 'setup.html' });
    return;
  }

  try {
    if (isMonitoring) {
      const response = await chrome.runtime.sendMessage({ type: 'STOP_MONITORING' });
      console.log('Stop response:', response);
      isMonitoring = false;
    } else {
      const response = await chrome.runtime.sendMessage({ type: 'START_MONITORING' });
      console.log('Start response:', response);
      if (response && response.success) {
        isMonitoring = true;
      } else if (response && response.error === 'Permission required') {
        // Permission not granted, open setup
        chrome.tabs.create({ url: 'setup.html' });
        return;
      } else {
        alert('Failed to start monitoring. Check console for errors.');
      }
    }
    updateUI();
  } catch (error) {
    console.error('Toggle error:', error);
    alert('Error: ' + error.message);
  }
});

// Sensitivity slider
sensitivitySlider.addEventListener('input', (e) => {
  console.log('Sensitivity changed:', e.target.value);
  const value = parseInt(e.target.value);
  const labels = ['Low', 'Medium', 'High'];
  sensitivityValue.textContent = labels[value - 1];

  // Store setting
  chrome.storage.local.set({ sensitivity: value }, () => {
    console.log('Sensitivity saved:', value);
  });
});

// Duration slider
durationSlider.addEventListener('input', (e) => {
  console.log('Duration changed:', e.target.value);
  const value = parseInt(e.target.value);
  durationValue.textContent = `${(value / 1000).toFixed(1)}s`;

  // Store setting
  chrome.storage.local.set({ duration: value }, () => {
    console.log('Duration saved:', value);
  });
});

// Load saved settings on popup open
chrome.storage.local.get(['sensitivity', 'duration'], (result) => {
  console.log('Loaded settings:', result);

  if (result.sensitivity) {
    sensitivitySlider.value = result.sensitivity;
    const labels = ['Low', 'Medium', 'High'];
    sensitivityValue.textContent = labels[result.sensitivity - 1];
  }

  if (result.duration) {
    durationSlider.value = result.duration;
    durationValue.textContent = `${(result.duration / 1000).toFixed(1)}s`;
  }
});

// Check current monitoring status on popup open
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  console.log('Initial status:', response);
  if (response && response.active) {
    isMonitoring = true;
  }
  updateUI();
});

// Initial UI update
updateUI();

// Buy me a coffee handler
document.getElementById('coffeeBtn').addEventListener('click', (e) => {
  e.preventDefault();
  // REPLACE THIS with your actual link!
  chrome.tabs.create({ url: 'https://www.buymeacoffee.com/' });
});

console.log('Popup script loaded');