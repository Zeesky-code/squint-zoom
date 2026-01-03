#!/bin/bash

# MediaPipe Download Script for Squint Zoom Extension
echo "Downloading MediaPipe libraries..."

# Create libs directory if it doesn't exist
mkdir -p libs
cd libs

echo "Downloading Face Mesh JS..."
curl -L -o face_mesh.js \
  https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js

echo "Downloading Camera Utils JS..."
curl -L -o camera_utils.js \
  https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js

echo "Downloading Face Mesh Model Binary..."
curl -L -o face_mesh.binarypb \
  https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.binarypb

echo "Downloading Face Mesh WASM data..."
curl -L -o face_mesh_solution_packed_assets.data \
  https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh_solution_packed_assets.data

echo "Downloading Face Mesh WASM binary (SIMD)..."
curl -L -o face_mesh_solution_simd_wasm_bin.wasm \
  https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh_solution_simd_wasm_bin.wasm

echo "Downloading Face Mesh WASM loader (SIMD)..."
curl -L -o face_mesh_solution_simd_wasm_bin.js \
  https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh_solution_simd_wasm_bin.js

echo "Downloading Face Mesh WASM binary..."
curl -L -o face_mesh_solution_wasm_bin.wasm \
  https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh_solution_wasm_bin.wasm

echo "Downloading Face Mesh WASM loader..."
curl -L -o face_mesh_solution_wasm_bin.js \
  https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh_solution_wasm_bin.js

echo "Downloading Face Mesh Assets Loader..."
curl -L -o face_mesh_solution_packed_assets_loader.js \
  https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh_solution_packed_assets_loader.js

cd ..

echo ""
echo "Download complete! Files saved to libs/"
echo ""
echo "File sizes:"
ls -lh libs/

echo ""
echo "Next steps:"
echo "1. Make sure Chrome has camera permission (System Settings -> Privacy & Security -> Camera)"
echo "2. Reload the extension in chrome://extensions"
echo "3. Click 'Start Monitoring' in the extension popup"