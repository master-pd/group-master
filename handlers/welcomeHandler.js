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
        const newMembers = msg.new_chat_members;
        
        for (const member of newMembers) {
            if (!member.is_bot) {
                await this.sendWelcome(chatId, member, msg.chat.type);
            }
        }
    },
    
    handleBotJoin: async function(msg) {
        const chatId = msg.chat.id;
        
        try {
            const admins = await this.bot.getChatAdministrators(chatId);
            let adminMentions = '';
            
            admins.forEach(admin => {
                if (admin.user.username) {
                    adminMentions += `<a href="https://t.me/${admin.user.username}">👑</a> `;
                }
            });
            
            const welcomeMsg = `<b>🤖 Bot Joined Successfully!</b>\n\n` +
                              `<i>Thank you for adding me to this group!</i>\n\n` +
                              `<b>Group Admins:</b>\n${adminMentions}\n\n` +
                              `<code>Type /help to see my features</code>`;
            
            await this.bot.sendMessage(chatId, welcomeMsg, {
                parse_mode: 'HTML'
            });
        } catch (error) {
            console.error('Error in bot join welcome:', error.message);
        }
    },
    
    sendWelcome: async function(chatId, user, chatType) {
        const userName = user.first_name || 'New Member';
        const userId = user.id;
        
        let welcomeMsg = '';
        
        if (chatType === 'private') {
            welcomeMsg = `<b>👋 Welcome ${userName}!</b>\n\n` +
                        `<i>Thank you for starting me!</i>\n\n` +
                        `<b>📅 Date:</b> ${new Date().toLocaleDateString()}\n` +
                        `<b>🆔 Your ID:</b> <code>${userId}</code>\n\n` +
                        `<code>Type /help for commands</code>`;
        } else {
            welcomeMsg = `<b>🎉 Welcome to the group, ${userName}!</b>\n\n` +
                        `<i>Assalamualaikum and welcome aboard!</i>\n\n` +
                        `<b>📅 Joined:</b> ${new Date().toLocaleDateString()}\n` +
                        `<b>👥 Group:</b> ${chatType}\n\n` +
                        `<code>Please read group rules</code>`;
        }
        
        await this.bot.sendMessage(chatId, welcomeMsg, {
            parse_mode: 'HTML'
        });
        
        // Send sticker if available
        try {
            await this.bot.sendSticker(chatId, 
                'CAACAgUAAxkBAAIBMWbIAAGWbOexsV9Oe-3uE8v5bJk7XAACsAIAAhX_6VU4AAHhOoX0cI81BA'
            );
        } catch (error) {
            // Sticker not sent, ignore
        }
    }
};
