#!/bin/bash

# Stop all running Expo servers
echo "Stopping all existing Expo servers..."
pkill -f "expo start" 2>/dev/null

# Wait for processes to terminate
sleep 2

# Kill any process still using port 8081
echo "Clearing port 8081..."
kill $(lsof -t -i :8081) 2>/dev/null || true

# Wait again
sleep 1

# Clear any existing adb reverse mappings
echo "Clearing existing adb reverse mappings..."
adb reverse --remove-all

# Start a new Expo server on port 8081
echo "Starting new Expo server on port 8081..."
npx expo start --clear --port 8081 &

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Set up adb reverse mapping for both 8081 and 8082 (in case the app tries either)
echo "Setting up adb reverse mappings..."
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8082 tcp:8082

# Verify server is running
echo "Verifying server is running..."
if curl -s --connect-timeout 2 http://localhost:8081 > /dev/null; then
  echo "✅ Expo server is running on port 8081"
else
  echo "❌ Expo server failed to start"
  exit 1
fi

# Verify adb reverse mapping is set up correctly
echo "\nCurrent adb reverse mappings:"
adb reverse --list

# Test connectivity from device to server
echo "\nTesting connectivity from device to server..."
adb shell curl -s --connect-timeout 2 http://localhost:8081 > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Device can access server through adb reverse"
else
  echo "❌ Device cannot access server through adb reverse"
  # Try alternative approach - set server host on device
  DEVELOPER_IP=$(hostname -I | head -n1)
  echo "📱 Launching app with direct IP: exp://$DEVELOPER_IP:8081"
adb shell am start -a android.intent.action.VIEW -d "exp://$DEVELOPER_IP:8081" host.exp.exponent
fi

echo "\n✅ Setup complete! Try reloading the app on your device."
