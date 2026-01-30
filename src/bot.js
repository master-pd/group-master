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
        
        // Auto-reply cache
        this.autoReplyCache = {
            responses: null,
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
        
        // Load features
        this.loadFeatures();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load auto-reply cache
        this.loadAutoReplyCache();
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
                // In real implementation, load from separate files
                this.features.set(feature, { enabled: true });
                console.log(`   ✅ ${feature}`);
            } catch (error) {
                console.log(`   ❌ ${feature}: ${error.message}`);
            }
        });
        
        console.log('✅ Features loaded');
    }
    
    loadAutoReplyCache() {
        try {
            const responses = JSON.parse(
                fs.readFileSync(path.join(__dirname, '..', 'data', 'responses', 'auto-reply.json'), 'utf8')
            );
            this.autoReplyCache.responses = responses;
            this.autoReplyCache.lastLoaded = new Date();
            console.log('✅ Auto-reply cache loaded');
        } catch (error) {
            console.error('❌ Failed to load auto-reply cache:', error.message);
            this.autoReplyCache.responses = {};
        }
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
            
            // Handle regular messages with auto-reply (এখন সব জায়গায় কাজ করবে)
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
        
        // Basic commands (সবার জন্য)
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
                
            case '/report':
                await this.handleReportCommand(msg, args);
                break;
                
            case '/admin':
                await this.mentionAdmins(msg);
                break;
                
            case '/me':
                await this.sendUserInfo(msg);
                break;
                
            case '/info':
                await this.sendChatInfo(msg);
                break;
                
            case '/contact':
                await this.sendContactMessage(msg);
                break;
                
            case '/settings':
                await this.sendSettingsMessage(msg);
                break;
                
            case '/games':
                await this.sendGamesList(msg);
                break;
                
            case '/quote':
                await this.sendRandomQuote(msg);
                break;
                
            case '/joke':
                await this.sendRandomJoke(msg);
                break;
                
            case '/broadcast':
                // শুধু ডেভেলপারদের জন্য
                if (this.isDeveloper(msg.from.id)) {
                    await this.handleBroadcastCommand(msg, args);
                } else {
                    await this.handleUnknownCommand(msg, command);
                }
                break;
                
            default:
                // Admin commands চেক করো
                const isUserAdmin = await this.isAdmin(msg.from.id, msg.chat.id);
                
                if (isUserAdmin) {
                    await this.handleAdminCommand(msg, command, args);
                } else {
                    // Unknown command এর জন্য আরও ভালো রেসপন্স
                    await this.handleUnknownCommand(msg, command);
                }
        }
    }
    
    async handleRegularMessage(msg) {
        // Auto-reply system (এখন সব জায়গায় কাজ করবে)
        if (this.config.features.auto_reply) {
            await this.handleAutoReply(msg);
        }
        
        // Moderation system (শুধু গ্রুপে)
        if (this.config.features.moderation && msg.chat.type !== 'private') {
            await this.handleModeration(msg);
        }
        
        // AI chat system
        if (this.config.features.ai_chat) {
            await this.handleAIChat(msg);
        }
    }
    
    async handleAutoReply(msg) {
        try {
            // Cache থেকে responses নাও
            let responses = this.autoReplyCache.responses;
            
            // Cache empty হলে reload করো
            if (!responses || Object.keys(responses).length === 0) {
                this.loadAutoReplyCache();
                responses = this.autoReplyCache.responses;
            }
            
            const message = (msg.text || msg.caption || '').toLowerCase().trim();
            
            // খালি মেসেজ স্কিপ করো
            if (!message || message.length < 2) return;
            
            // Find matching response
            for (const [trigger, reply] of Object.entries(responses)) {
                const triggers = trigger.split('|').map(t => t.trim().toLowerCase());
                
                for (const t of triggers) {
                    if (message.includes(t)) {
                        // Send typing action
                        await this.bot.sendChatAction(msg.chat.id, 'typing');
                        
                        // Random delay (0.5 to 2 seconds)
                        const delayTime = Math.floor(Math.random() * 1500) + 500;
                        await new Promise(resolve => setTimeout(resolve, delayTime));
                        
                        // Format reply with placeholders
                        let formattedReply = reply;
                        if (reply.includes('{time}') || reply.includes('{date}')) {
                            const now = new Date();
                            formattedReply = formattedReply
                                .replace(/{time}/g, now.toLocaleTimeString())
                                .replace(/{date}/g, now.toLocaleDateString());
                        }
                        
                        // Send reply
                        await this.bot.sendMessage(msg.chat.id, formattedReply, {
                            parse_mode: 'Markdown',
                            reply_to_message_id: msg.message_id
                        });
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Error in auto-reply:', error);
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
            message += `/settings - Configure bot\n`;
            message += `/games - Fun games\n`;
            message += `/quote - Random quote\n`;
            message += `/joke - Random joke\n\n`;
            
            message += `*AI Features:*\n`;
            message += `Just chat with me normally! I'll reply automatically.\n\n`;
            
            message += `*Group Management:*\n`;
            message += `Add me to your group and make me admin for full features.`;
        } else {
            message += `*Group Commands:*\n`;
            message += `/help - Show this message\n`;
            message += `/rules - Show group rules\n`;
            message += `/report [reason] - Report a user\n`;
            message += `/admin - Mention all admins\n`;
            message += `/info - Group information\n`;
            message += `/me - Your information\n`;
            message += `/games - Fun games\n\n`;
            
            if (isAdmin) {
                message += `*Admin Commands:*\n`;
                message += `/warn @user - Warn a user\n`;
                message += `/mute @user - Mute a user\n`;
                message += `/ban @user - Ban a user\n`;
                message += `/unban @user - Unban a user\n`;
                message += `/promote @user - Make admin\n`;
                message += `/demote @user - Remove admin\n`;
                message += `/settings - Group settings\n`;
                message += `/broadcast [msg] - Broadcast message\n`;
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
        // Basic AI response system (এখন সব জায়গায় কাজ করবে)
        const message = (msg.text || msg.caption || '').toLowerCase();
        
        // Simple pattern matching
        const responses = {
            'how are you': ["I'm doing great, thanks for asking! 😊", "Alhamdulillah, I'm good! How about you? 🌟"],
            'what can you do': ["I can help manage groups, answer questions, play games, and much more! ✨", "I'm a multi-purpose bot! Try /help to see all features."],
            'who created you': ["I was created by MAR-PD! 👨‍💻", "My developer is MAR-PD. You can contact him @master_spamming"],
            'thank you': ["You're welcome! 😊", "My pleasure! 🌟", "Always happy to help! 🤗"],
            'hello': ["Hello there! 👋", "Hi! How can I help you? 😊", "Assalamualaikum! 🤲"],
            'assalamualaikum': ["Waalaikumussalam! 😊", "Waalaikumussalam warahmatullah! 🌟"],
            'hi': ["Hi! 😊", "Hello! 👋", "Hey there! 🤗"],
            'hey': ["Hey! 👋", "Hello! 😊", "Hi there! 🌟"],
            'good morning': ["Good morning! 🌅", "Morning! ☀️", "Sabah al-khair! 🌟"],
            'good night': ["Good night! 🌙", "Sweet dreams! 💭", "Sleep well! 😴"],
            'bot': ["Yes, I'm a bot! 🤖", "That's me! 👋", "How can I help you? 😊"],
            'mar-pd': ["That's my creator! 👨‍💻", "MAR-PD created me! 💻", "Contact my developer @master_spamming"]
        };
        
        for (const [pattern, replyOptions] of Object.entries(responses)) {
            if (message.includes(pattern)) {
                const reply = replyOptions[Math.floor(Math.random() * replyOptions.length)];
                
                await this.bot.sendChatAction(msg.chat.id, 'typing');
                await new Promise(resolve => setTimeout(resolve, 800));
                
                await this.bot.sendMessage(msg.chat.id, reply, {
                    reply_to_message_id: msg.message_id
                });
                return;
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
            message += `*Node Version:* ${process.version}`;
        }
        
        await this.bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'Markdown'
        });
    }
    
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
            case '/setrules':
                await this.setRules(msg, args);
                break;
            case '/setwelcome':
                await this.setWelcome(msg, args);
                break;
            default:
                await this.bot.sendMessage(msg.chat.id, 
                    `❌ Unknown admin command.\n` +
                    `Use /help for admin commands list.`,
                    { parse_mode: 'Markdown' }
                );
        }
    }
    
    async handleUnknownCommand(msg, command) {
        const suggestions = {
            'stats': '/stats',
            'status': '/stats',
            'help': '/help',
            'start': '/start',
            'about': '/about',
            'ping': '/ping',
            'id': '/id',
            'rules': '/rules',
            'report': '/report',
            'admin': '/admin',
            'me': '/me',
            'info': '/info',
            'contact': '/contact',
            'settings': '/settings',
            'games': '/games',
            'quote': '/quote',
            'joke': '/joke'
        };
        
        // Command থেকে / remove করো
        const cmdWithoutSlash = command.replace('/', '');
        
        let response = `❌ *Unknown Command:* \`${command}\`\n\n`;
        response += `✅ *Available Commands:*\n`;
        response += `• /start - Start bot\n`;
        response += `• /help - All commands\n`;
        response += `• /about - Bot info\n`;
        response += `• /stats - Bot statistics\n`;
        response += `• /ping - Check bot status\n`;
        response += `• /id - Get user/chat ID\n`;
        response += `• /games - Fun games\n\n`;
        
        // Suggestion দাও
        if (suggestions[cmdWithoutSlash]) {
            response += `💡 *Did you mean:* ${suggestions[cmdWithoutSlash]} ?`;
        } else {
            response += `📚 Use /help for complete command list`;
        }
        
        await this.bot.sendMessage(msg.chat.id, response, {
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id
        });
    }
    
    async handlePhoto(msg) {
        if (this.config.features.auto_reply) {
            await this.bot.sendMessage(msg.chat.id, "📸 Nice photo!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleVideo(msg) {
        if (this.config.features.auto_reply) {
            await this.bot.sendMessage(msg.chat.id, "🎥 Great video!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleDocument(msg) {
        if (this.config.features.auto_reply) {
            const fileName = msg.document.file_name;
            await this.bot.sendMessage(msg.chat.id, `📄 Document: ${fileName}`, {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleVoice(msg) {
        if (this.config.features.auto_reply) {
            await this.bot.sendMessage(msg.chat.id, "🎤 Voice message received!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleSticker(msg) {
        if (this.config.features.auto_reply) {
            await this.bot.sendMessage(msg.chat.id, "😄 Nice sticker!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleAnimation(msg) {
        if (this.config.features.auto_reply) {
            await this.bot.sendMessage(msg.chat.id, "🎬 Cool animation!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handlePoll(msg) {
        if (this.config.features.auto_reply) {
            await this.bot.sendMessage(msg.chat.id, "📊 Interesting poll!", {
                reply_to_message_id: msg.message_id
            });
        }
    }
    
    async handleEditedMessage(msg) {
        console.log(`Message edited by ${msg.from.first_name}`);
    }
    
    async handleCallbackQuery(callbackQuery) {
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
        console.log(`User ${pollAnswer.user.first_name} answered poll`);
    }
    
    async handleChatMemberUpdate(update) {
        const { old_chat_member, new_chat_member, chat } = update;
        console.log(`Chat member update in ${chat.title}`);
    }
    
    async handleMyChatMemberUpdate(update) {
        const { old_chat_member, new_chat_member, chat } = update;
        
        if (new_chat_member.status === 'administrator') {
            console.log(`✅ Bot added as admin in ${chat.title}`);
        } else if (new_chat_member.status === 'left' || new_chat_member.status === 'kicked') {
            console.log(`❌ Bot removed from ${chat.title}`);
        }
    }
    
    async handleBotAdded(chat) {
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
    
    // 🔥 নতুন যোগ করা ইউটিলিটি মেথড
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
    
    // Utility methods
    isUserBlocked(userId) {
        return this.config.security.blocked_users.includes(userId);
    }
    
    async isRateLimited(userId, chatId) {
        // Simple rate limiting implementation
        return false;
    }
    
    async isAdmin(userId, chatId) {
        try {
            // Private chat এ admin চেক করার দরকার নেই
            if (chatId > 0) return false;
            
            const admins = await this.bot.getChatAdministrators(chatId);
            return admins.some(admin => admin.user.id === userId);
        } catch (error) {
            console.error('Error checking admin status:', error.message);
            return false;
        }
    }
    
    isDeveloper(userId) {
        return this.config.developers.includes(userId);
    }
    
    isOwner(userId) {
        return this.config.owners.includes(userId);
    }
    
    containsUrl(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return urlRegex.test(text);
    }
    
    // নতুন যোগ করা ফাংশন
    async sendRulesMessage(msg) {
        const rules = `📜 *Group Rules*\n\n` +
                     `1. Be respectful to everyone\n` +
                     `2. No spam or self-promotion\n` +
                     `3. No NSFW content\n` +
                     `4. No political/religious debates\n` +
                     `5. Use appropriate language\n` +
                     `6. Follow admin instructions\n\n` +
                     `⚠️ Violation may result in mute/ban`;
        
        await this.bot.sendMessage(msg.chat.id, rules, {
            parse_mode: 'Markdown'
        });
    }
    
    async handleReportCommand(msg, args) {
        if (args.length === 0) {
            await this.bot.sendMessage(msg.chat.id, 
                `⚠️ *Usage:* /report [reason]\n` +
                `Example: /report @username spamming`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
        
        const reason = args.join(' ');
        await this.bot.sendMessage(msg.chat.id,
            `✅ *Report Submitted*\n\n` +
            `Your report has been sent to admins.\n` +
            `Reason: ${reason}`,
            { parse_mode: 'Markdown' }
        );
    }
    
    async mentionAdmins(msg) {
        try {
            const admins = await this.bot.getChatAdministrators(msg.chat.id);
            let mentionText = `🚨 *Attention Admins!*\n\n`;
        
            admins.forEach(admin => {
                if (!admin.user.is_bot) {
                    const username = admin.user.username ? `@${admin.user.username}` : admin.user.first_name;
                    mentionText += `• ${username}\n`;
                }
            });
        
            mentionText += `\nUser ${msg.from.first_name} needs assistance!`;
        
            await this.bot.sendMessage(msg.chat.id, mentionText, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            await this.bot.sendMessage(msg.chat.id, 
                `❌ Could not fetch admins list.\n` +
                `Make sure I'm admin in this group.`,
                { parse_mode: 'Markdown' }
            );
        }
    }
    
    async sendUserInfo(msg) {
        const user = msg.from;
        const userInfo = `👤 *Your Information*\n\n` +
                        `🆔 ID: \`${user.id}\`\n` +
                        `👤 Name: ${user.first_name} ${user.last_name || ''}\n` +
                        `📛 Username: ${user.username ? '@' + user.username : 'Not set'}\n` +
                        `🌐 Language: ${user.language_code || 'Unknown'}\n` +
                        `🤖 Is Bot: ${user.is_bot ? 'Yes' : 'No'}\n` +
                        `📅 Joined: ${new Date().toLocaleDateString()}`;
    
        await this.bot.sendMessage(msg.chat.id, userInfo, {
            parse_mode: 'Markdown'
        });
    }
    
    async sendChatInfo(msg) {
        if (msg.chat.type === 'private') {
            await this.bot.sendMessage(msg.chat.id, 
                `This is a private chat. Use /me for your info.`,
                { parse_mode: 'Markdown' }
            );
            return;
        }
    
        try {
            const chat = await this.bot.getChat(msg.chat.id);
            const chatInfo = `💬 *Chat Information*\n\n` +
                            `🆔 ID: \`${chat.id}\`\n` +
                            `📛 Title: ${chat.title}\n` +
                            `📝 Type: ${chat.type}\n` +
                            `👥 Members: ${chat.member_count || 'Unknown'}\n` +
                            `📜 Description: ${chat.description || 'Not set'}\n` +
                            `📌 Username: ${chat.username ? '@' + chat.username : 'Not set'}`;
        
            await this.bot.sendMessage(msg.chat.id, chatInfo, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            await this.bot.sendMessage(msg.chat.id,
                `❌ Could not fetch chat info.\n` +
                `Make sure I'm admin in this group.`,
                { parse_mode: 'Markdown' }
            );
        }
    }
    
    async sendContactMessage(msg) {
        const contact = `📞 *Contact Developer*\n\n` +
                       `*Name:* MAR-PD\n` +
                       `*Telegram:* @master_spamming\n` +
                       `*Email:* mar-pd@example.com\n\n` +
                       `For bug reports, feature requests, or any assistance.`;
    
        await this.bot.sendMessage(msg.chat.id, contact, {
            parse_mode: 'Markdown'
        });
    }
    
    async sendSettingsMessage(msg) {
        const settings = `⚙️ *Bot Settings*\n\n` +
                        `*Welcome System:* ${this.config.features.welcome_system ? '✅ On' : '❌ Off'}\n` +
                        `*Auto Reply:* ${this.config.features.auto_reply ? '✅ On' : '❌ Off'}\n` +
                        `*Moderation:* ${this.config.features.moderation ? '✅ On' : '❌ Off'}\n` +
                        `*AI Chat:* ${this.config.features.ai_chat ? '✅ On' : '❌ Off'}\n\n` +
                        `Contact admin to change settings.`;
    
        await this.bot.sendMessage(msg.chat.id, settings, {
            parse_mode: 'Markdown'
        });
    }
    
    async sendGamesList(msg) {
        const games = `🎮 *Available Games*\n\n` +
                     `1. *Quiz Game* - Test your knowledge\n` +
                     `2. *Word Game* - Find hidden words\n` +
                     `3. *Math Game* - Solve math problems\n` +
                     `4. *Trivia* - Random trivia questions\n\n` +
                     `*Coming Soon:*\n` +
                     `• Guess the number\n` +
                     `• Hangman\n` +
                     `• Tic Tac Toe`;
    
        await this.bot.sendMessage(msg.chat.id, games, {
            parse_mode: 'Markdown'
        });
    }
    
    async sendRandomQuote(msg) {
        const quotes = [
            "The best among you are those who have the best manners and character. - Prophet Muhammad (ﷺ)",
            "Do not lose hope, nor be sad. - Quran 3:139",
            "The strong is not the one who overcomes the people by his strength, but the strong is the one who controls himself while in anger. - Prophet Muhammad (ﷺ)",
            "Patience is a pillar of faith. - Umar ibn al-Khattab",
            "The ink of the scholar is more sacred than the blood of the martyr. - Prophet Muhammad (ﷺ)",
            "Whoever believes in Allah and the Last Day, let him speak good or remain silent. - Prophet Muhammad (ﷺ)",
            "Kindness is a mark of faith, and whoever is not kind has no faith. - Prophet Muhammad (ﷺ)"
        ];
    
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        await this.bot.sendMessage(msg.chat.id, `💬 *Quote of the moment:*\n\n${randomQuote}`, {
            parse_mode: 'Markdown'
        });
    }
    
    async sendRandomJoke(msg) {
        const jokes = [
            "Why don't programmers like nature? It has too many bugs! 🐛",
            "Why do Java developers wear glasses? Because they can't C#! 👓",
            "How many programmers does it take to change a light bulb? None, that's a hardware problem! 💡",
            "Why do Python programmers wear glasses? Because they can't C! 🐍",
            "What's a programmer's favorite hangout place? Foo Bar! 🍻",
            "Why did the programmer quit his job? Because he didn't get arrays! 😄"
        ];
    
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        await this.bot.sendMessage(msg.chat.id, `😂 *Joke Time:*\n\n${randomJoke}`, {
            parse_mode: 'Markdown'
        });
    }
    
    async handleBroadcastCommand(msg, args) {
        if (args.length === 0) {
            await this.bot.sendMessage(msg.chat.id, "Usage: /broadcast [message]");
            return;
        }
        
        const broadcastMessage = args.join(' ');
        await this.bot.sendMessage(msg.chat.id, 
            `📢 *Broadcast Preview:*\n\n${broadcastMessage}\n\n` +
            `*Note:* Broadcast feature is under development.`,
            { parse_mode: 'Markdown' }
        );
    }
    
    async start() {
        console.log('🚀 Starting bot...');
        // Render.com এ webhook auto-start হয়, polling করতে হবে না
        if (!process.env.RENDER && !this.config.webhook?.enabled) {
            await this.bot.startPolling();
        }
        console.log('✅ Bot is now running!');
        console.log('📍 Hosted on: Render.com');
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
