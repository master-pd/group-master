/**
 * 🤖 GROUP MASTER BOT - COMPLETE ADVANCED VERSION
 * Author: MAR-PD
 * Contact: https://t.me/master_spamming
 * GitHub Actions: 24/7 Hosting
 * Version: 2.0.0
 */

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// ==================== CONFIGURATION ====================
console.log('\x1b[36m%s\x1b[0m', '='.repeat(60));
console.log('\x1b[33m%s\x1b[0m', '🤖  GROUP MASTER BOT - ADVANCED EDITION');
console.log('\x1b[36m%s\x1b[0m', '='.repeat(60));

// Load configuration
let config;
try {
    config = require('./config.json');
    console.log('\x1b[32m%s\x1b[0m', '✅ Config loaded from config.json');
} catch (e) {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  config.json not found, using environment variables');
    config = {
        botName: 'Group Master 🤖',
        contact: 'https://t.me/master_spamming',
        watermark: 'Group Master Bot'
    };
}

// Get bot token from environment or config
const BOT_TOKEN = process.env.BOT_TOKEN || config.botToken;
if (!BOT_TOKEN) {
    console.error('\x1b[31m%s\x1b[0m', '❌ FATAL: BOT_TOKEN not found!');
    console.log('\x1b[33m%s\x1b[0m', '💡 Solutions:');
    console.log('   1. Add BOT_TOKEN in GitHub Secrets');
    console.log('   2. Create config.json with botToken');
    console.log('   3. Set environment variable BOT_TOKEN');
    process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', `✅ Bot Token: ${BOT_TOKEN.substring(0, 10)}...`);

// ==================== BOT INITIALIZATION ====================
console.log('\x1b[36m%s\x1b[0m', '\n🚀 INITIALIZING BOT...');

const botOptions = {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 30,
            limit: 100,
            allowed_updates: ['message', 'callback_query', 'chat_member']
        }
    },
    request: {
        timeout: 30000,
        agent: null,
        strict: true
    }
};

const bot = new TelegramBot(BOT_TOKEN, botOptions);
console.log('\x1b[32m%s\x1b[0m', '✅ Bot instance created');

// ==================== GLOBAL VARIABLES ====================
const botStartTime = Date.now();
const messageStatistics = {
    totalMessages: 0,
    commands: 0,
    autoReplies: 0,
    welcomeMessages: 0,
    errors: 0
};

const chatStates = new Map();
const userCooldowns = new Map();
const messageQueue = new Map();

// ==================== HANDLER LOADING ====================
console.log('\x1b[36m%s\x1b[0m', '\n📦 LOADING HANDLERS...');

let handlers = {
    message: null,
    command: null,
    welcome: null,
    moderation: null
};

try {
    handlers.message = require('./handlers/messageHandler');
    handlers.command = require('./handlers/commandHandler');
    handlers.welcome = require('./handlers/welcomeHandler');
    handlers.moderation = require('./handlers/moderationHandler');
    console.log('\x1b[32m%s\x1b[0m', '✅ All handlers loaded successfully');
} catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `❌ Handler load error: ${error.message}`);
    console.log('\x1b[33m%s\x1b[0m', '⚠️  Some features may not work properly');
}

// Initialize handlers if available
Object.entries(handlers).forEach(([name, handler]) => {
    if (handler && typeof handler.init === 'function') {
        try {
            handler.init(bot, config);
            console.log(`   ✅ ${name}Handler initialized`);
        } catch (error) {
            console.error(`   ❌ ${name}Handler init failed: ${error.message}`);
        }
    }
});

