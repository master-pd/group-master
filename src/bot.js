import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));

// 🔥 Render.com এর জন্য পরিবর্তন ১: Environment Variable থেকে টোকেন নেওয়া
const BOT_TOKEN = process.env.BOT_TOKEN || config.bot.token;
if (!BOT_TOKEN) throw new Error("❌ BOT_TOKEN missing! Set BOT_TOKEN in Render.com Environment Variables");

class GroupMasterBot {
    constructor() {
        this.config = config;
        this.bot = null;
        this.handlers = new Map();
        this.features = new Map();
        this.stats = {
            messages: 0,
            commands: 0,
            errors: 0,
            startTime: new Date()
        };
        
        // Cache for all JSON responses
        this.jsonCache = {
            replies: null,
            reactions: null,
            emojis: null,
            welcomeGroup: null,
            welcomeSuper: null,
            welcomeChat: null,
            welcomeBot: null,
            badWords: null,
            stickers: null,
            lastLoaded: null
        };
        
        this.init();
    }
    
    init() {
        console.log('🤖 Initializing Group Master Pro Bot...');
        console.log('🚀 Render.com Deployment Ready');
        
        // 🔥 Render.com এর জন্য পরিবর্তন ২: Webhook সেটআপ
        if (process.env.RENDER) {
            // Render.com এ auto webhook সেটআপ
            const port = process.env.PORT || 3000;
            const webhookUrl = process.env.RENDER_EXTERNAL_URL || `https://${process.env.RENDER_SERVICE_NAME}.onrender.com`;
            
            this.bot = new TelegramBot(BOT_TOKEN, {
                webHook: {
                    port: port,
                    host: '0.0.0.0'
                }
            });
            
            // Render.com এর জন্য webhook সেট করা
            this.bot.setWebHook(`${webhookUrl}/bot${BOT_TOKEN}`);
            console.log(`🌐 Render Webhook URL: ${webhookUrl}/bot${BOT_TOKEN}`);
            console.log(`🔧 Port: ${port}`);
        } else if (this.config.webhook?.enabled) {
            // Local webhook (যদি কনফিগে থাকে)
            this.bot = new TelegramBot(BOT_TOKEN, {
                webHook: {
                    port: this.config.webhook.port,
                    key: this.config.webhook.key,
                    cert: this.config.webhook.cert
                }
            });
            this.bot.setWebHook(this.config.webhook.url);
            console.log(`🌐 Local Webhook: ${this.config.webhook.url}`);
        } else {
            // Polling mode (local development)
            this.bot = new TelegramBot(BOT_TOKEN, {
                polling: {
                    timeout: this.config.bot.polling_timeout || 60,
                    interval: 300,
                    autoStart: false
                }
            });
            console.log('🔄 Polling mode enabled (Local Development)');
        }
        
        this.bot.username = this.config.bot.username;
        this.bot.name = this.config.bot.name;
        
        // Load handlers
        this.loadHandlers();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load all JSON data
        this.loadAllJsonData();
    }
    
