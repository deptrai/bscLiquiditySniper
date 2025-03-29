#!/bin/bash

# Start MongoDB with Docker Compose
echo "Starting MongoDB..."
docker-compose up -d

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
sleep 5

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the application
echo "Starting BSC Liquidity Sniper..."
npm run dev 