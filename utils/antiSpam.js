module.exports = {
    userMessageCount: {},
    
    recordMessage: function(userId, chatId) {
        const key = `${userId}_${chatId}`;
        const now = Date.now();
        
        if (!this.userMessageCount[key]) {
            this.userMessageCount[key] = [];
        }
        
        this.userMessageCount[key].push(now);
        
        // Keep only last 60 seconds of records
        this.userMessageCount[key] = this.userMessageCount[key].filter(
            time => now - time < 60000
        );
        
        return this.userMessageCount[key].length;
    },
    
    isSpamming: function(userId, chatId) {
        const key = `${userId}_${chatId}`;
        if (!this.userMessageCount[key]) return false;
        
        const now = Date.now();
        const recentMessages = this.userMessageCount[key].filter(
            time => now - time < 5000 // 5 seconds
        );
        
        return recentMessages.length >= 10;
    },
    
    clearOldRecords: function() {
        const now = Date.now();
        for (const key in this.userMessageCount) {
            this.userMessageCount[key] = this.userMessageCount[key].filter(
                time => now - time < 60000
            );
            
            if (this.userMessageCount[key].length === 0) {
                delete this.userMessageCount[key];
            }
        }
    }
};
