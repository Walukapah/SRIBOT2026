const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

// Default configuration template
const defaultConfig = {
    SESSION_ID: process.env.SESSION_ID || '',
    PREFIX: process.env.PREFIX || ".",
    BOT_NAME: process.env.BOT_NAME || "SRI-BOT 🇱🇰",
    BOT_INFO: process.env.BOT_INFO || "SRI-BOT🇱🇰;WALUKA👊;https://i.imgur.com/r3GZeiX.jpeg",
    OWNER_NUMBER: process.env.OWNER_NUMBER ? JSON.parse(process.env.OWNER_NUMBER) : ["94728115797"],
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
    READ_MESSAGE: process.env.READ_MESSAGE || "true",
    DELETEMSGSENDTO: process.env.DELETEMSGSENDTO || ''
};

// Cache for user configs
const userConfigs = new Map();

// Get GitHub Octokit instance
function getOctokit() {
    const { Octokit } = require('@octokit/rest');
    return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

// Get GitHub repo details
function getRepoDetails() {
    return {
        owner: process.env.GITHUB_REPO_OWNER || 'Walukapah',
        repo: process.env.GITHUB_REPO_NAME || 'SRI-DATABASE'
    };
}

// Initialize config for a number (create if not exists)
async function initConfig(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const configPath = `sessions/config_${sanitizedNumber}.json`;
    
    try {
        const octokit = getOctokit();
        const { owner, repo } = getRepoDetails();
        
        // Try to get existing config from GitHub
        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: configPath
            });
            
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            const parsedConfig = JSON.parse(content);
            
            // Merge with defaults to ensure all keys exist
            const mergedConfig = { ...defaultConfig, ...parsedConfig };
            
            // Save to cache
            userConfigs.set(sanitizedNumber, mergedConfig);
            
            // Update GitHub with merged config (in case new keys were added)
            await saveConfigToGitHub(sanitizedNumber, mergedConfig);
            
            return mergedConfig;
        } catch (error) {
            if (error.status === 404) {
                // Config doesn't exist, create new with defaults
                await saveConfigToGitHub(sanitizedNumber, defaultConfig);
                userConfigs.set(sanitizedNumber, { ...defaultConfig });
                return { ...defaultConfig };
            }
            throw error;
        }
    } catch (error) {
        console.error(`Failed to init config for ${sanitizedNumber}:`, error);
        
        // Fallback to local file
        const localPath = `./${configPath}`;
        const dir = './sessions';
        
        try {
            if (fs.existsSync(localPath)) {
                const content = fs.readFileSync(localPath, 'utf8');
                const parsedConfig = JSON.parse(content);
                const mergedConfig = { ...defaultConfig, ...parsedConfig };
                userConfigs.set(sanitizedNumber, mergedConfig);
                return mergedConfig;
            } else {
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(localPath, JSON.stringify(defaultConfig, null, 2));
                userConfigs.set(sanitizedNumber, { ...defaultConfig });
                return { ...defaultConfig };
            }
        } catch (localError) {
            console.error('Local config fallback failed:', localError);
            return { ...defaultConfig };
        }
    }
}

// Get config for a number
async function getConfig(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    // Return from cache if available
    if (userConfigs.has(sanitizedNumber)) {
        return userConfigs.get(sanitizedNumber);
    }
    
    // Initialize and return
    return await initConfig(sanitizedNumber);
}

// Force refresh config from GitHub
async function refreshConfig(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    userConfigs.delete(sanitizedNumber); // Clear cache
    return await getConfig(sanitizedNumber); // Reload from GitHub
}

