module.exports = {
    formatDate: function() {
        return new Date().toLocaleDateString('en-BD', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    escapeHtml: function(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    
    getRandom: function(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
};
