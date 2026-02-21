#!/bin/bash

PORT=3000

PID=$(lsof -t -i:$PORT)

if [ -z "$PID" ]; then
  echo "No process found on port $PORT."
else
  echo "Process found with PID: $PID. Killing process..."
  kill -9 $PID
  echo "Process $PID killed."
fi
