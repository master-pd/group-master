# Group Master Bot Documentation

## 📖 Table of Contents
1. [Features](#features)
2. [Setup](#setup)
3. [Configuration](#configuration)
4. [Commands](#commands)
5. [Auto Replies](#auto-replies)
6. [Moderation](#moderation)
7. [Hosting](#hosting)
8. [Troubleshooting](#troubleshooting)

## 🚀 Features

### Core Features
- ✅ Auto Welcome Messages (Group/Private/Supergroup)
- ✅ Auto Reply System with JSON configuration
- ✅ HTML Formatting support
- ✅ Spam Protection with auto-mute
- ✅ Bad Word Filter
- ✅ URL Protection (Admin only)
- ✅ Message limit (10 messages)

### Advanced Features
- Bot join welcome message
- Admin welcome message
- Random welcome image generation
- Typing indicator simulation
- Broadcast system
- Sticker auto-reactions

## ⚙️ Setup

### Quick Start
1. Get bot token from @BotFather
2. Fork this repository
3. Add GitHub Secrets:
   - `BOT_TOKEN`: Your bot token
   - `DEVELOPER_ID`: Your Telegram ID
4. Enable Actions in repository settings
5. Run workflow manually or wait for auto-start

### Manual Setup
```bash
git clone <your-repo>
cd telegram-group-master
npm install
node index.js
