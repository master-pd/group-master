const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// লোড কনফিগারেশন
const config = require('./config.json');
const BOT_TOKEN = process.env.BOT_TOKEN || config.botToken;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN missing!');
    process.exit(1);
}

// বট ইনিশিয়ালাইজ
const bot = new TelegramBot(BOT_TOKEN, {
    polling: {
        interval: 300,
        autoStart: true
    }
});

// লোড হ্যান্ডলার্স
const messageHandler = require('./handlers/message');
const commandHandler = require('./handlers/command');
const welcomeHandler = require('./handlers/welcome');
const moderationHandler = require('./handlers/moderation');

// ইনিশিয়ালাইজ হ্যান্ডলার্স
messageHandler.init(bot, config);
commandHandler.init(bot, config);
welcomeHandler.init(bot, config);
moderationHandler.init(bot, config);

// মেসেজ ইভেন্ট
bot.on('message', async (msg) => {
    // ইগনোর বট মেসেজ
    if (msg.from.is_bot) return;
    
    // চেক স্পাম
    if (moderationHandler.checkSpam(msg)) return;
    
    // চেক ব্যাড ওয়ার্ড
    if (moderationHandler.checkBadWords(msg)) return;
    
    // চেক URL
    if (moderationHandler.checkUrl(msg)) return;
    
    // হ্যান্ডল কমান্ড
    if (msg.text && msg.text.startsWith('/')) {
        await commandHandler.handle(msg);
        return;
    }
    
    // হ্যান্ডল নিউ মেম্বার
    if (msg.new_chat_members) {
        await welcomeHandler.handle(msg);
        return;
    }
    
    // হ্যান্ডল নরমাল মেসেজ
    if (msg.text) {
        await messageHandler.handle(msg);
    }
});

// বট জয়েন মেসেজ
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

// এরর হ্যান্ডলিং
bot.on('polling_error', (error) => {
    console.error(`Polling error: ${error.code}`);
});

// বট স্টার্ট
bot.getMe().then(botInfo => {
    console.log(`✅ Bot started: @${botInfo.username}`);
}).catch(error => {
    console.error(`❌ Bot start failed: ${error.message}`);
});
