#!/bin/bash

# Setup script for Our New Bridge
# This script helps non-technical users get the project running

set -e

echo "🌉 Welcome to Our New Bridge Setup"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    echo "Then run this script again."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✓ Found Node.js: $NODE_VERSION"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    echo "Please install npm with Node.js from https://nodejs.org/"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✓ Found npm: $NPM_VERSION"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "📝 Creating .env file from .env.example..."
        cp .env.example .env
        echo "✓ Created .env file"
        echo ""
        echo "⚠️  IMPORTANT: Edit .env if you plan to use Google Maps"
        echo "   Open .env and add your Google Maps API key"
        echo "   Or leave it empty to use free OpenStreetMap"
    fi
else
    echo "✓ .env file already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development server, run:"
echo "   npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