// ==================== BOT INFO FETCH ====================
let botInfo = null;
async function initializeBotInfo() {
    try {
        botInfo = await bot.getMe();
        console.log('\x1b[32m%s\x1b[0m', '\n📊 BOT INFORMATION:');
        console.log(`   🤖 Name: ${botInfo.first_name}`);
        console.log(`   📛 Username: @${botInfo.username}`);
        console.log(`   🆔 ID: ${botInfo.id}`);
        console.log(`   📞 Contact: ${config.contact}`);
        console.log(`   🕒 Started: ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
        
        return true;
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', `❌ Failed to get bot info: ${error.message}`);
        return false;
    }
}

// ==================== UTILITY FUNCTIONS ====================
function formatUptime() {
    const uptime = Date.now() - botStartTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function checkCooldown(userId, type = 'message', cooldown = 2000) {
    const key = `${userId}_${type}`;
    const now = Date.now();
    
    if (userCooldowns.has(key)) {
        const lastTime = userCooldowns.get(key);
        if (now - lastTime < cooldown) {
            return false; // Cooldown active
        }
    }
    
    userCooldowns.set(key, now);
    return true;
}

function updateStatistics(type) {
    messageStatistics.totalMessages++;
    if (messageStatistics[type] !== undefined) {
        messageStatistics[type]++;
    }
    
    // Clean old cooldowns every 100 messages
    if (messageStatistics.totalMessages % 100 === 0) {
        const now = Date.now();
        for (const [key, time] of userCooldowns.entries()) {
            if (now - time > 60000) { // 1 minute
                userCooldowns.delete(key);
            }
        }
    }
}

// ==================== MESSAGE QUEUE SYSTEM ====================
function addToQueue(chatId, messageId) {
    if (!messageQueue.has(chatId)) {
        messageQueue.set(chatId, []);
    }
    
    const queue = messageQueue.get(chatId);
    queue.push(messageId);
    
    // Keep only last 10 messages
    if (queue.length > 10) {
        const oldest = queue.shift();
        // Bot should delete this message if it's from bot
        return oldest;
    }
    
    return null;
}

// ==================== ENHANCED MESSAGE HANDLER ====================
bot.on('message', async (msg) => {
    try {
        messageStatistics.totalMessages++;
        
        // Basic message info
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const messageId = msg.message_id;
        const chatType = msg.chat.type;
        const isBot = msg.from.is_bot;
        const hasText = msg.text && msg.text.trim().length > 0;
        
        // Skip bot messages
        if (isBot) {
            if (msg.from.username !== botInfo?.username) {
                console.log(`🤖 Skipping other bot message: ${msg.from.username}`);
            }
            return;
        }
        
        // Update chat state
        if (!chatStates.has(chatId)) {
            chatStates.set(chatId, {
                lastActivity: Date.now(),
                messageCount: 0,
                lastMessageId: null
            });
        }
        
        const chatState = chatStates.get(chatId);
        chatState.lastActivity = Date.now();
        chatState.messageCount++;
        chatState.lastMessageId = messageId;
        
        // Add to message queue
        const oldMessageId = addToQueue(chatId, messageId);
        
        // Log message info
        console.log('\x1b[36m%s\x1b[0m', '\n📥 INCOMING MESSAGE:');
        console.log(`   👤 User: ${msg.from.first_name} (ID: ${userId})`);
        console.log(`   💬 Chat: ${chatType === 'private' ? 'Private' : msg.chat.title || 'Group'}`);
        console.log(`   📝 Text: ${hasText ? msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : '') : 'No text'}`);
        console.log(`   🆔 Message ID: ${messageId}`);
        
        // ==================== MESSAGE PROCESSING PIPELINE ====================
        
        // 1. CHECK COOLDOWN (Prevent spam processing)
        if (!checkCooldown(userId, 'processing', 500)) {
            console.log('   ⏳ Skipping: User in cooldown');
            return;
        }
        
        // 2. CHECK FOR NEW MEMBERS (Priority 1)
        if (msg.new_chat_members && msg.new_chat_members.length > 0) {
            console.log(`   🎉 New members detected: ${msg.new_chat_members.length}`);
            updateStatistics('welcomeMessages');
            
            // Check if bot itself joined
            const botJoined = msg.new_chat_members.some(
                member => member.is_bot && member.username === botInfo?.username
            );
            
            if (botJoined) {
                console.log('   🤖 Bot joined the group!');
                if (handlers.welcome && handlers.welcome.handleBotJoin) {
                    await handlers.welcome.handleBotJoin(msg);
                } else {
                    await sendDefaultBotJoinMessage(msg);
                }
            } else {
                console.log('   👥 Regular users joined');
                if (handlers.welcome && handlers.welcome.handle) {
                    await handlers.welcome.handle(msg);
                } else {
                    await sendDefaultWelcomeMessage(msg);
                }
            }
            return;
        }
        
        // 3. CHECK FOR COMMANDS (Priority 2)
        if (hasText && msg.text.startsWith('/')) {
            console.log(`   🔧 Command detected: ${msg.text.split(' ')[0]}`);
            updateStatistics('commands');
            
            // Show typing action for commands
            await bot.sendChatAction(chatId, 'typing');
            
            // Process command
            if (handlers.command && handlers.command.handle) {
                await handlers.command.handle(msg);
            } else {
                await handleDefaultCommand(msg);
            }
            return;
        }
        
        // 4. CHECK FOR NORMAL TEXT MESSAGES (Priority 3)
        if (hasText) {
            console.log(`   💬 Processing text message`);
            
            // Show typing action
            await bot.sendChatAction(chatId, 'typing');
            
            // Anti-spam check
            if (handlers.moderation && handlers.moderation.checkSpam) {
                const isSpam = handlers.moderation.checkSpam(msg);
                if (isSpam) {
                    console.log('   🚫 Message flagged as spam');
                    return;
                }
            }
            
            // Check bad words
            if (handlers.moderation && handlers.moderation.checkBadWords) {
                const hasBadWord = handlers.moderation.checkBadWords(msg);
                if (hasBadWord) {
                    console.log('   ⚠️  Message contains bad word');
                    return;
                }
            }
            
            // Check URLs
            if (handlers.moderation && handlers.moderation.checkUrl) {
                const hasUrl = handlers.moderation.checkUrl(msg);
                if (hasUrl) {
                    console.log('   🔗 URL detected and handled');
                    return;
                }
            }
            
            // Process auto-reply
            updateStatistics('autoReplies');
            if (handlers.message && handlers.message.handle) {
                await handlers.message.handle(msg);
            } else {
                await handleDefaultAutoReply(msg);
            }
            return;
        }
        
        // 5. OTHER MESSAGE TYPES (photos, stickers, etc.)
        if (msg.photo || msg.sticker || msg.document) {
            console.log(`   📸 Media message received`);
            // Handle media if needed
        }
        
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', `❌ ERROR in message handler: ${error.message}`);
        console.error(error.stack);
        messageStatistics.errors++;
        
        // Try to send error message to user
        try {
            if (msg && msg.chat) {
                await bot.sendMessage(msg.chat.id,
                    `❌ <b>Bot Error</b>\n\n` +
                    `An error occurred while processing your message.\n` +
                    `Please try again later.\n\n` +
                    `<code>Error: ${error.message.substring(0, 50)}</code>`,
                    { parse_mode: 'HTML' }
                );
            }
        } catch (sendError) {
            console.error('Failed to send error message:', sendError.message);
        }
    }
});

// ==================== OTHER EVENT HANDLERS ====================

// Handle callback queries (for inline keyboards)
bot.on('callback_query', async (callbackQuery) => {
    try {
        console.log(`🔄 Callback query: ${callbackQuery.data}`);
        await bot.answerCallbackQuery(callbackQuery.id);
        
        // Handle callback data if needed
        const data = callbackQuery.data;
        const msg = callbackQuery.message;
        
        // Example: Handle different callback actions
        if (data.startsWith('action_')) {
            const action = data.split('_')[1];
            console.log(`Action: ${action}`);
        }
        
    } catch (error) {
        console.error('Callback query error:', error.message);
    }
});

// Handle edited messages
bot.on('edited_message', (msg) => {
    console.log(`✏️ Message edited: ${msg.message_id}`);
    // Handle edited messages if needed
});

// Handle channel posts
bot.on('channel_post', (post) => {
    console.log(`📢 Channel post: ${post.chat.title}`);
    // Handle channel posts if needed
});

// ==================== ERROR HANDLERS ====================

bot.on('polling_error', (error) => {
    console.error('\x1b[31m%s\x1b[0m', `📡 POLLING ERROR: ${error.code}`);
    console.error(`Message: ${error.message}`);
    
    // Auto-restart on fatal errors
    if (error.code === 'EFATAL' || error.code === 'ETELEGRAM') {
        console.log('\x1b[33m%s\x1b[0m', '🔄 Attempting auto-restart in 10 seconds...');
        setTimeout(() => {
            console.log('\x1b[32m%s\x1b[0m', '🚀 Restarting bot...');
            process.exit(1); // Let PM2/process manager restart
        }, 10000);
    }
});

bot.on('webhook_error', (error) => {
    console.error('\x1b[31m%s\x1b[0m', `🌐 WEBHOOK ERROR: ${error.message}`);
});

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('\x1b[31m%s\x1b[0m', '❌ UNHANDLED REJECTION:');
    console.error(reason);
});

process.on('uncaughtException', (error) => {
    console.error('\x1b[31m%s\x1b[0m', '❌ UNCAUGHT EXCEPTION:');
    console.error(error);
    console.log('\x1b[33m%s\x1b[0m', '🔄 Restarting in 5 seconds...');
    setTimeout(() => process.exit(1), 5000);
});

// ==================== DEFAULT HANDLERS ====================

async function sendDefaultBotJoinMessage(msg) {
    try {
        const chatId = msg.chat.id;
        const chatTitle = msg.chat.title || 'this group';
        
        const joinMessage = `
🤖 <b>BOT JOINED SUCCESSFULLY!</b>

Thank you for adding me to <b>${chatTitle}</b>!

<b>✨ My Features:</b>
• Auto Welcome Messages 🎉
• Smart Auto Reply System 💬
• Spam Protection 🛡️
• Bad Word Filter ⚠️
• URL Protection 🔗

<b>👮 Required Permissions:</b>
• Delete Messages
• Ban Users
• Pin Messages
• Invite Users

<b>📞 Developer:</b> <a href="${config.contact}">MAR-PD</a>

Type <code>/help</code> to see all commands.
        `.trim();
        
        await bot.sendMessage(chatId, joinMessage, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        
        console.log('✅ Default bot join message sent');
    } catch (error) {
        console.error('Failed to send default bot join message:', error.message);
    }
}

async function sendDefaultWelcomeMessage(msg) {
    try {
        const chatId = msg.chat.id;
        const newMembers = msg.new_chat_members;
        
        for (const member of newMembers) {
            if (!member.is_bot) {
                const welcomeMessage = `
🎉 <b>WELCOME TO THE GROUP!</b>

Assalamualaikum <b>${member.first_name}</b>! 🤲

We're glad to have you here. Feel free to introduce yourself and check the group rules.

<b>📅 Joined:</b> ${moment().format('DD MMM YYYY, h:mm A')}
<b>👥 Total Members:</b> Growing every day!
<b>✨ Group Type:</b> ${msg.chat.type.toUpperCase()}

Enjoy your stay! 😊
                `.trim();
                
                await bot.sendMessage(chatId, welcomeMessage, {
                    parse_mode: 'HTML'
                });
                
                // Send welcome sticker
                try {
                    await bot.sendSticker(chatId, 
                        'CAACAgUAAxkBAAIBMWbIAAGWbOexsV9Oe-3uE8v5bJk7XAACsAIAAhX_6VU4AAHhOoX0cI81BA'
                    );
                } catch (stickerError) {
                    // Ignore sticker errors
                }
            }
        }
        
        console.log(`✅ Default welcome message sent for ${newMembers.length} members`);
    } catch (error) {
        console.error('Failed to send default welcome message:', error.message);
    }
}

async function handleDefaultCommand(msg) {
    const chatId = msg.chat.id;
    const command = msg.text.split(' ')[0];
    
    const commandResponses = {
        '/start': `
🤖 <b>GROUP MASTER BOT</b>

Assalamualaikum! I'm an advanced group management bot.

<b>⚡ Features:</b>
• Complete Group Management
• Auto Moderation System
• Welcome Messages
• Custom Commands

<b>📞 Contact:</b> <a href="${config.contact}">MAR-PD</a>

Type <code>/help</code> for commands.
        `,
        
        '/help': `
📜 <b>AVAILABLE COMMANDS</b>

<b>👤 User Commands:</b>
<code>/start</code> - Start the bot
<code>/help</code> - Show this help
<code>/admin</code> - Show group admins
<code>/ping</code> - Check bot status

<b>🤖 Auto Features:</b>
• Reply to: hi, hello, assalamualaikum
• Auto welcome new members
• Spam protection
• URL filtering

<b>🔧 Tech:</b>
• Hosted: GitHub Actions 24/7
• Language: Node.js
• Developer: MAR-PD
        `,
        
        '/ping': `
🏓 <b>PONG!</b>

<b>📊 Bot Status:</b>
• Uptime: ${formatUptime()}
• Messages: ${messageStatistics.totalMessages}
• Errors: ${messageStatistics.errors}
• Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
• Time: ${moment().format('HH:mm:ss')}

✅ <b>Bot is running perfectly!</b>
        `,
        
        '/stats': `
📈 <b>BOT STATISTICS</b>

<b>📊 Message Stats:</b>
• Total: ${messageStatistics.totalMessages}
• Commands: ${messageStatistics.commands}
• Auto Replies: ${messageStatistics.autoReplies}
• Welcome Msgs: ${messageStatistics.welcomeMessages}
• Errors: ${messageStatistics.errors}

<b>⚡ Performance:</b>
• Uptime: ${formatUptime()}
• Start Time: ${moment(botStartTime).format('DD MMM YYYY, HH:mm:ss')}
• Active Chats: ${chatStates.size}
• Memory Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB

<b>🤖 Bot Info:</b>
• Name: ${botInfo?.first_name || 'Loading...'}
• Username: @${botInfo?.username || 'Loading...'}
• Version: 2.0.0
• Developer: MAR-PD
        `
    };
    
    if (commandResponses[command]) {
        await bot.sendMessage(chatId, commandResponses[command].trim(), {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    } else {
        await bot.sendMessage(chatId,
            `❌ <b>Unknown Command</b>\n\n` +
            `Command <code>${command}</code> is not recognized.\n\n` +
            `Type <code>/help</code> for available commands.`,
            { parse_mode: 'HTML' }
        );
    }
}

async function handleDefaultAutoReply(msg) {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase();
    const userName = msg.from.first_name || 'Friend';
    
    const autoReplies = {
        'hi': [`Hello ${userName}! 👋`, `Hi ${userName}! 😊`, `Assalamualaikum ${userName}! 🤲`],
        'hello': [`Hey ${userName}! ✨`, `Hello there ${userName}!`, `Hi ${userName}! How are you?`],
        'assalamualaikum': [
            `Waalaikumussalam ${userName}! 🤲`,
            `Assalamualaikum warahmatullah ${userName}! ✨`,
            `Waalaikumussalam ${userName}! কেমন আছেন?`
        ],
        'ধন্যবাদ': [`আপনাকেও ধন্যবাদ ${userName}! 😊`, `স্বাগতম ${userName}! ❤️`],
        'thanks': [`You're welcome ${userName}! 😊`, `My pleasure ${userName}! ✨`],
        'бот': [`I'm here ${userName}! 🤖`, `Yes ${userName}, bot is active! ⚡`]
    };
    
    let reply = null;
    for (const [keyword, responses] of Object.entries(autoReplies)) {
        if (text.includes(keyword)) {
            reply = responses[Math.floor(Math.random() * responses.length)];
            break;
        }
    }
    
    if (reply) {
        await bot.sendMessage(chatId, reply, {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id
        });
        console.log(`✅ Auto-reply sent: ${reply.substring(0, 30)}...`);
    }
}

