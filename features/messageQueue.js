// Message queue system to maintain 10 message limit
class MessageQueue {
    constructor(maxSize = 10) {
        this.maxSize = maxSize;
        this.queues = new Map();
    }
    
    addMessage(chatId, messageId) {
        if (!this.queues.has(chatId)) {
            this.queues.set(chatId, []);
        }
        
        const queue = this.queues.get(chatId);
        queue.push(messageId);
        
        // Remove oldest if exceeds max size
        if (queue.length > this.maxSize) {
            const oldest = queue.shift();
            return oldest; // Return message to delete
        }
        
        return null;
    }
    
    removeMessage(chatId, messageId) {
        if (this.queues.has(chatId)) {
            const queue = this.queues.get(chatId);
            const index = queue.indexOf(messageId);
            if (index > -1) {
                queue.splice(index, 1);
            }
        }
    }
    
    getQueue(chatId) {
        return this.queues.get(chatId) || [];
    }
    
    clearQueue(chatId) {
        this.queues.delete(chatId);
    }
}

module.exports = new MessageQueue();
