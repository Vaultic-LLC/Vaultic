#!/bin/bash

# Script to check code signing status and help debug issues

echo "=== Checking Code Signing Status ==="

# Find the built app
APP_PATH=$(find ./out -name "Vaultic.app" -type d | head -1)

if [ -z "$APP_PATH" ]; then
    echo "❌ No Vaultic.app found in ./out directory"
    echo "Please run 'npm run make:mas' first"
    exit 1
fi

echo "📱 Found app at: $APP_PATH"

echo ""
echo "=== Main App Signature ==="
codesign -dv --verbose=4 "$APP_PATH"

echo ""
echo "=== Main App Entitlements ==="
codesign -d --entitlements - "$APP_PATH"

echo ""
echo "=== Checking Native Modules ==="
find "$APP_PATH" -name "*.node" -exec echo "Checking: {}" \; -exec codesign -dv {} \;

echo ""
echo "=== Checking Dynamic Libraries ==="
find "$APP_PATH" -name "*.dylib" -exec echo "Checking: {}" \; -exec codesign -dv {} \;

echo ""
echo "=== Verification ==="
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

echo ""
echo "=== Spctl Assessment ==="
spctl --assess --verbose "$APP_PATH"

