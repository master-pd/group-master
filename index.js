const fs = require('fs');
const path = require('path');

module.exports = {
    bot: null,
    config: null,
    
    init: function(bot, config) {
        this.bot = bot;
        this.config = config;
        console.log("✅ Command handler initialized");
    },
    
    handle: async function(msg) {
        try {
            const chatId = msg.chat.id;
            const text = msg.text.trim();
            const userId = msg.from.id;
            const userName = msg.from.first_name || 'User';
            
            console.log(`🔧 Processing command: "${text}"`);
            
            // Extract command and arguments
            const parts = text.split(' ');
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);
            
            // Command routing
            switch(command) {
                case '/start':
                    console.log(`   📍 Handling /start command`);
                    await this.handleStart(msg);
                    break;
                    
                case '/help':
                    console.log(`   📍 Handling /help command`);
                    await this.handleHelp(msg);
                    break;
                    
                case '/admin':
                    console.log(`   📍 Handling /admin command`);
                    await this.handleAdmin(msg);
                    break;
                    
                case '/ping':
                    console.log(`   📍 Handling /ping command`);
                    await this.handlePing(msg);
                    break;
                    
                default:
                    console.log(`   ⚠️ Unknown command: ${command}`);
                    await this.bot.sendMessage(chatId, 
                        `❌ Unknown command: <code>${command}</code>\n\n` +
                        `Type /help for available commands.`,
                        { parse_mode: 'HTML' }
                    );
            }
            
        } catch (error) {
            console.error('❌ Error in commandHandler.handle:', error.message);
            console.error(error.stack);
            
            // Send error message to user
            try {
                await this.bot.sendMessage(msg.chat.id,
                    `❌ An error occurred while processing your command.\n\n` +
                    `Please try again later.`,
                    { parse_mode: 'HTML' }
                );
            } catch (sendError) {
                console.error('Failed to send error message:', sendError.message);
            }
        }
    },
    
    handleStart: async function(msg) {
        const chatId = msg.chat.id;
        const userName = msg.from.first_name || 'Friend';
        
        console.log(`   👋 Sending start message to ${userName}`);
        
        const welcomeMsg = `
<b>👋 Assalamualaikum ${userName}!</b>

🤖 I am <b>${this.config.botName}</b>, an advanced Telegram group management bot.

<b>📌 Main Features:</b>
• Auto Welcome Messages 🎉
• Smart Auto Reply System 💬
• Spam Protection 🛡️
• Bad Word Filter ⚠️
• URL Protection 🔗
• Admin Tools 👮

<b>📞 Developer Contact:</b> <a href="${this.config.contact}">MAR-PD</a>

<b>⚡ Status:</b> Running 24/7 via GitHub Actions

Type <code>/help</code> for all commands.
        `.trim();
        
        await this.bot.sendMessage(chatId, welcomeMsg, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        
        console.log(`   ✅ Start message sent successfully`);
    },
    
    handleHelp: async function(msg) {
        const chatId = msg.chat.id;
        
        console.log(`   📖 Sending help message`);
        
        const helpMsg = `
<b>📜 AVAILABLE COMMANDS:</b>

<b>👤 User Commands:</b>
<code>/start</code> - Start the bot
<code>/help</code> - Show this help message
<code>/admin</code> - Show group administrators

<b>🤖 Auto Features:</b>
• Auto reply to keywords (hi, hello, etc.)
• Auto welcome new members
• Auto spam detection
• Auto URL filtering
• Auto bad word filtering

<b>🔧 Manual Commands:</b>
• Type any message with keywords to get auto-reply

<b>👨‍💻 Developer:</b> MAR-PD
<b>📞 Contact:</b> <a href="${this.config.contact}">Telegram</a>

<b>🔄 Bot Status:</b> Active & Running
        `.trim();
        
        await this.bot.sendMessage(chatId, helpMsg, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        
        console.log(`   ✅ Help message sent successfully`);
    },
    
    handleAdmin: async function(msg) {
        const chatId = msg.chat.id;
        
        console.log(`   👮 Fetching admin list`);
        
        try {
            const admins = await this.bot.getChatAdministrators(chatId);
            let adminList = '<b>👮 GROUP ADMINISTRATORS:</b>\n\n';
            
            admins.forEach((admin, index) => {
                const name = admin.user.first_name || 'Admin';
                const username = admin.user.username ? 
                    `@${admin.user.username}` : 
                    '<i>No username</i>';
                const role = admin.status === 'creator' ? '👑 Owner' : '⚡ Admin';
                
                adminList += `${index + 1}. <b>${name}</b> (${username}) - ${role}\n`;
            });
            
            adminList += `\n<b>Total Admins:</b> ${admins.length}`;
            
            await this.bot.sendMessage(chatId, adminList, {
                parse_mode: 'HTML'
            });
            
            console.log(`   ✅ Admin list sent (${admins.length} admins)`);
            
        } catch (error) {
            console.error(`   ❌ Failed to get admin list:`, error.message);
            
            await this.bot.sendMessage(chatId, 
                `<i>❌ This command only works in groups.</i>\n` +
                `<i>Add me to a group and make me admin to use this feature.</i>`,
                { parse_mode: 'HTML' }
            );
        }
    },
    
    handlePing: async function(msg) {
        const chatId = msg.chat.id;
        const startTime = Date.now();
        
        await this.bot.sendMessage(chatId, '🏓 Pong!', {
            reply_to_message_id: msg.message_id
        });
        
        const latency = Date.now() - startTime;
        
        await this.bot.sendMessage(chatId,
            `⏱️ <b>Bot Latency:</b> <code>${latency}ms</code>\n` +
            `📅 <b>Server Time:</b> <code>${new Date().toLocaleString()}</code>\n` +
            `🤖 <b>Bot Status:</b> <code>Operational</code>`,
            { parse_mode: 'HTML' }
        );
        
        console.log(`   🏓 Ping responded (${latency}ms)`);
    }
};