    loadAllJsonData() {
        console.log('📂 Loading all JSON data...');
        
        try {
            // 1. Load reply.json
            const replyPath = path.join(__dirname, '..', 'data', 'response', 'reply.json');
            if (fs.existsSync(replyPath)) {
                this.jsonCache.replies = JSON.parse(fs.readFileSync(replyPath, 'utf8'));
                console.log(`✅ Loaded replies: ${Object.keys(this.jsonCache.replies).length} patterns`);
            } else {
                console.log('❌ reply.json not found');
                this.jsonCache.replies = {};
            }
            
            // 2. Load react.json
            const reactPath = path.join(__dirname, '..', 'data', 'response', 'react.json');
            if (fs.existsSync(reactPath)) {
                this.jsonCache.reactions = JSON.parse(fs.readFileSync(reactPath, 'utf8'));
                console.log(`✅ Loaded reactions`);
            } else {
                console.log('❌ react.json not found');
                this.jsonCache.reactions = {};
            }
            
            // 3. Load emoji.json
            const emojiPath = path.join(__dirname, '..', 'data', 'response', 'emoji.json');
            if (fs.existsSync(emojiPath)) {
                this.jsonCache.emojis = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
                console.log(`✅ Loaded emojis`);
            } else {
                console.log('❌ emoji.json not found');
                this.jsonCache.emojis = {};
            }
            
            // 4. Load welcome files
            const welcomeBasePath = path.join(__dirname, '..', 'data', 'welcome');
            
            const groupWelcomePath = path.join(welcomeBasePath, 'group.json');
            if (fs.existsSync(groupWelcomePath)) {
                this.jsonCache.welcomeGroup = JSON.parse(fs.readFileSync(groupWelcomePath, 'utf8'));
                console.log(`✅ Loaded group welcome messages`);
            } else {
                console.log('❌ group.json not found');
                this.jsonCache.welcomeGroup = [];
            }
            
            const superWelcomePath = path.join(welcomeBasePath, 'super.json');
            if (fs.existsSync(superWelcomePath)) {
                this.jsonCache.welcomeSuper = JSON.parse(fs.readFileSync(superWelcomePath, 'utf8'));
                console.log(`✅ Loaded supergroup welcome messages`);
            } else {
                console.log('❌ super.json not found');
                this.jsonCache.welcomeSuper = [];
            }
            
            const chatWelcomePath = path.join(welcomeBasePath, 'chat.json');
            if (fs.existsSync(chatWelcomePath)) {
                this.jsonCache.welcomeChat = JSON.parse(fs.readFileSync(chatWelcomePath, 'utf8'));
                console.log(`✅ Loaded chat welcome messages`);
            } else {
                console.log('❌ chat.json not found');
                this.jsonCache.welcomeChat = [];
            }
            
            const botWelcomePath = path.join(welcomeBasePath, 'bot.json');
            if (fs.existsSync(botWelcomePath)) {
                this.jsonCache.welcomeBot = JSON.parse(fs.readFileSync(botWelcomePath, 'utf8'));
                console.log(`✅ Loaded bot welcome messages`);
            } else {
                console.log('❌ bot.json not found');
                this.jsonCache.welcomeBot = [];
            }
            
            // 5. Load bad words
            const badWordsPath = path.join(__dirname, '..', 'data', 'filter', 'bad.json');
            if (fs.existsSync(badWordsPath)) {
                this.jsonCache.badWords = JSON.parse(fs.readFileSync(badWordsPath, 'utf8'));
                console.log(`✅ Loaded bad words: ${this.jsonCache.badWords.length} words`);
            } else {
                console.log('❌ bad.json not found');
                this.jsonCache.badWords = [];
            }
            
            // 6. Load stickers
            const stickerPath = path.join(__dirname, '..', 'data', 'sticker', 'sticker.json');
            if (fs.existsSync(stickerPath)) {
                this.jsonCache.stickers = JSON.parse(fs.readFileSync(stickerPath, 'utf8'));
                console.log(`✅ Loaded stickers: ${this.jsonCache.stickers.length} stickers`);
            } else {
                console.log('❌ sticker.json not found');
                this.jsonCache.stickers = [];
            }
            
            this.jsonCache.lastLoaded = new Date();
            console.log('✅ All JSON data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading JSON data:', error.message);
        }
    }
    
    loadHandlers() {
        console.log('📦 Loading handlers...');
        
        // Message handler
        this.bot.on('message', async (msg) => {
            this.stats.messages++;
            await this.handleMessage(msg);
        });
        
        // Edited message handler
        this.bot.on('edited_message', async (msg) => {
            await this.handleEditedMessage(msg);
        });
        
        // Callback query handler
        this.bot.on('callback_query', async (callbackQuery) => {
            await this.handleCallbackQuery(callbackQuery);
        });
        
        // Inline query handler
        this.bot.on('inline_query', async (inlineQuery) => {
            await this.handleInlineQuery(inlineQuery);
        });
        
        // Poll answer handler
        this.bot.on('poll_answer', async (pollAnswer) => {
            await this.handlePollAnswer(pollAnswer);
        });
        
        // Chat member updates
        this.bot.on('chat_member', async (update) => {
            await this.handleChatMemberUpdate(update);
        });
        
        // My chat member updates (bot added/removed)
        this.bot.on('my_chat_member', async (update) => {
            await this.handleMyChatMemberUpdate(update);
        });
        
        console.log('✅ Handlers loaded');
    }
    
