
module.exports = {
    reactions: {
        '👍': ['good', 'nice', 'great'],
        '❤️': ['love', 'thanks', 'thank you'],
        '😂': ['haha', 'lol', 'funny'],
        '😢': ['sad', 'sorry', 'bad'],
        '🤔': ['why', 'how', 'what']
    },
    
    checkAndReact: async function(bot, msg) {
        const text = msg.text ? msg.text.toLowerCase() : '';
        
        for (const [emoji, keywords] of Object.entries(this.reactions)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    try {
                        await bot.setMessageReaction(msg.chat.id, msg.message_id, [
                            { type: 'emoji', emoji: emoji }
                        ]);
                        return true;
                    } catch (error) {
                        console.log('Reaction failed:', error.message);
                    }
                }
            }
        }
        
        return false;
    }
};
