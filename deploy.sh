#!/bin/bash

# ==============================================================================
# Decision Intelligence Monolith Deployment Automation Script
# ==============================================================================
# This script handles automated releases, checking dependencies, git pulls,
# certificate checks, Docker builds, and running container validation.
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
DOMAIN="di.glassx.ai"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
STACK_DIR="/home/ubuntu/Decision_Intelligence"

echo "========================================="
echo "🚀 Starting Deployment Automation for $DOMAIN"
echo "========================================="

# 1. Check if running on target host or directory exists
if [ -d "$STACK_DIR" ]; then
    echo "📂 Navigating to stack directory: $STACK_DIR"
    cd "$STACK_DIR"
else
    echo "⚠️ Current directory used: $(pwd)"
fi

# 2. Check Docker and Docker Compose availability
echo "🔍 Checking Docker dependencies..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed on this host."
    echo "👉 Please run: sudo apt-get install -y docker.io"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed on this host."
    echo "👉 Please run: sudo apt-get install -y docker-compose"
    exit 1
fi

# 3. Pull latest release from GitHub
if [ -d ".git" ]; then
    echo "📥 Pulling latest codebase updates from Git..."
    git pull origin main || echo "⚠️ Git pull failed. Continuing with local changes."
else
    echo "ℹ️ Code repository not managed by git locally. Skipping pull."
fi

# 4. Check Let's Encrypt Certificates
echo "🔒 Verifying Let's Encrypt certificates..."
if [ ! -f "$CERT_PATH/fullchain.pem" ] || [ ! -f "$CERT_PATH/privkey.pem" ]; then
    echo "⚠️ SSL certificates not found under $CERT_PATH."
    echo "ℹ️ Bootstrapping Certbot in standalone mode to fetch initial certificates..."
    echo "👉 Ensure di.glassx.ai DNS points to this Elastic IP, and port 80 is open."
    echo "👉 Running standalone certbot. You may need sudo permissions."
    
    if command -v certbot &> /dev/null; then
        sudo certbot certonly --standalone -d $DOMAIN --preferred-challenges http --agree-tos -m admin@glassx.ai --non-interactive || {
            echo "❌ Failed to generate Let's Encrypt certificates."
            echo "👉 Verify that DNS A-Record resolves to this IP and Port 80 is open."
            exit 1
        }
    else
        echo "❌ certbot utility not installed on host."
        echo "👉 Run: sudo apt-get update && sudo apt-get install -y certbot"
        exit 1
    fi
else
    echo "✅ Let's Encrypt certificates found."
fi

# 5. Check Environment Variables File
echo "🔑 Verifying environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "⚠️ .env file not found. Copying .env.example..."
        cp .env.example .env
        echo "⚠️ Created template .env. Please update it with your actual GEMINI_API_KEY!"
    else
        echo "❌ .env file not found and .env.example is missing."
        exit 1
    fi
else
    echo "✅ .env file is present."
fi

# 6. Rebuild and Restart Docker Compose services
echo "🏗️ Rebuilding and launching Docker Compose stack..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 7. Verify stack health
echo "⏱️ Waiting for services to initialize and pass health checks..."
sleep 10

echo "📋 Docker Compose Status:"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

echo "📋 Checking application logs..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=20 nextjs-app

echo "========================================="
echo "🎉 Deployment process completed successfully!"
echo "👉 Site should be active at: https://$DOMAIN"
echo "========================================="
