#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(`
╔══════════════════════════════════════════════════════════╗
║           🚀 Group Master Pro Bot Setup 🚀              ║
║                  Version 3.0.0                          ║
╚══════════════════════════════════════════════════════════╝
`);

const questions = [
    {
        name: 'botToken',
        question: '🤖 Enter your bot token (from @BotFather): ',
        required: true
    },
    {
        name: 'developerId',
        question: '👨‍💻 Enter your Telegram ID (developer): ',
        required: true
    },
    {
        name: 'ownerId',
        question: '👑 Enter owner Telegram ID: ',
        required: true
    },
    {
        name: 'botUsername',
        question: '🔗 Enter bot username (without @): ',
        required: true
    }
];

async function askQuestion(query) {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function setup() {
    const answers = {};
    
    for (const q of questions) {
        let answer = '';
        while (!answer) {
            answer = await askQuestion(q.question);
            if (q.required && !answer) {
                console.log('❌ This field is required!');
            }
        }
        answers[q.name] = answer;
    }
    
    // Create config.json
    const configTemplate = {
        bot: {
            token: answers.botToken,
            username: answers.botUsername,
            name: "Group Master Pro",
            version: "3.0.0"
        },
        developers: [parseInt(answers.developerId)],
        owners: [parseInt(answers.ownerId)],
        features: {
            welcome_system: true,
            auto_reply: true,
            moderation: true
        }
    };
    
    // Create directories
    const directories = [
        'data/responses',
        'data/moderation',
        'data/welcome',
        'data/system',
        'assets/backgrounds',
        'assets/stickers',
        'assets/fonts',
        'logs'
    ];
    
    directories.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        }
    });
    
    // Create default data files
    const defaultFiles = {
        'data/responses/commands.json': {
            start: {
                private: "🎉 Welcome to Group Master Pro Bot! 👑\n\nI'm your advanced group management assistant.\n\nUse /help to see all commands.",
                group: "👋 Hello everyone! I'm Group Master Pro Bot.\n\nI'm here to help manage this group efficiently.\n\nUse /help for commands."
            },
            help: {
                private: "📚 **Private Commands:**\n\n/start - Start the bot\n/help - Show this message\n/about - About the bot\n/contact - Contact developer\n/stats - Bot statistics\n/settings - Configure bot",
                group: "📚 **Group Commands:**\n\n/admin - Mention all admins\n/rules - Show group rules\n/report - Report a user\n/info - Group info\n/me - Your info\n/warn - Warn a user (admin)\n/mute - Mute a user (admin)"
            }
        },
        'data/moderation/bad-words.json': [
            "badword1",
            "badword2",
            "অপশব্দ1",
            "অপশব্দ2"
        ],
        'data/welcome/templates.json': {
            group: [
                "🎉 Welcome {name} to {group}! 🌟",
                "👋 Assalamualaikum {name}! Welcome to {group}! 🤗",
                "✨ Hello {name}! Glad to have you in {group}! 😊"
            ],
            private: [
                "👋 Hello {name}! I'm Group Master Pro Bot! 🤖",
                "🌟 Welcome {name}! How can I assist you today? 💫",
                "🎯 Hey {name}! Ready to manage your groups? 🚀"
            ]
        }
    };
    
    Object.entries(defaultFiles).forEach(([filePath, content]) => {
        const fullPath = path.join(__dirname, filePath);
        if (!fs.existsSync(fullPath)) {
            fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
            console.log(`✅ Created default file: ${filePath}`);
        }
    });
    
    // Write config
    fs.writeFileSync(
        path.join(__dirname, 'config.json'),
        JSON.stringify(configTemplate, null, 2)
    );
    
    console.log('\n✅ Setup completed successfully!');
    console.log('📁 Config file created: config.json');
    console.log('📁 Data directories created');
    console.log('\n🚀 To start the bot:');
    console.log('   npm install');
    console.log('   npm start');
    
    rl.close();
}

setup().catch(console.error);
