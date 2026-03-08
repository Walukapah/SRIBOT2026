const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

// Base config object - this is the fallback
const baseConfig = {
    PREFIX: process.env.PREFIX || ".",
    BOT_NAME: process.env.BOT_NAME || "SRI-BOT 🇱🇰",
    BOT_INFO: process.env.BOT_INFO || "SRI-BOT🇱🇰;WALUKA👊;https://i.imgur.com/r3GZeiX.jpeg",
    // FIXED: Ensure OWNER_NUMBER is always an array
    OWNER_NUMBER: process.env.OWNER_NUMBER 
        ? (typeof process.env.OWNER_NUMBER === 'string' 
            ? process.env.OWNER_NUMBER.split(',').map(n => n.trim().replace(/[^0-9]/g, '')) 
            : process.env.OWNER_NUMBER)
        : ["94753670175"],
    ALIVE_IMG: process.env.ALIVE_IMG || "https://i.ibb.co/YT2TN2vr/Picsart-25-06-07-13-04-26-190.jpg",
    ALIVE_MSG: process.env.ALIVE_MSG || "iyoo whats up 💫",
    MENU_IMG_URL: process.env.MENU_IMG_URL || "https://i.ibb.co/39ZGzmvy/3f3f9ebb848e.png",
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "true",
    AUTO_REACT_STATUS: process.env.AUTO_REACT_STATUS || "true",
    AUTO_REACT_STATUS_EMOJI: process.env.AUTO_REACT_STATUS_EMOJI || "❤️",
    NEWS_LETTER: process.env.NEWS_LETTER || "120363165918432989@newsletter",
    MODE: process.env.MODE || "public",
    VERSION: process.env.VERSION || "1.0.0",
    MEDIA_URL: process.env.MEDIA_URL || "https://whatsapp.com/channel/0029VaAPzWX0G0XdhMbtRI2i",
    AUTO_RECORDING: process.env.AUTO_RECORDING || "false",
    ANTI_DELETE: process.env.ANTI_DELETE || "true",
    READ_MESSAGE: process.env.READ_MESSAGE || "true",
    // NEW: MESSAGE_TYPE - "text" or "button"
    MESSAGE_TYPE: process.env.MESSAGE_TYPE || "button"
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
    if (global.currentBotNumber) {
        return global.currentBotNumber;
    }
    return defaultNumber;
}

// Load config from local file synchronously (for startup)
function loadLocalConfigSync(number) {
    try {
        const localPath = `./sessions/config_${number}.json`;
        if (fs.existsSync(localPath)) {
            const content = fs.readFileSync(localPath, 'utf8');
            return JSON.parse(content);
        }
    } catch (e) {
        console.error('Error loading local config:', e);
    }
    return null;
}

// Helper function to ensure OWNER_NUMBER is always an array
function ensureOwnerNumberArray(config) {
    if (config.OWNER_NUMBER && !Array.isArray(config.OWNER_NUMBER)) {
        config.OWNER_NUMBER = typeof config.OWNER_NUMBER === 'string' 
            ? config.OWNER_NUMBER.split(',').map(n => n.trim().replace(/[^0-9]/g, ''))
            : [config.OWNER_NUMBER];
    }
    return config;
}

// Get config for specific number (with GitHub integration)
async function getConfig(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    // Check if we have cached config
    if (userConfigs.has(sanitizedNumber)) {
        return ensureOwnerNumberArray(userConfigs.get(sanitizedNumber));
    }
    
    // Try to load from local file first (faster)
    const localConfig = loadLocalConfigSync(sanitizedNumber);
    if (localConfig) {
        const fixedConfig = ensureOwnerNumberArray({ ...baseConfig, ...localConfig });
        userConfigs.set(sanitizedNumber, fixedConfig);
        return fixedConfig;
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
        const userConfig = ensureOwnerNumberArray({ ...baseConfig, ...JSON.parse(content) });
        userConfigs.set(sanitizedNumber, userConfig);
        
        // Save to local file for faster access next time
        try {
            const dir = './sessions';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(`./sessions/config_${sanitizedNumber}.json`, JSON.stringify(userConfig, null, 2));
        } catch (e) {
            // Ignore local save errors
        }
        
        return userConfig;
    } catch (error) {
        // If not found on GitHub, use base config
        const userConfig = ensureOwnerNumberArray({ ...baseConfig });
        userConfigs.set(sanitizedNumber, userConfig);
        return userConfig;
    }
}

