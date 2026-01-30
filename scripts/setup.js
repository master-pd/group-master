#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🤖 Group Master Bot Setup Wizard');
console.log('================================');

const questions = [
    {
        name: 'botToken',
        question: 'Enter your bot token from @BotFather: '
    },
    {
        name: 'developerId',
        question: 'Enter your Telegram ID (send /id to @userinfobot): '
    }
];

const answers = {};

function askQuestion(index) {
    if (index >= questions.length) {
        createConfig();
        return;
    }
    
    const q = questions[index];
    rl.question(q.question, (answer) => {
        answers[q.name] = answer.trim();
        askQuestion(index + 1);
    });
}

function createConfig() {
    const config = {
        botToken: answers.botToken,
        developerId: [parseInt(answers.developerId)],
        botName: "Group Master 🤖",
        maxWelcomeMessages: 10,
        spamThreshold: {
            messages: 10,
            seconds: 5,
            muteDuration: 120
        },
        contact: "https://t.me/master_spamming",
        watermark: "Group Master Bot"
    };
    
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log('\n✅ config.json file created successfully!');
    console.log('\n📦 Next steps:');
    console.log('1. Run: npm install');
    console.log('2. Run: node index.js');
    console.log('3. Send /start to your bot on Telegram');
    
    rl.close();
}

// Start asking questions
askQuestion(0);
