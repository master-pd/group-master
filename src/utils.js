import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import moment from 'moment';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));

// Logger
export class Logger {
    constructor() {
        this.logFile = config.logging?.file || 'bot.log';
        this.logDir = path.join(__dirname, '..', 'logs');
        
        // Ensure log directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }
    
    log(level, message, data = {}) {
        const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        // Console output
        const colors = {
            info: '\x1b[36m',  // Cyan
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m', // Red
            debug: '\x1b[35m', // Magenta
            success: '\x1b[32m' // Green
        };
        
        const color = colors[level] || '\x1b[0m';
        console.log(`${color}${logEntry}\x1b[0m`);
        
        if (data && Object.keys(data).length > 0) {
            console.log('  Data:', data);
        }
        
        // File logging
        const logPath = path.join(this.logDir, this.logFile);
        fs.appendFileSync(logPath, logEntry + '\n');
        
        if (data && Object.keys(data).length > 0) {
            fs.appendFileSync(logPath, '  Data: ' + JSON.stringify(data) + '\n');
        }
    }
    
    info(message, data = {}) {
        this.log('info', message, data);
    }
    
    warn(message, data = {}) {
        this.log('warn', message, data);
    }
    
    error(message, data = {}) {
        this.log('error', message, data);
    }
    
    debug(message, data = {}) {
        this.log('debug', message, data);
    }
    
    success(message, data = {}) {
        this.log('success', message, data);
    }
}

export const logger = new Logger();

// Helper functions
export class Helpers {
    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    static generateId(length = 16) {
        return crypto.randomBytes(length).toString('hex');
    }
    
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    static formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    
    static escapeMarkdown(text) {
        const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
        let escaped = text;
        
        specialChars.forEach(char => {
            const regex = new RegExp(`\\${char}`, 'g');
            escaped = escaped.replace(regex, `\\${char}`);
        });
        
        return escaped;
    }
    
    static parseTime(timeStr) {
        const regex = /(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hour|hours|d|day|days|w|week|weeks)/gi;
        const matches = [...timeStr.matchAll(regex)];
        
        let totalSeconds = 0;
        
        for (const match of matches) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            
            switch (unit) {
                case 's':
                case 'sec':
                case 'second':
                case 'seconds':
                    totalSeconds += value;
                    break;
                case 'm':
                case 'min':
                case 'minute':
                case 'minutes':
                    totalSeconds += value * 60;
                    break;
                case 'h':
                case 'hour':
                case 'hours':
                    totalSeconds += value * 3600;
                    break;
                case 'd':
                case 'day':
                case 'days':
                    totalSeconds += value * 86400;
                    break;
                case 'w':
                case 'week':
                case 'weeks':
                    totalSeconds += value * 604800;
                    break;
            }
        }
        
        return totalSeconds;
    }
    
    static formatTime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        const parts = [];
        
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        
        return parts.join(' ');
    }
    
    static getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    static async downloadFile(url, filePath) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));
        return filePath;
    }
    
    static isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    static extractUrls(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.match(urlRegex) || [];
    }
    
    static extractMentions(text) {
        const mentionRegex = /@(\w+)/g;
        return text.match(mentionRegex) || [];
    }
    
    static extractHashtags(text) {
        const hashtagRegex = /#(\w+)/g;
        return text.match(hashtagRegex) || [];
    }
    
    static cleanHtml(text) {
        return text
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
    }
    
    static truncateText(text, maxLength = 100, suffix = '...') {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    }
    
    static countWords(text) {
        return text.trim().split(/\s+/).length;
    }
    
    static countCharacters(text) {
        return text.length;
    }
    
    static generatePassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        
        return password;
    }
    
    static getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }
    
    static getMimeType(filename) {
        const ext = this.getFileExtension(filename).toLowerCase();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'json': 'application/json',
            'mp3': 'audio/mpeg',
            'mp4': 'video/mp4'
        };
        
        return mimeTypes[ext] || 'application/octet-stream';
    }
    
    static async fileExists(filePath) {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    static createDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    
    static readJsonFile(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading JSON file ${filePath}:`, error);
            return null;
        }
    }
    
    static writeJsonFile(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`Error writing JSON file ${filePath}:`, error);
            return false;
        }
    }
    
    static getTimestamp() {
        return Date.now();
    }
    
    static getDateString(format = 'YYYY-MM-DD HH:mm:ss') {
        return moment().format(format);
    }
    
    static isToday(date) {
        return moment(date).isSame(moment(), 'day');
    }
    
    static isThisWeek(date) {
        return moment(date).isSame(moment(), 'week');
    }
    
    static isThisMonth(date) {
        return moment(date).isSame(moment(), 'month');
    }
    
    static differenceInDays(date1, date2) {
        return moment(date2).diff(moment(date1), 'days');
    }
    
    static async retry(fn, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
                }
            }
        }
        
        throw lastError;
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Image generator
export class ImageGenerator {
    static async generateWelcomeImage(user, group = null) {
        // In production, use canvas to generate images
        // This is a simplified version
        try {
            const { createCanvas, loadImage, registerFont } = await import('canvas');
            
            const width = 1200;
            const height = 600;
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');
            
            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            
            // Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Welcome!', width / 2, 150);
            
            ctx.font = 'bold 64px Arial';
            ctx.fillText(user.first_name, width / 2, 250);
            
            if (group) {
                ctx.font = '36px Arial';
                ctx.fillText(`to ${group.title}`, width / 2, 350);
            }
            
            ctx.font = '24px Arial';
            ctx.fillText(moment().format('DD MMMM YYYY'), width / 2, 450);
            
            ctx.font = '20px Arial';
            ctx.fillText('Group Master Pro Bot • Created by MAR-PD', width / 2, 550);
            
            return canvas.toBuffer();
        } catch (error) {
            console.error('Error generating image:', error);
            return null;
        }
    }
}

// Validator
export class Validator {
    static isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    
    static isValidPhone(phone) {
        const regex = /^[\+]?[1-9][\d]{0,15}$/;
        return regex.test(phone);
    }
    
    static isValidUsername(username) {
        const regex = /^[a-zA-Z0-9_]{5,32}$/;
        return regex.test(username);
    }
    
    static isStrongPassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return regex.test(password);
    }
}

// Formatter
export class Formatter {
    static formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }
    
    static formatPercentage(value, decimals = 2) {
        return `${value.toFixed(decimals)}%`;
    }
    
    static formatDuration(seconds) {
        return Helpers.formatTime(seconds);
    }
    
    static formatFileSize(bytes) {
        return Helpers.formatBytes(bytes);
    }
    
    static formatList(items, separator = ', ') {
        return items.join(separator);
    }
}

// Security
export class Security {
    static encrypt(text, key) {
        const cipher = crypto.createCipher('aes-256-cbc', key);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }
    
    static decrypt(encrypted, key) {
        const decipher = crypto.createDecipher('aes-256-cbc', key);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    
    static hash(text, algorithm = 'sha256') {
        return crypto.createHash(algorithm).update(text).digest('hex');
    }
    
    static generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
    
    static generateApiKey() {
        return `gm_${crypto.randomBytes(16).toString('hex')}`;
    }
    
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
}
