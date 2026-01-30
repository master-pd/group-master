#!/bin/bash

echo "========================================"
echo "🤖 Group Master Bot - Startup Script"
echo "========================================"
echo "Time: $(date)"
echo "Node Version: $(node --version)"
echo "NPM Version: $(npm --version)"
echo "========================================"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Check if config exists
if [ ! -f "config.json" ]; then
    echo "⚠️  config.json not found, creating from template..."
    cat > config.json << EOF
{
    "botToken": "$BOT_TOKEN",
    "developerId": [$DEVELOPER_ID],
    "botName": "Group Master 🤖",
    "contact": "https://t.me/master_spamming"
}
EOF
fi

# Start the bot
echo "🚀 Starting bot..."
node index.js
