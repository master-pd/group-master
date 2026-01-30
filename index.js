#!/usr/bin/env node

import { bot } from './src/bot.js';
import { logger } from './src/utils.js';

console.log(`
╔══════════════════════════════════════════════════════════╗
║           🚀 Group Master Pro Bot 🚀                    ║
║                 Version 3.0.0                            ║
║          👑 Advanced Group Management                   ║
║          👨‍💻 Developer: MAR-PD                          ║
║          📞 Contact: @master_spamming                   ║
╚══════════════════════════════════════════════════════════╝
`);

// Error handling
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}`, { reason });
    console.error('❌ Unhandled Rejection:', reason);
});

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

signals.forEach(signal => {
    process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        console.log(`\n🛑 Received ${signal}, shutting down...`);
        
        try {
            // Stop bot
            if (bot && bot.stopPolling) {
                await bot.stopPolling();
                console.log('✅ Bot polling stopped');
            }
            
            logger.info('Bot shutdown completed');
            console.log('👋 Goodbye!');
            process.exit(0);
        } catch (error) {
            logger.error(`Error during shutdown: ${error.message}`);
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    });
});

// Start bot
try {
    await bot.start();
    console.log('\n✅ Bot started successfully!');
    console.log('📱 Bot is now running and ready to receive messages');
    console.log('🔄 Mode: Polling');
    console.log('👑 Bot Name: Group Master Pro');
    console.log('🔗 Username: @' + bot.username);
    console.log('\n⚡ Features Enabled:');
    console.log('   • Auto Welcome System');
    console.log('   • Smart Auto Reply');
    console.log('   • Advanced Moderation');
    console.log('   • AI-Powered Responses');
    console.log('   • Image Generation');
    console.log('   • Broadcast System');
    console.log('   • Games & Entertainment');
    console.log('\n📊 Use /stats to check bot status');
    console.log('🆘 Use /help for commands list');
    console.log('\n💡 Press Ctrl+C to stop the bot\n');
} catch (error) {
    logger.error(`Failed to start bot: ${error.message}`, { stack: error.stack });
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
}
