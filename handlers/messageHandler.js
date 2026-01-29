const fs = require('fs');
const path = require('path');

let repliesData = {};

module.exports = {
    bot: null,
    config: null,
    
    init: function(bot, config) {
        this.bot = bot;
        this.config = config;
        
        try {
            repliesData = require('../data/replies.json');
            console.log("✅ Loaded replies.json");
        } catch (error) {
            console.error("❌ Failed to load replies.json");
            repliesData = {
                "hi": ["Hello!", "Assalamualaikum!"],
                "hello": ["Hi there!", "How can I help?"]
            };
        }
    },
    
    handle: async function(msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const text = msg.text.toLowerCase();
        
        // Show typing action
        await this.bot.sendChatAction(chatId, 'typing');
        
        // Delay for natural feel
        await this.delay(1500);
        
        // Find reply
        let reply = null;
        for (const [keyword, responses] of Object.entries(repliesData)) {
            if (text.includes(keyword.toLowerCase())) {
                reply = responses[Math.floor(Math.random() * responses.length)];
                break;
            }
        }
        
        if (reply) {
            // Replace {Name} with user's name
            const userName = msg.from.first_name || 'ভাই';
            const finalReply = reply.replace(/{Name}/g, userName);
            
            await this.bot.sendMessage(chatId, finalReply, {
                parse_mode: 'HTML',
                reply_to_message_id: msg.message_id
            });
        }
    },
    
    delay: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
