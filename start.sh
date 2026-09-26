#!/bin/bash
set -e

# Start Python in the background on a fixed internal port.
uvicorn main:app --host 0.0.0.0 --port 8000 &

# Node is the process Railway actually watches — runs in the foreground.
exec node server.js
