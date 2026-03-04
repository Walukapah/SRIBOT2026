const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

// Base config object
const baseConfig = {
    SESSION_ID: process.env.SESSION_ID,
    PREFIX: process.env.PREFIX || ".",
    BOT_NAME: process.env.BOT_NAME || "SRI-BOT 🇱🇰",
    BOT_INFO: process.env.BOT_INFO || "SRI-BOT🇱🇰;WALUKA👊;https://i.imgur.com/r3GZeiX.jpeg",
    OWNER_NUMBER: process.env.OWNER_NUMBER || ["94728115797"],
    ALIVE_IMG: process.env.ALIVE_IMG || "https://telegra.ph/file/ad25b2227fa2a1a01b707.jpg",
    ALIVE_MSG: process.env.ALIVE_MSG || "iyoo whats up 💫",
    MENU_IMG_URL: process.env.MENU_IMG_URL || "https://images.weserv.nl/?url=i.imgur.com/W2CaVZW.jpeg",
    MENU_TYPE: process.env.MENU_TYPE || "big",
    MENU_FONT: process.env.MENU_FONT || "tiny",
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "true",
    AUTO_REACT_STATUS: process.env.AUTO_REACT_STATUS || "true",
    AUTO_REACT_STATUS_EMOJI: process.env.AUTO_REACT_STATUS_EMOJI || "❤️",
    NEWS_LETTER: process.env.NEWS_LETTER || "120363165918432989@newsletter",
    MODE: process.env.MODE || "public",
    VERSION: process.env.VERSION || "1.0.0",
    MEDIA_URL: process.env.MEDIA_URL || "https://whatsapp.com/channel/0029VaAPzWX0G0XdhMbtRI2i",
    AUTO_RECORDING: process.env.AUTO_RECORDING || "false",
    ANTI_DELETE: process.env.ANTI_DELETE || "true",
    READ_MESSAGE: process.env.READ_MESSAGE || "true"
};

// User-specific configs storage (in memory)
const userConfigs = new Map();
// Store current active number for context
let currentActiveNumber = null;

// Set current active number (call this when message received)
function setCurrentNumber(number) {
    currentActiveNumber = number ? number.replace(/[^0-9]/g, '') : null;
}

// Get current active number
function getCurrentNumber() {
    return currentActiveNumber;
}

// Get config for specific number (with GitHub integration)
async function getConfig(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    // Check if we have cached config
    if (userConfigs.has(sanitizedNumber)) {
        return userConfigs.get(sanitizedNumber);
    }
    
    // Try to load from GitHub
    try {
        const { Octokit } = require('@octokit/rest');
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const owner = process.env.GITHUB_REPO_OWNER || 'Walukapah';
        const repo = process.env.GITHUB_REPO_NAME || 'SRI-DATABASE';
        
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: `sessions/config_${sanitizedNumber}.json`
        });
        
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        const userConfig = { ...baseConfig, ...JSON.parse(content) };
        userConfigs.set(sanitizedNumber, userConfig);
        return userConfig;
    } catch (error) {
        // If not found on GitHub, use base config
        const userConfig = { ...baseConfig };
        userConfigs.set(sanitizedNumber, userConfig);
        return userConfig;
    }
}

// Update config for specific number (with GitHub integration)
async function updateConfig(number, newConfig) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    // Merge with existing config
    const currentConfig = await getConfig(sanitizedNumber);
    const updatedConfig = { ...currentConfig, ...newConfig };
    
    // Update cache
    userConfigs.set(sanitizedNumber, updatedConfig);
    
    // Save to GitHub
    try {
        const { Octokit } = require('@octokit/rest');
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const owner = process.env.GITHUB_REPO_OWNER || 'Walukapah';
        const repo = process.env.GITHUB_REPO_NAME || 'SRI-DATABASE';
        
        const pathToFile = `sessions/config_${sanitizedNumber}.json`;
        let sha = null;
        
        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: pathToFile,
            });
            sha = data.sha;
        } catch (err) {
            if (err.status !== 404) throw err;
        }
        
        const contentEncoded = Buffer.from(JSON.stringify(updatedConfig, null, 2)).toString('base64');
        
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: pathToFile,
            message: `Update config for ${sanitizedNumber}`,
            content: contentEncoded,
            sha: sha || undefined,
        });
        
        console.log(`Config updated on GitHub for ${sanitizedNumber}`);
        return true;
    } catch (error) {
        console.error('Failed to save config to GitHub:', error);
        
        // Fallback to local file
        try {
            const configPath = `./sessions/config_${sanitizedNumber}.json`;
            const dir = './sessions';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
            return true;
        } catch (localError) {
            console.error('Failed to save config locally:', localError);
            return false;
        }
    }
}

// Reset config to default
async function resetConfig(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    userConfigs.delete(sanitizedNumber);
    
    // Delete from GitHub
    try {
        const { Octokit } = require('@octokit/rest');
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const owner = process.env.GITHUB_REPO_OWNER || 'Walukapah';
        const repo = process.env.GITHUB_REPO_NAME || 'SRI-DATABASE';
        
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: `sessions/config_${sanitizedNumber}.json`
        });
        
        await octokit.repos.deleteFile({
            owner,
            repo,
            path: `sessions/config_${sanitizedNumber}.json`,
            message: `Reset config for ${sanitizedNumber}`,
            sha: data.sha
        });
        
        return true;
    } catch (error) {
        // File might not exist
        return true;
    }
}

// Create a Proxy that returns user-specific config based on current context
const configProxy = new Proxy({}, {
    get(target, prop) {
        // If we have a current active number, try to get user-specific config
        if (currentActiveNumber && userConfigs.has(currentActiveNumber)) {
            const userConfig = userConfigs.get(currentActiveNumber);
            if (userConfig[prop] !== undefined) {
                return userConfig[prop];
            }
        }
        // Fallback to base config
        return baseConfig[prop];
    },
    set(target, prop, value) {
        // Update the user-specific config if we have an active number
        if (currentActiveNumber) {
            const currentConfig = userConfigs.get(currentActiveNumber) || { ...baseConfig };
            currentConfig[prop] = value;
            userConfigs.set(currentActiveNumber, currentConfig);
        }
        return true;
    }
});

module.exports = {
    // Export the proxy as default config - this is what plugins will use
    ...configProxy,
    
    // Also export base config for reference
    baseConfig,
    
    // Export functions
    getConfig,
    updateConfig,
    resetConfig,
    setCurrentNumber,
    getCurrentNumber
};
