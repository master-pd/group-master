const fs = require('fs');
const path = require('path');

module.exports = {
    bot: null,
    config: null,
    
    init: function(bot, config) {
        this.bot = bot;
        this.config = config;
    },
    
    handle: async function(msg) {
        const chatId = msg.chat.id;
        const text = msg.text;
        const userId = msg.from.id;
        
        const commands = {
            '/start': this.handleStart.bind(this),
            '/help': this.handleHelp.bind(this),
            '/admin': this.handleAdmin.bind(this)
        };
        
        for (const [cmd, handler] of Object.entries(commands)) {
            if (text.startsWith(cmd)) {
                await handler(msg);
                break;
            }
        }
    },
    
    handleStart: async function(msg) {
        const chatId = msg.chat.id;
        const userName = msg.from.first_name;
        
        const welcomeMsg = `<b>👋 Assalamualaikum ${userName}!</b>\n\n` +
                          `<i>🤖 I am ${this.config.botName}</i>\n\n` +
                          `<b>📌 Features:</b>\n` +
                          `• Auto Welcome Messages\n` +
                          `• Auto Reply System\n` +
                          `• Spam Protection\n` +
                          `• Bad Word Filter\n\n` +
                          `<b>📞 Contact:</b> <a href="${this.config.contact}">MAR-PD</a>\n\n` +
                          `<code>Type /help for commands</code>`;
        
        await this.bot.sendMessage(chatId, welcomeMsg, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    },
    
    handleHelp: async function(msg) {
        const chatId = msg.chat.id;
        
        const helpMsg = `<b>📜 Available Commands:</b>\n\n` +
                       `<code>/start</code> - Start the bot\n` +
                       `<code>/help</code> - Show this help\n` +
                       `<code>/admin</code> - Show group admins\n\n` +
                       `<b>⚡ Auto Features:</b>\n` +
                       `• Auto reply to keywords\n` +
                       `• Auto welcome new members\n` +
                       `• Auto spam protection\n\n` +
                       `<b>👨‍💻 Developer:</b> MAR-PD\n` +
                       `<b>📞 Contact:</b> <a href="${this.config.contact}">Telegram</a>`;
        
        await this.bot.sendMessage(chatId, helpMsg, {
            parse_mode: 'HTML'
        });
    },
    
    handleAdmin: async function(msg) {
        const chatId = msg.chat.id;
        
        try {
            const admins = await this.bot.getChatAdministrators(chatId);
            let adminList = '<b>👮 Group Administrators:</b>\n\n';
            
            admins.forEach((admin, index) => {
                const name = admin.user.first_name;
                const username = admin.user.username ? 
                    `<a href="https://t.me/${admin.user.username}">@${admin.user.username}</a>` : 
                    'No Username';
                
                adminList += `${index + 1}. <b>${name}</b> (${username})\n`;
            });
            
            await this.bot.sendMessage(chatId, adminList, {
                parse_mode: 'HTML'
            });
        } catch (error) {
            await this.bot.sendMessage(chatId, 
                '<i>❌ This command only works in groups</i>', 
                { parse_mode: 'HTML' }
            );
        }
    }
};
