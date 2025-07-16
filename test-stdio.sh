#!/bin/bash
# Test script for stdio mode
echo "Testing stdio mode..." >&2
node dist/index.js --stdio &
PID=$!
sleep 2
kill $PID 2>/dev/null
echo "Test complete" >&2
