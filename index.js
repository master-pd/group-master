module.exports = {
    bot: null,
    config: null,
    spamRecords: {},
    
    init: function(bot, config) {
        this.bot = bot;
        this.config = config;
        console.log('✅ Moderation handler loaded');
    },
    
    checkSpam: function(msg) {
        const userId = msg.from.id;
        const now = Date.now();
        
        if (!this.spamRecords[userId]) {
            this.spamRecords[userId] = {
                count: 1,
                firstTime: now
            };
            return false;
        }
        
        this.spamRecords[userId].count++;
        
        const timeDiff = (now - this.spamRecords[userId].firstTime) / 1000;
        
        // ৫ সেকেন্ডে ১০+ মেসেজ = স্পাম
        if (this.spamRecords[userId].count >= 10 && timeDiff <= 5) {
            this.handleSpammer(msg);
            delete this.spamRecords[userId];
            return true;
        }
        
        // রিসেট after ১০ সেকেন্ড
        if (timeDiff > 10) {
            delete this.spamRecords[userId];
        }
        
        return false;
    },
    
    handleSpammer: async function(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const userName = msg.from.first_name || 'User';
        
        const warning = `${userName} ভাই তুই কি মানুষ নাকি একটা রোবট?\n` +
                       `এইভাবে মেসেজ দিয়ে গ্রুপের স্পাম করিস কেন রে?\n` +
                       `২ মিনিটের জন্য মিউট করা হলো!`;
        
        try {
            await this.bot.sendMessage(chatId, warning, {
                reply_to_message_id: msg.message_id
            });
            
            const muteUntil = Math.floor(Date.now() / 1000) + 120;
            await this.bot.restrictChatMember(chatId, userId, {
                until_date: muteUntil,
                can_send_messages: false
            });
        } catch (error) {
            console.error('Mute error:', error.message);
        }
    },
    
    checkBadWords: async function(msg) {
        const text = msg.text ? msg.text.toLowerCase() : '';
        const badWords = require('../data/badWords.json');
        
        for (const word of badWords) {
            if (text.includes(word)) {
                const userName = msg.from.first_name || 'ভাই';
                const warning = `${userName} দেখ তোরে ভালোমতো বলতেছি!\n` +
                               `মাথা গরম করিস না!\n` +
                               `গ্রুপের ভিতর গালাগালি করা নিষেধ!`;
                
                try {
                    await this.bot.deleteMessage(msg.chat.id, msg.message_id);
                    await this.bot.sendMessage(msg.chat.id, warning);
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
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        
        if (urlRegex.test(text)) {
            const userName = msg.from.first_name || 'ভাই';
            const warning = `${userName} কিরে ভাই গ্রুপটা কি তোর বাপের? 🤧\n` +
                           `জানোস না গ্রুপে লিংক দেওয়া নিষেধ ☠️`;
            
            try {
                await this.bot.deleteMessage(msg.chat.id, msg.message_id);
                await this.bot.sendMessage(msg.chat.id, warning);
                return true;
            } catch (error) {
                console.error('URL delete error:', error.message);
            }
        }
        
        return false;
    }
};