    setupEventListeners() {
        // Bot errors
        this.bot.on('error', (error) => {
            console.error('🤖 Bot error:', error);
            this.stats.errors++;
        });
        
        // Polling errors
        this.bot.on('polling_error', (error) => {
            console.error('🔄 Polling error:', error);
            this.stats.errors++;
        });
        
        // Webhook errors
        this.bot.on('webhook_error', (error) => {
            console.error('🌐 Webhook error:', error);
            this.stats.errors++;
        });
    }
    
    async handleMessage(msg) {
        try {
            // Skip if message is from bot
            if (msg.from?.is_bot) return;
            
            // Check if user is blocked
            if (this.isUserBlocked(msg.from.id)) {
                return;
            }
            
            // Check rate limiting
            if (await this.isRateLimited(msg.from.id, msg.chat.id)) {
                return;
            }
            
            // Check for commands
            if (msg.text && msg.text.startsWith('/')) {
                await this.handleCommand(msg);
                return;
            }
            
            // Handle new chat members
            if (msg.new_chat_members && msg.new_chat_members.length > 0) {
                await this.handleNewChatMembers(msg);
                return;
            }
            
            // Handle left chat member
            if (msg.left_chat_member) {
                await this.handleLeftChatMember(msg);
                return;
            }
            
            // Handle regular messages
            if (msg.text || msg.caption) {
                await this.handleRegularMessage(msg);
            }
            
            // Handle sticker messages
            if (msg.sticker) {
                await this.handleSticker(msg);
            }
            
            // Handle other message types
            if (msg.photo) await this.handleMedia(msg, 'photo');
            if (msg.video) await this.handleMedia(msg, 'video');
            if (msg.document) await this.handleMedia(msg, 'document');
            if (msg.voice) await this.handleMedia(msg, 'voice');
            if (msg.animation) await this.handleMedia(msg, 'animation');
            if (msg.poll) await this.handleMedia(msg, 'poll');
            
        } catch (error) {
            console.error('Error handling message:', error);
            this.stats.errors++;
        }
    }
    
    async handleRegularMessage(msg) {
        // 1. First check for auto-reply from reply.json
        await this.handleAutoReply(msg);
        
        // 2. Then check for moderation
        if (msg.chat.type !== 'private' && this.config.features.moderation) {
            await this.handleModeration(msg);
        }
    }
    
    async handleAutoReply(msg) {
        try {
            const replies = this.jsonCache.replies;
            if (!replies || Object.keys(replies).length === 0) {
                return; // কোনো রিপ্লাই নেই, ফিরে যাও
            }
            
            const message = (msg.text || msg.caption || '').toLowerCase().trim();
            
            // খালি মেসেজ স্কিপ করো
            if (!message || message.length < 2) return;
            
            // প্রতিটি প্যাটার্ন চেক করো
            for (const [pattern, replyArray] of Object.entries(replies)) {
                const patterns = pattern.toLowerCase().split('|').map(p => p.trim());
                
                for (const p of patterns) {
                    if (message === p || message.includes(p)) {
                        // Send typing action
                        await this.bot.sendChatAction(msg.chat.id, 'typing');
                        
                        // Random delay
                        const delayTime = Math.floor(Math.random() * 1500) + 500;
                        await new Promise(resolve => setTimeout(resolve, delayTime));
                        
                        // Random reply select
                        const replyOptions = Array.isArray(replyArray) ? replyArray : [replyArray];
                        const randomReply = replyOptions[Math.floor(Math.random() * replyOptions.length)];
                        
                        // Format reply with placeholders
                        let formattedReply = randomReply;
                        if (randomReply.includes('{time}') || randomReply.includes('{date}') || 
                            randomReply.includes('{name}') || randomReply.includes('{username}')) {
                            
                            const now = new Date();
                            const userName = this.escapeHtml(msg.from.first_name);
                            const userUsername = msg.from.username ? `@${msg.from.username}` : userName;
                            
                            formattedReply = formattedReply
                                .replace(/{time}/g, this.escapeHtml(now.toLocaleTimeString()))
                                .replace(/{date}/g, this.escapeHtml(now.toLocaleDateString()))
                                .replace(/{name}/g, userName)
                                .replace(/{username}/g, userUsername);
                        }
                        
                        // Send reply
                        await this.bot.sendMessage(msg.chat.id, formattedReply, {
                            parse_mode: 'HTML',
                            reply_to_message_id: msg.message_id,
                            disable_web_page_preview: true
                        });
                        
                        // Add reaction if available
                        await this.addReaction(msg);
                        
                        return; // প্রথম ম্যাচেই থেমে যাও
                    }
                }
            }
            
            // কোনো ম্যাচ না পাওয়া গেলে কিছুই করো না
            return;
            
        } catch (error) {
            console.error('Error in auto-reply:', error);
            // কোনো ফ্যালব্যাক নেই, শুধু error লগ করো
        }
    }
    
