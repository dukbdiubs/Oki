#!/bin/bash

# Chaotic Ball Animation Deployment Script
echo "🎱 Setting up Chaotic Ball Animation..."

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found. Make sure you're in the project directory."
    exit 1
fi

# Start a simple HTTP server
echo "🚀 Starting local development server..."

# Try Python 3 first, then Python 2, then Node.js
if command -v python3 &> /dev/null; then
    echo "📡 Using Python 3 HTTP server on http://localhost:8000"
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "📡 Using Python 2 HTTP server on http://localhost:8000"
    python -m SimpleHTTPServer 8000
elif command -v node &> /dev/null && command -v npx &> /dev/null; then
    echo "📡 Using Node.js HTTP server on http://localhost:8000"
    npx http-server -p 8000
else
    echo "❌ No suitable HTTP server found."
    echo "Please install Python or Node.js, or serve the files manually."
    echo ""
    echo "Alternative deployment options:"
    echo "1. Upload files to GitHub Pages"
    echo "2. Deploy to Netlify (drag & drop the folder)"
    echo "3. Deploy to Vercel"
    echo "4. Use any static hosting service"
    exit 1
fi