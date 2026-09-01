const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatTimestamp() {
        return new Date().toISOString();
    }

    formatMessage(level, message, ...args) {
        const timestamp = this.formatTimestamp();
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' ') : '';
        
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
    }

    writeToFile(level, formattedMessage) {
        try {
            const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
            fs.appendFileSync(logFile, formattedMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    log(level, message, ...args) {
        const formattedMessage = this.formatMessage(level, message, ...args);
        
        const colors = {
            info: '\x1b[36m',
            warn: '\x1b[33m',
            error: '\x1b[31m',
            debug: '\x1b[90m',
            reset: '\x1b[0m'
        };

        console.log(`${colors[level] || ''}${formattedMessage}${colors.reset}`);
        this.writeToFile(level, formattedMessage);
    }

    info(message, ...args) {
        this.log('info', message, ...args);
    }

    warn(message, ...args) {
        this.log('warn', message, ...args);
    }

    error(message, ...args) {
        this.log('error', message, ...args);
    }

    debug(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            this.log('debug', message, ...args);
        }
    }
}

module.exports = new Logger();