// ==================== SYSTEM FUNCTIONS ====================

// Periodic status update
setInterval(() => {
    const uptime = formatUptime();
    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const activeChats = chatStates.size;
    
    console.log('\x1b[36m%s\x1b[0m', '\n📊 SYSTEM STATUS:');
    console.log(`   ⏰ Uptime: ${uptime}`);
    console.log(`   💾 Memory: ${memory} MB`);
    console.log(`   💬 Active Chats: ${activeChats}`);
    console.log(`   📈 Messages: ${messageStatistics.totalMessages}`);
    console.log(`   🕒 Time: ${moment().format('HH:mm:ss')}`);
    
    // Clean inactive chats (older than 1 hour)
    const now = Date.now();
    let cleaned = 0;
    for (const [chatId, state] of chatStates.entries()) {
        if (now - state.lastActivity > 3600000) { // 1 hour
            chatStates.delete(chatId);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`   🧹 Cleaned ${cleaned} inactive chats`);
    }
    
}, 300000); // Every 5 minutes

// Graceful shutdown handler
function gracefulShutdown(signal) {
    return () => {
        console.log('\x1b[33m%s\x1b[0m', `\n${signal} received, shutting down gracefully...`);
        
        // Send offline notification to developer
        if (config.developerId && botInfo) {
            const statsMessage = `
🔴 <b>BOT SHUTDOWN</b>

<b>📊 Final Statistics:</b>
• Uptime: ${formatUptime()}
• Total Messages: ${messageStatistics.totalMessages}
• Commands: ${messageStatistics.commands}
• Auto Replies: ${messageStatistics.autoReplies}
• Active Chats: ${chatStates.size}

<b>🕒 Time:</b> ${moment().format('DD MMM YYYY, HH:mm:ss')}
<b>📡 Signal:</b> ${signal}
<b>🤖 Bot:</b> @${botInfo.username}

Will restart automatically via GitHub Actions...
            `.trim();
            
            config.developerId.forEach(devId => {
                bot.sendMessage(devId, statsMessage, { parse_mode: 'HTML' })
                    .catch(() => {});
            });
        }
        
        // Stop bot
        bot.stopPolling();
        
        // Wait a bit then exit
        setTimeout(() => {
            console.log('\x1b[32m%s\x1b[0m', '✅ Bot stopped gracefully');
            process.exit(0);
        }, 1000);
    };
}

