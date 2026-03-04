const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

// Base config object - this is the fallback
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

// Default number for direct config access (will use baseConfig)
let defaultNumber = null;

// Set default number for this instance
function setDefaultNumber(number) {
    defaultNumber = number ? number.replace(/[^0-9]/g, '') : null;
}

// Get current number (from context or default)
function getCurrentNumber() {
    // Try to get from global context if set by index.js
    if (global.currentBotNumber) {
        return global.currentBotNumber;
    }
    return defaultNumber;
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

// Get config synchronously (for non-async contexts)
function getConfigSync(number) {
    const sanitizedNumber = number ? number.replace(/[^0-9]/g, '') : getCurrentNumber();
    
    if (!sanitizedNumber) {
        return { ...baseConfig };
    }
    
    if (userConfigs.has(sanitizedNumber)) {
        return userConfigs.get(sanitizedNumber);
    }
    
    // Try local cache file
    try {
        const localPath = `./sessions/config_${sanitizedNumber}.json`;
        if (fs.existsSync(localPath)) {
            const content = fs.readFileSync(localPath, 'utf8');
            const userConfig = { ...baseConfig, ...JSON.parse(content) };
            userConfigs.set(sanitizedNumber, userConfig);
            return userConfig;
        }
    } catch (e) {
        // Ignore errors
    }
    
    return { ...baseConfig };
}

// Update config for specific number (with GitHub integration)
async function updateConfig(number, newConfig) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    // Merge with existing config
    const currentConfig = await getConfig(sanitizedNumber);
    const updatedConfig = { ...currentConfig, ...newConfig };
    
    // Update cache
    userConfigs.set(sanitizedNumber, updatedConfig);
    
    // Save locally first
    try {
        const configPath = `./sessions/config_${sanitizedNumber}.json`;
        const dir = './sessions';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
    } catch (localError) {
        console.error('❌ Failed to save config locally:', localError);
    }
    
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
        
        console.log(`✅ Config updated on GitHub for ${sanitizedNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to save config to GitHub:', error);
        return true; // Still return true since we saved locally
    }
}

// Reset config to default
async function resetConfig(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    userConfigs.delete(sanitizedNumber);
    
    // Delete local file
    try {
        const localPath = `./sessions/config_${sanitizedNumber}.json`;
        if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
        }
    } catch (e) {
        // Ignore
    }
    
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

// Create a dynamic config proxy that always gets fresh values
function createDynamicConfig(number) {
    const configObj = {};
    
    // Create getters for all baseConfig keys
    for (const key of Object.keys(baseConfig)) {
        Object.defineProperty(configObj, key, {
            get: function() {
                const currentNumber = number || getCurrentNumber();
                if (currentNumber) {
                    const cfg = getConfigSync(currentNumber);
                    return cfg[key];
                }
                return baseConfig[key];
            },
            enumerable: true,
            configurable: true
        });
    }
    
    return configObj;
}

// Main dynamic config object
const dynamicConfig = createDynamicConfig();

// Also add the functions
dynamicConfig.getConfig = getConfig;
dynamicConfig.updateConfig = updateConfig;
dynamicConfig.resetConfig = resetConfig;
dynamicConfig.setDefaultNumber = setDefaultNumber;
dynamicConfig.getConfigSync = getConfigSync;
dynamicConfig.baseConfig = baseConfig;

module.exports = dynamicConfig;