    async addReaction(msg) {
        try {
            // react.json থেকে রিএকশন নাও
            const reactions = this.jsonCache.reactions;
            if (!reactions || Object.keys(reactions).length === 0) {
                return;
            }
            
            // Check if there's a reaction for this message type
            const messageText = (msg.text || msg.caption || '').toLowerCase();
            
            for (const [pattern, emojiArray] of Object.entries(reactions)) {
                const patterns = pattern.toLowerCase().split('|').map(p => p.trim());
                
                for (const p of patterns) {
                    if (messageText.includes(p)) {
                        const emojis = Array.isArray(emojiArray) ? emojiArray : [emojiArray];
                        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                        
                        // Try to set reaction
                        await this.bot.setMessageReaction(msg.chat.id, msg.message_id, [
                            { type: 'emoji', emoji: randomEmoji }
                        ]);
                        return;
                    }
                }
            }
            
        } catch (error) {
            // Reaction ফিচার সব জায়গায় সাপোর্ট করে না, তাই error ignore করো
        }
    }
    
    async handleModeration(msg) {
        try {
            const badWords = this.jsonCache.badWords;
            if (!badWords || badWords.length === 0) return;
            
            const message = (msg.text || msg.caption || '').toLowerCase();
            
            for (const word of badWords) {
                if (message.includes(word.toLowerCase())) {
                    // Delete the message
                    await this.bot.deleteMessage(msg.chat.id, msg.message_id);
                    
                    // Warn message from reply.json
                    const warningReplies = this.jsonCache.replies?.warning || 
                                          this.jsonCache.replies?.['bad word|warning'] || 
                                          [`⚠️ Warning! Please avoid inappropriate language.`];
                    
                    const warning = Array.isArray(warningReplies) ? 
                                   warningReplies[Math.floor(Math.random() * warningReplies.length)] :
                                   warningReplies;
                    
                    await this.bot.sendMessage(msg.chat.id, warning, {
                        parse_mode: 'HTML',
                        reply_to_message_id: msg.message_id
                    });
                    return;
                }
            }
            
        } catch (error) {
            console.error('Error in moderation:', error);
        }
    }
    
    async handleNewChatMembers(msg) {
        if (!this.config.features.welcome_system) return;
        
        for (const member of msg.new_chat_members) {
            // Check if the new member is the bot itself
            if (member.id === this.bot.id) {
                await this.handleBotAdded(msg.chat);
                continue;
            }
            
            // Send welcome message for regular users
            await this.sendWelcomeMessage(msg.chat, member);
        }
    }
    