// Save config to GitHub
async function saveConfigToGitHub(number, configData) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const configPath = `sessions/config_${sanitizedNumber}.json`;
    
    try {
        const octokit = getOctokit();
        const { owner, repo } = getRepoDetails();
        
        let sha = null;
        
        // Check if file exists
        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: configPath
            });
            sha = data.sha;
        } catch (err) {
            if (err.status !== 404) throw err;
        }
        
        const contentEncoded = Buffer.from(JSON.stringify(configData, null, 2)).toString('base64');
        
        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: configPath,
            message: `Update config for ${sanitizedNumber} - ${new Date().toISOString()}`,
            content: contentEncoded,
            sha: sha || undefined
        });
        
        console.log(`✅ Config saved to GitHub for ${sanitizedNumber}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to save config to GitHub:', error);
        
        // Fallback to local
        try {
            const localPath = `./${configPath}`;
            const dir = './sessions';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(localPath, JSON.stringify(configData, null, 2));
            console.log(`✅ Config saved locally for ${sanitizedNumber}`);
            return true;
        } catch (localError) {
            console.error('❌ Local save also failed:', localError);
            return false;
        }
    }
}

// Update specific key(s) in config
async function updateConfig(number, updates) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    try {
        // Get current config
        const currentConfig = await getConfig(sanitizedNumber);
        
        // Apply updates
        const updatedConfig = { ...currentConfig };
        
        for (const [key, value] of Object.entries(updates)) {
            // Only update if key exists in default config (prevent arbitrary keys)
            if (key in defaultConfig) {
                updatedConfig[key] = value;
            } else {
                console.warn(`⚠️ Ignoring unknown config key: ${key}`);
            }
        }
        
        // Save to GitHub
        const saved = await saveConfigToGitHub(sanitizedNumber, updatedConfig);
        
        if (saved) {
            // Update cache
            userConfigs.set(sanitizedNumber, updatedConfig);
            return { success: true, config: updatedConfig };
        } else {
            return { success: false, error: 'Failed to save config' };
        }
    } catch (error) {
        console.error('Update config error:', error);
        return { success: false, error: error.message };
    }
}

// Reset config to defaults
async function resetConfig(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    try {
        // Save defaults to GitHub
        await saveConfigToGitHub(sanitizedNumber, defaultConfig);
        
        // Update cache
        userConfigs.set(sanitizedNumber, { ...defaultConfig });
        
        return { success: true, config: defaultConfig };
    } catch (error) {
        console.error('Reset config error:', error);
        return { success: false, error: error.message };
    }
}

// Get specific config value
async function getConfigValue(number, key) {
    const config = await getConfig(number);
    return config[key];
}

// Validate config value type
function validateConfigValue(key, value) {
    const defaultValue = defaultConfig[key];
    const defaultType = typeof defaultValue;
    
    // Handle arrays
    if (Array.isArray(defaultValue)) {
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            return { valid: Array.isArray(parsed), value: parsed, type: 'array' };
        } catch {
            return { valid: false, error: 'Invalid array format' };
        }
    }
    
    // Handle booleans (accept string "true"/"false" or actual boolean)
    if (defaultType === 'boolean') {
        if (typeof value === 'boolean') return { valid: true, value, type: 'boolean' };
        if (value === 'true') return { valid: true, value: true, type: 'boolean' };
        if (value === 'false') return { valid: true, value: false, type: 'boolean' };
        return { valid: false, error: 'Must be true or false' };
    }
    
    // Handle numbers
    if (defaultType === 'number') {
        const num = Number(value);
        if (!isNaN(num)) return { valid: true, value: num, type: 'number' };
        return { valid: false, error: 'Must be a number' };
    }
    
    // Handle strings (default)
    return { valid: true, value: String(value), type: 'string' };
}

// Get all available config keys with descriptions
function getConfigKeys() {
    return {
        PREFIX: 'Bot command prefix (default: .)',
        BOT_NAME: 'Bot display name',
        AUTO_READ_STATUS: 'Auto read status updates (true/false)',
        AUTO_REACT_STATUS: 'Auto react to statuses (true/false)',
        AUTO_REACT_STATUS_EMOJI: 'Emoji to use for auto reactions',
        MODE: 'Bot mode: public/private/inbox/groups',
        MENU_TYPE: 'Menu style: big/small/image/document/text',
        MENU_FONT: 'Menu font style',
        ANTI_DELETE: 'Anti-delete message feature (true/false)',
        READ_MESSAGE: 'Auto read messages (true/false)',
        AUTO_RECORDING: 'Auto recording mode (true/false)',
        ALIVE_IMG: 'Alive message image URL',
        ALIVE_MSG: 'Alive message text',
        MENU_IMG_URL: 'Menu image URL',
        NEWS_LETTER: 'Newsletter JID',
        MEDIA_URL: 'Media/channel URL'
    };
}

// IMPORTANT: Export everything needed
module.exports = {
    // Spread default config so direct access works (config.PREFIX)
    ...defaultConfig,
    // Named exports for functions
    defaultConfig,
    getConfig,
    updateConfig,
    resetConfig,
    refreshConfig,
    getConfigValue,
    validateConfigValue,
    getConfigKeys,
    initConfig
};