// Register shutdown handlers
process.on('SIGINT', gracefulShutdown('SIGINT'));
process.on('SIGTERM', gracefulShutdown('SIGTERM'));

// ==================== STARTUP SEQUENCE ====================

async function startupSequence() {
    console.log('\x1b[36m%s\x1b[0m', '\n🚀 STARTING UP...');
    
    // Step 1: Get bot info
    console.log('   1. Fetching bot information...');
    const botInfoSuccess = await initializeBotInfo();
    if (!botInfoSuccess) {
        console.error('\x1b[31m%s\x1b[0m', '   ❌ Failed to get bot info, retrying in 5s...');
        setTimeout(initializeBotInfo, 5000);
    }
    
    // Step 2: Load data files
    console.log('   2. Loading data files...');
    try {
        const files = ['replies.json', 'help.json', 'badWords.json'];
        let loadedCount = 0;
        
        files.forEach(file => {
            try {
                require(`./data/${file}`);
                loadedCount++;
                console.log(`      ✅ ${file}`);
            } catch (e) {
                console.log(`      ⚠️  ${file} (not found, using defaults)`);
            }
        });
        
        console.log(`   📁 Loaded ${loadedCount}/${files.length} data files`);
    } catch (error) {
        console.log('   ⚠️  Data files not available, using default responses');
    }
    
    // Step 3: Start message polling
    console.log('   3. Starting message polling...');
    console.log('   📡 Listening for messages...');
    
    // Step 4: Send startup notification to developer
    if (config.developerId && Array.isArray(config.developerId)) {
        setTimeout(async () => {
            try {
                const startupMessage = `
🟢 <b>BOT STARTED SUCCESSFULLY!</b>

<b>🤖 Bot Information:</b>
• Name: ${botInfo?.first_name || 'Group Master'}
• Username: @${botInfo?.username || 'Loading...'}
• ID: ${botInfo?.id || 'N/A'}

<b>⚡ Hosting Details:</b>
• Platform: GitHub Actions
• Runtime: Node.js ${process.version}
• Uptime: ${formatUptime()}
• Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB

<b>📊 Ready to receive messages!</b>
<b>🕒 Started:</b> ${moment().format('DD MMM YYYY, HH:mm:ss')}
<b>📞 Contact:</b> ${config.contact}
                `.trim();
                
                for (const devId of config.developerId) {
                    await bot.sendMessage(devId, startupMessage, { 
                        parse_mode: 'HTML',
                        disable_web_page_preview: true 
                    });
                }
                
                console.log('\x1b[32m%s\x1b[0m', '✅ Startup notification sent to developer');
            } catch (error) {
                console.error('Failed to send startup notification:', error.message);
            }
        }, 3000);
    }
    
    // Step 5: Display final startup message
    setTimeout(() => {
        console.log('\x1b[32m%s\x1b[0m', '\n' + '='.repeat(60));
        console.log('\x1b[33m%s\x1b[0m', '✅ BOT IS NOW FULLY OPERATIONAL');
        console.log('\x1b[32m%s\x1b[0m', '='.repeat(60));
        console.log('\x1b[36m%s\x1b[0m', '\n🎯 TEST COMMANDS:');
        console.log('   💬 /start      - Start conversation');
        console.log('   📖 /help       - Show help menu');
        console.log('   🏓 /ping       - Check bot status');
        console.log('   📊 /stats      - View statistics');
        console.log('   👋 Say "hi"    - Test auto reply');
        console.log('   ✨ Add to group- Test welcome system');
        console.log('\x1b[36m%s\x1b[0m', '🔧 TECHNICAL INFO:');
        console.log(`   Host: GitHub Actions 24/7`);
        console.log(`   Node: ${process.version}`);
        console.log(`   Platform: ${process.platform}`);
        console.log(`   PID: ${process.pid}`);
        console.log('\x1b[32m%s\x1b[0m', '='.repeat(60));
        console.log('\x1b[33m%s\x1b[0m', '📞 Developer: MAR-PD');
        console.log('\x1b[36m%s\x1b[0m', `💬 Contact: ${config.contact}`);
        console.log('\x1b[32m%s\x1b[0m', '='.repeat(60));
    }, 2000);
}

// Start the bot
startupSequence().catch(error => {
    console.error('\x1b[31m%s\x1b[0m', '❌ STARTUP FAILED:');
    console.error(error);
    process.exit(1);
});

// Export for testing if needed
module.exports = { bot, config, messageStatistics };