    async sendWelcomeMessage(chat, user) {
        try {
            let welcomeMessages;
            
            // Select appropriate welcome message based on chat type
            if (chat.type === 'private') {
                welcomeMessages = this.jsonCache.welcomeChat || [];
            } else if (chat.type === 'group') {
                welcomeMessages = this.jsonCache.welcomeGroup || [];
            } else if (chat.type === 'supergroup') {
                welcomeMessages = this.jsonCache.welcomeSuper || [];
            }
            
            // If user is bot
            if (user.is_bot) {
                welcomeMessages = this.jsonCache.welcomeBot || [];
            }
            
            // If no welcome messages found, return
            if (!welcomeMessages || welcomeMessages.length === 0) {
                return;
            }
            
            // Select random welcome message
            const welcomeText = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
            
            // Replace placeholders
            let message = welcomeText
                .replace(/{name}/g, this.escapeHtml(user.first_name))
                .replace(/{username}/g, user.username ? `@${user.username}` : this.escapeHtml(user.first_name))
                .replace(/{group}/g, this.escapeHtml(chat.title || 'the group'))
                .replace(/{id}/g, user.id);
            
            // Send welcome message
            await this.bot.sendMessage(chat.id, message, {
                parse_mode: 'HTML'
            });
            
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    }
    
    async handleSticker(msg) {
        try {
            const stickers = this.jsonCache.stickers;
            if (!stickers || stickers.length === 0) return;
            
            // Check if sticker has emoji or file_id
            const stickerEmoji = msg.sticker.emoji;
            const stickerId = msg.sticker.file_id;
            
            // Find matching sticker response
            for (const stickerData of stickers) {
                if (stickerData.emoji === stickerEmoji || stickerData.file_id === stickerId) {
                    if (stickerData.response) {
                        await this.bot.sendMessage(msg.chat.id, stickerData.response, {
                            parse_mode: 'HTML',
                            reply_to_message_id: msg.message_id
                        });
                    }
                    return;
                }
            }
            
        } catch (error) {
            console.error('Error handling sticker:', error);
        }
    }
    
    async handleMedia(msg, type) {
        // Check if there are responses for this media type in reply.json
        const replies = this.jsonCache.replies;
        if (!replies) return;
        
        const mediaResponses = replies[type] || replies[`${type}|media`];
        if (mediaResponses) {
            const response = Array.isArray(mediaResponses) ? 
                           mediaResponses[Math.floor(Math.random() * mediaResponses.length)] :
                           mediaResponses;
            
            await this.bot.sendMessage(msg.chat.id, response, {
                parse_mode: 'HTML',
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleCommand(msg) {
        this.stats.commands++;
        
        const command = msg.text.split(' ')[0].toLowerCase();
        const args = msg.text.split(' ').slice(1);
        
        console.log(`📝 Command: ${command} from ${msg.from.first_name} (${msg.chat.type})`);
        
        // Basic commands
        switch (command) {
            case '/start':
                await this.sendStartMessage(msg);
                break;
                
            case '/help':
                await this.sendHelpMessage(msg);
                break;
                
            case '/about':
                await this.sendAboutMessage(msg);
                break;
                
            case '/stats':
                await this.sendStatsMessage(msg);
                break;
                
            case '/ping':
                await this.sendPingMessage(msg);
                break;
                
            case '/id':
                await this.sendIdMessage(msg);
                break;
                
            case '/rules':
                await this.sendRulesMessage(msg);
                break;
                
            case '/reload':
                if (this.isDeveloper(msg.from.id) || this.isOwner(msg.from.id)) {
                    this.loadAllJsonData();
                    await this.bot.sendMessage(msg.chat.id, "✅ All JSON data reloaded successfully!", {
                        parse_mode: 'HTML'
                    });
                }
                break;
                
            default:
                await this.handleUnknownCommand(msg, command);
        }
    }
    
    async sendStartMessage(msg) {
        // Get start message from reply.json
        const replies = this.jsonCache.replies;
        let message;
        
        if (replies && replies.start) {
            const startReplies = replies.start;
            message = Array.isArray(startReplies) ? 
                     startReplies[Math.floor(Math.random() * startReplies.length)] :
                     startReplies;
        } else {
            // Default if not found in JSON
            message = `<b>🎉 Welcome to Group Master Pro Bot 👑</b>\n\n` +
                     `I'm your advanced group management assistant.\n\n` +
                     `Use /help to see available commands.`;
        }
        
        // Replace placeholders
        message = message
            .replace(/{name}/g, this.escapeHtml(msg.from.first_name))
            .replace(/{username}/g, msg.from.username ? `@${msg.from.username}` : this.escapeHtml(msg.from.first_name));
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'HTML'
        });
    }
    
    async sendHelpMessage(msg) {
        // Get help message from reply.json
        const replies = this.jsonCache.replies;
        let message;
        
        if (replies && replies.help) {
            const helpReplies = replies.help;
            message = Array.isArray(helpReplies) ? 
                     helpReplies[Math.floor(Math.random() * helpReplies.length)] :
                     helpReplies;
        } else {
            // Default if not found in JSON
            message = `<b>📚 Available Commands:</b>\n\n` +
                     `<code>/start</code> - Start bot\n` +
                     `<code>/help</code> - Show this message\n` +
                     `<code>/about</code> - About bot\n` +
                     `<code>/stats</code> - Bot statistics\n` +
                     `<code>/ping</code> - Check bot status\n` +
                     `<code>/id</code> - Get ID\n` +
                     `<code>/rules</code> - Group rules\n` +
                     `<code>/reload</code> - Reload data (admin only)`;
        }
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'HTML'
        });
    }
    
    async sendAboutMessage(msg) {
        // Get about message from reply.json
        const replies = this.jsonCache.replies;
        let message;
        
        if (replies && replies.about) {
            const aboutReplies = replies.about;
            message = Array.isArray(aboutReplies) ? 
                     aboutReplies[Math.floor(Math.random() * aboutReplies.length)] :
                     aboutReplies;
        } else {
            // Default if not found in JSON
            message = `<b>🤖 About Group Master Pro Bot</b>\n\n` +
                     `<b>Version:</b> ${this.config.bot.version}\n` +
                     `<b>Developer:</b> MAR-PD\n` +
                     `<b>Contact:</b> @master_spamming`;
        }
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'HTML'
        });
    }
    
    async sendPingMessage(msg) {
        const start = Date.now();
        const pingMsg = await this.bot.sendMessage(msg.chat.id, '🏓 Pinging...');
        const end = Date.now();
        
        const pingTime = end - start;
        const serverTime = new Date().toLocaleTimeString();
        
        await this.bot.editMessageText(
            `<b>🏓 Pong!</b>\n\n` +
            `<b>Bot Latency:</b> ${pingTime}ms\n` +
            `<b>Server Time:</b> ${serverTime}\n` +
            `<b>Uptime:</b> ${this.getUptime()}`,
            {
                chat_id: msg.chat.id,
                message_id: pingMsg.message_id,
                parse_mode: 'HTML'
            }
        );
    }
    
    async sendIdMessage(msg) {
        let message = `<b>🆔 ID Information</b>\n\n`;
        
        if (msg.chat.type === 'private') {
            message += `<b>Your ID:</b> <code>${msg.from.id}</code>\n`;
            message += `<b>Name:</b> ${this.escapeHtml(msg.from.first_name)}\n`;
            if (msg.from.username) message += `<b>Username:</b> @${msg.from.username}\n`;
        } else {
            message += `<b>Chat ID:</b> <code>${msg.chat.id}</code>\n`;
            message += `<b>Chat Title:</b> ${this.escapeHtml(msg.chat.title)}\n\n`;
            message += `<b>Your ID:</b> <code>${msg.from.id}</code>\n`;
            message += `<b>Your Name:</b> ${this.escapeHtml(msg.from.first_name)}`;
        }
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'HTML'
        });
    }
    
    async sendRulesMessage(msg) {
        // Get rules from reply.json
        const replies = this.jsonCache.replies;
        let message;
        
        if (replies && replies.rules) {
            const rulesReplies = replies.rules;
            message = Array.isArray(rulesReplies) ? 
                     rulesReplies[Math.floor(Math.random() * rulesReplies.length)] :
                     rulesReplies;
        } else {
            message = `<b>📜 Group Rules</b>\n\n` +
                     `1. Be respectful to everyone\n` +
                     `2. No spam or self-promotion\n` +
                     `3. Follow admin instructions`;
        }
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'HTML'
        });
    }
    
    async sendStatsMessage(msg) {
        const uptime = new Date() - this.stats.startTime;
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        
        let message = `<b>📊 Bot Statistics</b>\n\n`;
        message += `<b>Uptime:</b> ${hours}h ${minutes}m\n`;
        message += `<b>Messages Processed:</b> ${this.stats.messages}\n`;
        message += `<b>Commands Executed:</b> ${this.stats.commands}\n`;
        message += `<b>Errors:</b> ${this.stats.errors}\n`;
        message += `<b>Version:</b> ${this.config.bot.version}\n\n`;
        
        if (await this.isDeveloper(msg.from.id)) {
            message += `<b>Last Data Load:</b> ${this.jsonCache.lastLoaded?.toLocaleTimeString() || 'Never'}\n`;
            message += `<b>Reply Patterns:</b> ${Object.keys(this.jsonCache.replies || {}).length}\n`;
            message += `<b>Bad Words:</b> ${(this.jsonCache.badWords || []).length}`;
        }
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'HTML'
        });
    }
    
    async handleUnknownCommand(msg, command) {
        // Get unknown command response from reply.json
        const replies = this.jsonCache.replies;
        let response;
        
        if (replies && replies.unknown) {
            const unknownReplies = replies.unknown;
            response = Array.isArray(unknownReplies) ? 
                      unknownReplies[Math.floor(Math.random() * unknownReplies.length)] :
                      unknownReplies;
            
            // Replace placeholders
            response = response.replace(/{command}/g, command);
        } else {
            response = `<b>❌ Unknown Command:</b> <code>${command}</code>\n\n` +
                      `<b>✅ Use</b> <code>/help</code> <b>for available commands</b>`;
        }
        
        await this.bot.sendMessage(msg.chat.id, response, {
            parse_mode: 'HTML',
            reply_to_message_id: msg.message_id
        });
    }
    
    async handleBotAdded(chat) {
        // Get bot added message from welcomeBot
        const welcomeBot = this.jsonCache.welcomeBot;
        if (welcomeBot && welcomeBot.length > 0) {
            const message = welcomeBot[Math.floor(Math.random() * welcomeBot.length)]
                .replace(/{group}/g, this.escapeHtml(chat.title));
            
            await this.bot.sendMessage(chat.id, message, {
                parse_mode: 'HTML'
            });
        }
    }
    
    async handleLeftChatMember(msg) {
        if (msg.left_chat_member.id === this.bot.id) {
            console.log(`Bot removed from ${msg.chat.title}`);
        }
    }
    
    async handleCallbackQuery(callbackQuery) {
        const { data, from } = callbackQuery;
        
        console.log(`Callback query: ${data} from ${from.first_name}`);
        
        await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: `Selected: ${data}`,
            show_alert: false
        });
    }
    
    async handleInlineQuery(inlineQuery) {
        const results = [];
        await this.bot.answerInlineQuery(inlineQuery.id, results, {
            cache_time: 1
        });
    }
    
    async handlePollAnswer(pollAnswer) {
        console.log(`User ${pollAnswer.user.first_name} answered poll`);
    }
    
    async handleChatMemberUpdate(update) {
        console.log(`Chat member update in ${update.chat.title}`);
    }
    
    async handleMyChatMemberUpdate(update) {
        const { new_chat_member, chat } = update;
        
        if (new_chat_member.status === 'administrator') {
            console.log(`✅ Bot added as admin in ${chat.title}`);
        } else if (new_chat_member.status === 'left' || new_chat_member.status === 'kicked') {
            console.log(`❌ Bot removed from ${chat.title}`);
        }
    }
    
    async handleEditedMessage(msg) {
        console.log(`Message edited by ${msg.from.first_name}`);
    }
    
    // Utility methods
    getUptime() {
        const uptime = new Date() - this.stats.startTime;
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return text.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    isUserBlocked(userId) {
        return this.config.security?.blocked_users?.includes(userId) || false;
    }
    
    async isRateLimited(userId, chatId) {
        return false;
    }
    
    isDeveloper(userId) {
        return this.config.developers?.includes(userId) || false;
    }
    
    isOwner(userId) {
        return this.config.owners?.includes(userId) || false;
    }
    
    async start() {
        console.log('🚀 Starting bot...');
        if (!process.env.RENDER && !this.config.webhook?.enabled) {
            await this.bot.startPolling();
        }
        console.log('✅ Bot is now running!');
    }
    
    async stop() {
        console.log('🛑 Stopping bot...');
        if (!process.env.RENDER) {
            await this.bot.stopPolling();
        }
        console.log('✅ Bot stopped.');
    }
}

// Create and export bot instance
export const bot = new GroupMasterBot();