// Get config synchronously (for non-async contexts) - ALWAYS checks local file first
function getConfigSync(number) {
    const sanitizedNumber = number ? number.replace(/[^0-9]/g, '') : getCurrentNumber();
    
    if (!sanitizedNumber) {
        return ensureOwnerNumberArray({ ...baseConfig });
    }
    
    // Always check memory cache first
    if (userConfigs.has(sanitizedNumber)) {
        return ensureOwnerNumberArray(userConfigs.get(sanitizedNumber));
    }
    
    // Then check local file (CRITICAL for Koyeb startup)
    const localConfig = loadLocalConfigSync(sanitizedNumber);
    if (localConfig) {
        const fixedConfig = ensureOwnerNumberArray({ ...baseConfig, ...localConfig });
        userConfigs.set(sanitizedNumber, fixedConfig);
        return fixedConfig;
    }
    
    // Return base config if nothing found
    const userConfig = ensureOwnerNumberArray({ ...baseConfig });
    userConfigs.set(sanitizedNumber, userConfig);
    return userConfig;
}

// Force reload config from storage (useful after config changes)
function reloadConfig(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    userConfigs.delete(sanitizedNumber); // Clear from cache
    return getConfigSync(sanitizedNumber); // Reload from file
}

// Update config for specific number (with GitHub integration)
async function updateConfig(number, newConfig) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    // Merge with existing config
    const currentConfig = await getConfig(sanitizedNumber);
    const updatedConfig = { ...currentConfig, ...newConfig };
    
    // FIXED: Ensure OWNER_NUMBER remains array after update
    ensureOwnerNumberArray(updatedConfig);
    
    // Update cache immediately
    userConfigs.set(sanitizedNumber, updatedConfig);
    
    // Save locally first
    try {
        const configPath = `./sessions/config_${sanitizedNumber}.json`;
        const dir = './sessions';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
        console.log(`[CONFIG] Config saved locally for ${sanitizedNumber}`);
    } catch (localError) {
        console.error('[CONFIG] Failed to save config locally:', localError);
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
        
        console.log(`[CONFIG] Config updated on GitHub for ${sanitizedNumber}`);
        return true;
    } catch (error) {
        console.error('[CONFIG] Failed to save config to GitHub:', error);
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

// Initialize config for a number at startup (call this before using config)
async function initializeConfig(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    // First try to load from local file
    const localConfig = loadLocalConfigSync(sanitizedNumber);
    if (localConfig) {
        const fixedConfig = ensureOwnerNumberArray(localConfig);
        userConfigs.set(sanitizedNumber, fixedConfig);
        console.log(`[CONFIG] Config loaded from local file for ${sanitizedNumber}`);
        return fixedConfig;
    }
    
    // If no local file, try to fetch from GitHub
    try {
        const config = await getConfig(sanitizedNumber);
        console.log(`[CONFIG] Config loaded from GitHub for ${sanitizedNumber}`);
        return config;
    } catch (error) {
        console.log(`[CONFIG] Using base config for ${sanitizedNumber}`);
        const baseCfg = ensureOwnerNumberArray({ ...baseConfig });
        userConfigs.set(sanitizedNumber, baseCfg);
        return baseCfg;
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
dynamicConfig.initializeConfig = initializeConfig;
dynamicConfig.reloadConfig = reloadConfig;
dynamicConfig.baseConfig = baseConfig;

module.exports = dynamicConfig;
