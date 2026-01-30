// Test script for bot functionality
const TelegramBot = require('node-telegram-bot-api');

async function testBot() {
    console.log('🧪 Testing Bot Functionality...\n');
    
    // Test cases
    const tests = [
        {
            name: 'Config File',
            test: () => {
                try {
                    const config = require('../config.json');
                    return config.botToken && config.developerId;
                } catch (e) {
                    return false;
                }
            }
        },
        {
            name: 'Data Files',
            test: () => {
                const files = [
                    'replies.json',
                    'help.json',
                    'badWords.json'
                ];
                
                let allExist = true;
                files.forEach(file => {
                    try {
                        require(`../data/${file}`);
                    } catch (e) {
                        allExist = false;
                    }
                });
                
                return allExist;
            }
        },
        {
            name: 'Dependencies',
            test: () => {
                try {
                    require('node-telegram-bot-api');
                    require('moment');
                    return true;
                } catch (e) {
                    return false;
                }
            }
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        const result = test.test();
        const icon = result ? '✅' : '❌';
        
        console.log(`${icon} ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
        
        if (result) passed++;
        else failed++;
    }
    
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('🎉 All tests passed! Bot is ready to run.');
    } else {
        console.log('⚠️ Some tests failed. Please check the issues.');
    }
}

// Run tests
testBot().catch(console.error);
