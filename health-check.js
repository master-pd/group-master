// Health check endpoint for monitoring
const http = require('http');

const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            bot: 'Group Master Bot'
        }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(8080, () => {
    console.log('🩺 Health check server running on port 8080');
});

module.exports = server;
