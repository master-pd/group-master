const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Load config
const config = require('./config.json');
const BOT_TOKEN = process.env.BOT_TOKEN || config.botToken;

if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN not found!");
    console.log("💡 Add BOT_TOKEN in GitHub Secrets");
    process.exit(1);
}

// Initialize bot
const bot = new TelegramBot(BOT_TOKEN, { 
    polling: { 
        interval: 300,
        autoStart: true 
    } 
});

console.log(`🤖 ${config.botName} is starting...`);

// Load handlers
const messageHandler = require('./handlers/messageHandler');
const commandHandler = require('./handlers/commandHandler');
const welcomeHandler = require('./handlers/welcomeHandler');
const moderationHandler = require('./handlers/moderationHandler');

// Initialize handlers
messageHandler.init(bot, config);
commandHandler.init(bot, config);
welcomeHandler.init(bot, config);
moderationHandler.init(bot, config);

// Message event
bot.on('message', async (msg) => {
    try {
        // Ignore bot messages
        if (msg.from.is_bot) return;
        
        // Check spam first
        if (moderationHandler.checkSpam(msg)) return;
        
        // Check bad words
        if (moderationHandler.checkBadWords(msg)) return;
        
        // Check URL spam
        if (moderationHandler.checkUrl(msg)) return;
        
        // Handle commands
        if (msg.text && msg.text.startsWith('/')) {
            await commandHandler.handle(msg);
        } 
        // Handle new members
        else if (msg.new_chat_members) {
            await welcomeHandler.handle(msg);
        }
        // Handle normal messages
        else if (msg.text) {
            await messageHandler.handle(msg);
        }
        
    } catch (error) {
        console.error('❌ Error in message handler:', error.message);
    }
});

// Handle bot joining group
bot.on('new_chat_members', async (msg) => {
    const newMembers = msg.new_chat_members;
    const botInfo = await bot.getMe();
    const isBotJoined = newMembers.some(member => 
        member.is_bot && member.username === botInfo.username
    );
    
    if (isBotJoined) {
        await welcomeHandler.handleBotJoin(msg);
    }
});

// Error handling
bot.on('polling_error', (error) => {
    console.error(`📡 Polling Error: ${error.code}`);
    if (error.code === 'EFATAL') {
        console.log('🔄 Restarting bot in 5 seconds...');
        setTimeout(() => process.exit(1), 5000);
    }
});

// Bot info
bot.getMe().then((botInfo) => {
    console.log(`✅ Bot started: @${botInfo.username}`);
    console.log(`🚀 Running via GitHub Actions 24/7`);
    console.log(`📞 Contact: ${config.contact}`);
}).catch(error => {
    console.error('❌ Failed to start:', error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    bot.stopPolling();
    process.exit(0);
});
