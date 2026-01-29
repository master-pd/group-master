const fs = require('fs');
const path = require('path');

let badWordsData = [];
let spamRecords = {};

module.exports = {
    bot: null,
    config: null,
    
    init: function(bot, config) {
        this.bot = bot;
        this.config = config;
        
        try {
            badWordsData = require('../data/badWords.json');
            console.log("✅ Loaded bad words list");
        } catch (error) {
            badWordsData = ['bad', 'word', 'test'];
        }
    },
    
    checkSpam: function(msg) {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        const now = Date.now();
        
        const key = `${userId}_${chatId}`;
        
        if (!spamRecords[key]) {
            spamRecords[key] = {
                count: 1,
                firstTime: now,
                lastTime: now
            };
            return false;
        }
        
        spamRecords[key].count++;
        spamRecords[key].lastTime = now;
        
        const timeDiff = (now - spamRecords[key].firstTime) / 1000;
        
        // Check if 10 messages in 5 seconds
        if (spamRecords[key].count >= 10 && timeDiff <= 5) {
            this.handleSpammer(msg);
            delete spamRecords[key];
            return true;
        }
        
        // Reset if 10 seconds passed
        if (timeDiff > 10) {
            delete spamRecords[key];
        }
        
        return false;
    },
    
    handleSpammer: async function(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userName = msg.from.first_name || 'User';
        
        const spamMsg = `<b>🚫 Spam Detected!</b>\n\n` +
                       `<i>${userName} ভাই তুই কি মানুষ নাকি একটা রোবট?</i>\n` +
                       `<i>এইভাবে মেসেজ দিয়ে গ্রুপের স্পাম করিস কেন রে?</i>\n\n` +
                       `<code>You have been muted for 2 minutes</code>`;
        
        try {
            await this.bot.sendMessage(chatId, spamMsg, {
                parse_mode: 'HTML',
                reply_to_message_id: msg.message_id
            });
            
            // Mute for 2 minutes
            const muteUntil = Math.floor(Date.now() / 1000) + 120;
            await this.bot.restrictChatMember(chatId, userId, {
                until_date: muteUntil,
                can_send_messages: false
            });
            
            console.log(`🚫 Muted spammer ${userName} (${userId})`);
        } catch (error) {
            console.error('Mute error:', error.message);
        }
    },
    
    checkBadWords: async function(msg) {
        const text = msg.text ? msg.text.toLowerCase() : '';
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userName = msg.from.first_name || 'ভাই';
        
        for (const badWord of badWordsData) {
            if (text.includes(badWord.toLowerCase())) {
                const warningMsg = `<b>⚠️ Bad Word Warning!</b>\n\n` +
                                  `<i>${userName} দেখ তোরে ভালোমতো বলতেছি</i>\n` +
                                  `<i>মাথা গরম করিস না</i>\n` +
                                  `<i>গ্রুপের ভিতর গালাগালি করা কিন্তু নিষেধ</i>\n\n` +
                                  `<code>Next time will result in ban</code>`;
                
                try {
                    await this.bot.deleteMessage(chatId, msg.message_id);
                    await this.bot.sendMessage(chatId, warningMsg, {
                        parse_mode: 'HTML'
                    });
                    return true;
                } catch (error) {
                    console.error('Bad word delete error:', error.message);
                }
                break;
            }
        }
        
        return false;
    },
    
    checkUrl: async function(msg) {
        const text = msg.text || '';
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const isAdmin = await this.isAdmin(chatId, userId);
        
        // Allow admins to post URLs
        if (isAdmin) return false;
        
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        if (urlRegex.test(text)) {
            const userName = msg.from.first_name || 'ভাই';
            
            const urlMsg = `<b>🔗 URL Detected!</b>\n\n` +
                          `<i>${userName} কিরে ভাই গ্রুপটা কি তোর বাপের? 🤧</i>\n` +
                          `<i>জানোস না গ্রুপে লিংক দেওয়া নিষেধ ☠️</i>\n\n` +
                          `<code>URL removed</code>`;
            
            try {
                await this.bot.deleteMessage(chatId, msg.message_id);
                await this.bot.sendMessage(chatId, urlMsg, {
                    parse_mode: 'HTML'
                });
                return true;
            } catch (error) {
                console.error('URL delete error:', error.message);
            }
        }
        
        return false;
    },
    
    isAdmin: async function(chatId, userId) {
        try {
            const admins = await this.bot.getChatAdministrators(chatId);
            return admins.some(admin => admin.user.id === userId);
        } catch (error) {
            return false;
        }
    }
};
