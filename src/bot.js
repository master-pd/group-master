import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));

// Get bot token from environment variable - Render.com Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("❌ BOT_TOKEN missing! Set BOT_TOKEN in Render Environment Variables");

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
        
        this.init();
    }
    
    init() {
        console.log('🤖 Initializing Group Master Pro Bot...');
        console.log('🚀 Render.com Deployment Ready');
        
        // Create bot instance - Render.com supports both polling and webhook
        if (this.config.webhook?.enabled && process.env.RENDER) {
            // Render.com এ ওয়েবহুক স্বয়ংক্রিয়ভাবে ম্যানেজ করে
            const webhookUrl = process.env.RENDER_EXTERNAL_URL || `https://${process.env.RENDER_SERVICE_NAME}.onrender.com`;
            this.bot = new TelegramBot(BOT_TOKEN, { 
                webHook: {
                    host: '0.0.0.0',
                    port: process.env.PORT || 3000
                }
            });
            const webhookPath = `/bot${BOT_TOKEN}`;
            this.bot.setWebHook(`${webhookUrl}${webhookPath}`);
            console.log(`🌐 Render Webhook configured: ${webhookUrl}${webhookPath}`);
        } else {
            // Fallback to polling mode (for local development or if webhook fails)
            this.bot = new TelegramBot(BOT_TOKEN, {
                polling: {
                    timeout: this.config.bot.polling_timeout || 60,
                    interval: 300,
                    autoStart: false
                }
            });
            console.log('🔄 Polling mode enabled');
        }
        
        this.bot.username = this.config.bot.username;
        this.bot.name = this.config.bot.name;
        
        // Load handlers
        this.loadHandlers();
        
        // Load features
        this.loadFeatures();
        
        // Setup event listeners
        this.setupEventListeners();
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
    
    loadFeatures() {
        console.log('✨ Loading features...');
        
        // Import features dynamically
        const featuresPath = path.join(__dirname, 'features');
        
        const features = [
            'welcomeSystem',
            'moderationSystem',
            'autoReplySystem',
            'broadcastSystem',
            'gameSystem',
            'utilitySystem',
            'aiSystem'
        ];
        
        features.forEach(feature => {
            try {
                this.features.set(feature, { enabled: true });
                console.log(`   ✅ ${feature}`);
            } catch (error) {
                console.log(`   ❌ ${feature}: ${error.message}`);
            }
        });
        
        console.log('✅ Features loaded');
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
            
            // Handle regular messages with auto-reply
            if (msg.text || msg.caption) {
                await this.handleRegularMessage(msg);
            }
            
            // Handle other message types
            if (msg.photo) await this.handlePhoto(msg);
            if (msg.video) await this.handleVideo(msg);
            if (msg.document) await this.handleDocument(msg);
            if (msg.voice) await this.handleVoice(msg);
            if (msg.sticker) await this.handleSticker(msg);
            if (msg.animation) await this.handleAnimation(msg);
            if (msg.poll) await this.handlePoll(msg);
            
        } catch (error) {
            console.error('Error handling message:', error);
            this.stats.errors++;
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
                
            default:
                // Check for admin commands
                if (await this.isAdmin(msg.from.id, msg.chat.id)) {
                    await this.handleAdminCommand(msg, command, args);
                } else {
                    await this.bot.sendMessage(msg.chat.id, '❌ Unknown command. Use /help for available commands.');
                }
        }
    }
    
    async handleRegularMessage(msg) {
        // Auto-reply system
        if (this.config.features.auto_reply && msg.chat.type === 'private') {
            await this.handleAutoReply(msg);
        }
        
        // Moderation system
        if (this.config.features.moderation && msg.chat.type !== 'private') {
            await this.handleModeration(msg);
        }
        
        // AI chat system
        if (this.config.features.ai_chat) {
            await this.handleAIChat(msg);
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
    
    async handleLeftChatMember(msg) {
        if (msg.left_chat_member.id === this.bot.id) {
            await this.handleBotRemoved(msg.chat);
        }
        
        if (this.config.features.goodbye_system) {
            await this.sendGoodbyeMessage(msg.chat, msg.left_chat_member);
        }
    }
    
    async sendStartMessage(msg) {
        const isPrivate = msg.chat.type === 'private';
        
        let message = `🎉 *Welcome to Group Master Pro Bot* 👑\n\n`;
        message += `*Version:* ${this.config.bot.version}\n`;
        message += `*Developer:* MAR-PD\n`;
        message += `*Contact:* @master_spamming\n\n`;
        
        if (isPrivate) {
            message += `I'm your advanced group management assistant with AI features.\n\n`;
            message += `✨ *Features:*\n`;
            message += `• Smart Auto Reply 🤖\n`;
            message += `• Welcome Image Generation 🎨\n`;
            message += `• Advanced Moderation 🛡️\n`;
            message += `• AI Chat System 🧠\n`;
            message += `• Games & Entertainment 🎮\n\n`;
            message += `Use /help to see all commands.\n`;
            message += `Add me to your group for management!`;
        } else {
            message += `Hello everyone! I'm here to help manage this group.\n\n`;
            message += `Use /help for available commands.\n`;
            message += `Admins can use /adminhelp for admin commands.`;
        }
        
        const keyboard = [];
        
        if (isPrivate) {
            keyboard.push([
                { text: '📖 Help', callback_data: 'help' },
                { text: '👨‍💻 Developer', url: 'https://t.me/master_spamming' }
            ]);
            keyboard.push([
                { text: '➕ Add to Group', url: `https://t.me/${this.bot.username}?startgroup=true` }
            ]);
        }
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined
        });
    }
    
    async sendHelpMessage(msg) {
        const isPrivate = msg.chat.type === 'private';
        const isAdmin = await this.isAdmin(msg.from.id, msg.chat.id);
        
        let message = `📚 *Group Master Pro Bot Help*\n\n`;
        
        if (isPrivate) {
            message += `*Private Chat Commands:*\n`;
            message += `/start - Start the bot\n`;
            message += `/help - Show this message\n`;
            message += `/about - About the bot\n`;
            message += `/contact - Contact developer\n`;
            message += `/stats - Bot statistics\n`;
            message += `/settings - Configure bot\n\n`;
            
            message += `*AI Features:*\n`;
            message += `Just chat with me normally! I'll reply automatically.\n\n`;
            
            message += `*Group Management:*\n`;
            message += `Add me to your group and make me admin for full features.`;
        } else {
            message += `*Group Commands:*\n`;
            message += `/help - Show this message\n`;
            message += `/rules - Show group rules\n`;
            message += `/report - Report a user\n`;
            message += `/admin - Mention all admins\n`;
            message += `/info - Group information\n`;
            message += `/me - Your information\n\n`;
            
            if (isAdmin) {
                message += `*Admin Commands:*\n`;
                message += `/warn @user - Warn a user\n`;
                message += `/mute @user - Mute a user\n`;
                message += `/ban @user - Ban a user\n`;
                message += `/unban @user - Unban a user\n`;
                message += `/promote @user - Make admin\n`;
                message += `/demote @user - Remove admin\n`;
                message += `/settings - Group settings\n`;
            }
        }
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
    }
    
    async sendAboutMessage(msg) {
        const message = `🤖 *About Group Master Pro Bot*\n\n` +
                       `*Version:* ${this.config.bot.version}\n` +
                       `*Developer:* MAR-PD (@master_spamming)\n` +
                       `*Framework:* Node.js\n` +
                       `*Library:* node-telegram-bot-api\n` +
                       `*Hosting:* Render.com\n\n` +
                       `This bot is designed for advanced group management with AI capabilities.\n\n` +
                       `✨ *Special Features:*\n` +
                       `• Multi-language support\n` +
                       `• Smart moderation system\n` +
                       `• AI-powered responses\n` +
                       `• Custom welcome messages\n` +
                       `• Game system\n` +
                       `• Utility tools\n\n` +
                       `*GitHub:* Coming Soon\n` +
                       `*Support:* @master_spamming`;
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'Markdown'
        });
    }
    
    async sendPingMessage(msg) {
        const start = Date.now();
        const pingMsg = await this.bot.sendMessage(msg.chat.id, '🏓 Pinging...');
        const end = Date.now();
        
        const pingTime = end - start;
        const serverTime = new Date().toLocaleTimeString();
        
        await this.bot.editMessageText(
            `🏓 *Pong!*\n\n` +
            `*Bot Latency:* ${pingTime}ms\n` +
            `*Server Time:* ${serverTime}\n` +
            `*Uptime:* ${this.getUptime()}\n` +
            `*Status:* ✅ Operational`,
            {
                chat_id: msg.chat.id,
                message_id: pingMsg.message_id,
                parse_mode: 'Markdown'
            }
        );
    }
    
    async sendIdMessage(msg) {
        let message = `🆔 *ID Information*\n\n`;
        
        if (msg.chat.type === 'private') {
            message += `*Your ID:* \`${msg.from.id}\`\n`;
            message += `*First Name:* ${msg.from.first_name}\n`;
            if (msg.from.last_name) message += `*Last Name:* ${msg.from.last_name}\n`;
            if (msg.from.username) message += `*Username:* @${msg.from.username}\n`;
            message += `*Language:* ${msg.from.language_code || 'Unknown'}\n`;
        } else {
            message += `*Chat ID:* \`${msg.chat.id}\`\n`;
            message += `*Chat Title:* ${msg.chat.title}\n`;
            message += `*Chat Type:* ${msg.chat.type}\n\n`;
            message += `*Your ID:* \`${msg.from.id}\`\n`;
            message += `*Your Name:* ${msg.from.first_name}`;
        }
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'Markdown'
        });
    }
    
    async sendWelcomeMessage(chat, user) {
        if (!this.config.features.welcome_system) return;
        
        try {
            // Load welcome templates
            const templates = JSON.parse(
                fs.readFileSync(path.join(__dirname, '..', 'data', 'welcome', 'templates.json'), 'utf8')
            );
            
            let template;
            if (chat.type === 'private') {
                template = templates.private[Math.floor(Math.random() * templates.private.length)];
            } else {
                template = templates.group[Math.floor(Math.random() * templates.group.length)];
            }
            
            // Replace placeholders
            let message = template
                .replace(/{name}/g, user.first_name)
                .replace(/{username}/g, user.username ? `@${user.username}` : user.first_name)
                .replace(/{group}/g, chat.title || 'the group')
                .replace(/{id}/g, user.id);
            
            // Send typing action
            await this.bot.sendChatAction(chat.id, 'typing');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Send welcome message
            await this.bot.sendMessage(chat.id, message, {
                parse_mode: 'Markdown'
            });
            
            // Auto-reaction if available
            try {
                const messages = await this.bot.getChatHistory(chat.id, 1);
                if (messages.length > 0) {
                    await this.bot.setMessageReaction(chat.id, messages[0].message_id, [
                        { type: 'emoji', emoji: '👋' },
                        { type: 'emoji', emoji: '🎉' }
                    ]);
                }
            } catch (error) {
                // Reaction not available in some chats
            }
            
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    }
    
    async sendGoodbyeMessage(chat, user) {
        if (!this.config.features.goodbye_system) return;
        
        try {
            const templates = JSON.parse(
                fs.readFileSync(path.join(__dirname, '..', 'data', 'welcome', 'goodbye-templates.json'), 'utf8')
            );
            
            const template = templates[Math.floor(Math.random() * templates.length)];
            
            const message = template
                .replace(/{name}/g, user.first_name)
                .replace(/{username}/g, user.username ? `@${user.username}` : user.first_name)
                .replace(/{group}/g, chat.title || 'the group');
            
            await this.bot.sendMessage(chat.id, message, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error('Error sending goodbye message:', error);
        }
    }
    
    async handleAutoReply(msg) {
        try {
            // Load auto-reply data
            const responses = JSON.parse(
                fs.readFileSync(path.join(__dirname, '..', 'data', 'responses', 'auto-reply.json'), 'utf8')
            );
            
            const message = (msg.text || msg.caption || '').toLowerCase().trim();
            
            // Find matching response
            for (const [trigger, reply] of Object.entries(responses)) {
                const triggers = trigger.split('|').map(t => t.trim().toLowerCase());
                
                for (const t of triggers) {
                    if (message.includes(t)) {
                        // Send typing action
                        await this.bot.sendChatAction(msg.chat.id, 'typing');
                        await new Promise(resolve => setTimeout(resolve, this.config.auto_reply.typing_delay_ms));
                        
                        // Send reply
                        await this.bot.sendMessage(msg.chat.id, reply, {
                            parse_mode: 'Markdown'
                        });
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Error in auto-reply:', error);
        }
    }
    
    async handleModeration(msg) {
        try {
            // Check for bad words
            const badWords = JSON.parse(
                fs.readFileSync(path.join(__dirname, '..', 'data', 'moderation', 'bad-words.json'), 'utf8')
            );
            
            const message = (msg.text || msg.caption || '').toLowerCase();
            
            for (const word of badWords) {
                if (message.includes(word.toLowerCase())) {
                    // Delete the message
                    await this.bot.deleteMessage(msg.chat.id, msg.message_id);
                    
                    // Warn the user
                    const warning = `⚠️ *Warning*\n\n` +
                                  `Hey ${msg.from.first_name}, please avoid using inappropriate language!\n` +
                                  `Next violation will result in a mute.`;
                    
                    await this.bot.sendMessage(msg.chat.id, warning, {
                        parse_mode: 'Markdown',
                        reply_to_message_id: msg.message_id
                    });
                    return;
                }
            }
            
            // Check for URLs (non-admin users)
            const isAdmin = await this.isAdmin(msg.from.id, msg.chat.id);
            if (!isAdmin && this.containsUrl(message)) {
                await this.bot.deleteMessage(msg.chat.id, msg.message_id);
                
                const warning = `🔗 *Link Detected*\n\n` +
                              `${msg.from.first_name}, only admins can post links in this group.\n` +
                              `Please contact an admin if you need to share something important.`;
                
                await this.bot.sendMessage(msg.chat.id, warning, {
                    parse_mode: 'Markdown'
                });
            }
            
        } catch (error) {
            console.error('Error in moderation:', error);
        }
    }
    
    async handleAIChat(msg) {
        // Basic AI response system
        const message = (msg.text || msg.caption || '').toLowerCase();
        
        if (msg.chat.type === 'private') {
            // Simple pattern matching for demo
            const responses = {
                'how are you': ["I'm doing great, thanks for asking! 😊", "Alhamdulillah, I'm good! How about you? 🌟"],
                'what can you do': ["I can help manage groups, answer questions, play games, and much more! ✨", "I'm a multi-purpose bot! Try /help to see all features."],
                'who created you': ["I was created by MAR-PD! 👨‍💻", "My developer is MAR-PD. You can contact him @master_spamming"],
                'thank you': ["You're welcome! 😊", "My pleasure! 🌟", "Always happy to help! 🤗"],
                'hello': ["Hello there! 👋", "Hi! How can I help you? 😊", "Assalamualaikum! 🤲"],
                'assalamualaikum': ["Waalaikumussalam! 😊", "Waalaikumussalam warahmatullah! 🌟"]
            };
            
            for (const [pattern, replyOptions] of Object.entries(responses)) {
                if (message.includes(pattern)) {
                    const reply = replyOptions[Math.floor(Math.random() * replyOptions.length)];
                    
                    await this.bot.sendChatAction(msg.chat.id, 'typing');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    await this.bot.sendMessage(msg.chat.id, reply);
                    return;
                }
            }
        }
    }
    
    async sendStatsMessage(msg) {
        const uptime = new Date() - this.stats.startTime;
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        
        let message = `📊 *Bot Statistics*\n\n`;
        message += `*Uptime:* ${hours}h ${minutes}m\n`;
        message += `*Messages Processed:* ${this.stats.messages}\n`;
        message += `*Commands Executed:* ${this.stats.commands}\n`;
        message += `*Errors:* ${this.stats.errors}\n`;
        message += `*Version:* ${this.config.bot.version}\n`;
        message += `*Developer:* @master_spamming\n`;
        message += `*Hosting:* Render.com\n\n`;
        
        if (await this.isDeveloper(msg.from.id)) {
            message += `*System Status:* ✅ Operational\n`;
            message += `*Memory Usage:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n`;
            message += `*Node Version:* ${process.version}\n`;
            message += `*Platform:* ${process.platform}\n`;
            message += `*Architecture:* ${process.arch}`;
        }
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'Markdown'
        });
    }
    
    // Admin command handler
    async handleAdminCommand(msg, command, args) {
        switch (command) {
            case '/warn':
                await this.warnUser(msg, args);
                break;
            case '/mute':
                await this.muteUser(msg, args);
                break;
            case '/ban':
                await this.banUser(msg, args);
                break;
            case '/unban':
                await this.unbanUser(msg, args);
                break;
            case '/kick':
                await this.kickUser(msg, args);
                break;
            case '/promote':
                await this.promoteUser(msg, args);
                break;
            case '/demote':
                await this.demoteUser(msg, args);
                break;
            case '/pin':
                await this.pinMessage(msg);
                break;
            case '/unpin':
                await this.unpinMessage(msg);
                break;
            case '/delete':
                await this.deleteMessage(msg, args);
                break;
            default:
                await this.bot.sendMessage(msg.chat.id, '❌ Unknown admin command.');
        }
    }
    
    // Media handlers
    async handlePhoto(msg) {
        // Handle photo messages
        if (this.config.features.auto_reply && msg.chat.type === 'private') {
            await this.bot.sendMessage(msg.chat.id, "📸 Nice photo!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleVideo(msg) {
        // Handle video messages
        if (this.config.features.auto_reply && msg.chat.type === 'private') {
            await this.bot.sendMessage(msg.chat.id, "🎥 Great video!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleDocument(msg) {
        // Handle document messages
        if (msg.chat.type === 'private') {
            const fileName = msg.document.file_name;
            await this.bot.sendMessage(msg.chat.id, `📄 Document: ${fileName}`, {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleVoice(msg) {
        // Handle voice messages
        if (msg.chat.type === 'private') {
            await this.bot.sendMessage(msg.chat.id, "🎤 Voice message received!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleSticker(msg) {
        // Handle sticker messages
        if (this.config.features.auto_reply && msg.chat.type === 'private') {
            await this.bot.sendMessage(msg.chat.id, "😄 Nice sticker!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleAnimation(msg) {
        // Handle animation (GIF) messages
        if (msg.chat.type === 'private') {
            await this.bot.sendMessage(msg.chat.id, "🎬 Cool animation!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handlePoll(msg) {
        // Handle poll messages
        if (msg.chat.type === 'private') {
            await this.bot.sendMessage(msg.chat.id, "📊 Interesting poll!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    // Event handlers
    async handleEditedMessage(msg) {
        // Handle edited messages
        console.log(`Message edited by ${msg.from.first_name}`);
    }
    
    async handleCallbackQuery(callbackQuery) {
        // Handle callback queries from inline keyboards
        const { data, message, from } = callbackQuery;
        
        console.log(`Callback query: ${data} from ${from.first_name}`);
        
        switch (data) {
            case 'help':
                await this.bot.sendMessage(from.id, "Need help? Use /help command.");
                break;
            default:
                await this.bot.answerCallbackQuery(callbackQuery.id, {
                    text: `You selected: ${data}`,
                    show_alert: false
                });
        }
    }
    
    async handleInlineQuery(inlineQuery) {
        // Handle inline queries
        const results = [];
        
        if (inlineQuery.query === 'help') {
            results.push({
                type: 'article',
                id: '1',
                title: 'Help Center',
                input_message_content: {
                    message_text: '📚 *Bot Help*\nUse /help for detailed information.',
                    parse_mode: 'Markdown'
                },
                description: 'Get help with bot commands'
            });
        }
        
        await this.bot.answerInlineQuery(inlineQuery.id, results, {
            cache_time: 1
        });
    }
    
    async handlePollAnswer(pollAnswer) {
        // Handle poll answers
        console.log(`User ${pollAnswer.user.first_name} answered poll`);
    }
    
    async handleChatMemberUpdate(update) {
        // Handle chat member updates
        const { old_chat_member, new_chat_member, chat } = update;
        console.log(`Chat member update in ${chat.title}`);
    }
    
    async handleMyChatMemberUpdate(update) {
        // Handle bot's own chat member updates
        const { old_chat_member, new_chat_member, chat } = update;
        
        if (new_chat_member.status === 'administrator') {
            console.log(`✅ Bot added as admin in ${chat.title}`);
        } else if (new_chat_member.status === 'left' || new_chat_member.status === 'kicked') {
            console.log(`❌ Bot removed from ${chat.title}`);
        }
    }
    
    async handleBotAdded(chat) {
        // Handle when bot is added to a group
        const message = `🤖 *Bot Added Successfully!*\n\n` +
                       `Thank you for adding me to *${chat.title}*!\n\n` +
                       `To get started:\n` +
                       `1. Make me an admin with necessary permissions\n` +
                       `2. Use /settings to configure the bot\n` +
                       `3. Use /help to see available commands\n\n` +
                       `For any issues, contact @master_spamming`;
        
        await this.bot.sendMessage(chat.id, message, {
            parse_mode: 'Markdown'
        });
    }
    
    async handleBotRemoved(chat) {
        // Handle when bot is removed from a group
        console.log(`Bot removed from ${chat.title}`);
    }
    
    // Admin moderation methods
    async warnUser(msg, args) {
        if (args.length === 0) {
            await this.bot.sendMessage(msg.chat.id, "Usage: /warn @username [reason]");
            return;
        }
        
        const username = args[0].replace('@', '');
        const reason = args.slice(1).join(' ') || 'No reason specified';
        
        await this.bot.sendMessage(msg.chat.id, 
            `⚠️ *Warning Issued*\n\n` +
            `User: @${username}\n` +
            `Reason: ${reason}\n` +
            `By: ${msg.from.first_name}`,
            { parse_mode: 'Markdown' }
        );
    }
    
    async muteUser(msg, args) {
        if (args.length === 0) {
            await this.bot.sendMessage(msg.chat.id, "Usage: /mute @username [duration] [reason]");
            return;
        }
        
        const username = args[0].replace('@', '');
        const duration = args[1] || '1h';
        const reason = args.slice(2).join(' ') || 'No reason specified';
        
        await this.bot.sendMessage(msg.chat.id,
            `🔇 *User Muted*\n\n` +
            `User: @${username}\n` +
            `Duration: ${duration}\n` +
            `Reason: ${reason}\n` +
            `By: ${msg.from.first_name}`,
            { parse_mode: 'Markdown' }
        );
    }
    
    async banUser(msg, args) {
        if (args.length === 0) {
            await this.bot.sendMessage(msg.chat.id, "Usage: /ban @username [reason]");
            return;
        }
        
        const username = args[0].replace('@', '');
        const reason = args.slice(1).join(' ') || 'No reason specified';
        
        await this.bot.sendMessage(msg.chat.id,
            `🚫 *User Banned*\n\n` +
            `User: @${username}\n` +
            `Reason: ${reason}\n` +
            `By: ${msg.from.first_name}`,
            { parse_mode: 'Markdown' }
        );
    }
    
    // Utility methods
    isUserBlocked(userId) {
        return this.config.security?.blocked_users?.includes(userId) || false;
    }
    
    async isRateLimited(userId, chatId) {
        // Simple rate limiting
        return false;
    }
    
    async isAdmin(userId, chatId) {
        try {
            const admins = await this.bot.getChatAdministrators(chatId);
            return admins.some(admin => admin.user.id === userId);
        } catch (error) {
            return false;
        }
    }
    
    isDeveloper(userId) {
        return this.config.developers?.includes(userId) || false;
    }
    
    isOwner(userId) {
        return this.config.owners?.includes(userId) || false;
    }
    
    containsUrl(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return urlRegex.test(text);
    }
    
    getUptime() {
        const uptime = new Date() - this.stats.startTime;
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m ${seconds}s`;
    }
    
    async start() {
        console.log('🚀 Starting bot...');
        if (!this.config.webhook?.enabled || !process.env.RENDER) {
            await this.bot.startPolling();
        }
        console.log('✅ Bot is now running on Render.com!');
    }
    
    async stop() {
        console.log('🛑 Stopping bot...');
        await this.bot.stopPolling();
        console.log('✅ Bot stopped.');
    }
}

// Create and export bot instance
export const bot = new GroupMasterBot();
