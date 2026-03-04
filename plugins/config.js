const { cmd } = require('../command');
const { getConfig, updateConfig, resetConfig, refreshConfig, getConfigKeys, validateConfigValue, defaultConfig } = require('../config');

cmd({
    pattern: "config",
    desc: "View or update bot configuration",
    category: "main",
    react: "⚙️",
    filename: __filename,
    fromMe: true  // Only bot number can use this
},
async (conn, mek, m, { from, sender, args, q, reply, isOwner, botNumber }) => {
    try {
        // IMPORTANT: Only allow bot number, not owner numbers
        const senderNumber = sender.split('@')[0];
        const botNum = botNumber.split('@')[0];
        
        if (senderNumber !== botNum) {
            return reply(`❌ *Access Denied*\n\nOnly the bot number (${botNum}) can change configuration.\nOwner numbers cannot use this command.`);
        }

        const action = args[0]?.toLowerCase();
        
        if (!action) {
            return reply(`*⚙️ CONFIGURATION MANAGER*\n\n` +
                `*Commands:*\n` +
                `• *.config view* - View all current settings\n` +
                `• *.config get <key>* - Get specific setting\n` +
                `• *.config set <key> <value>* - Update a setting\n` +
                `• *.config reset* - Reset to defaults\n` +
                `• *.config refresh* - Reload from GitHub\n` +
                `• *.config keys* - List all available keys\n\n` +
                `*Examples:*\n` +
                `*.config set MODE private*\n` +
                `*.config set AUTO_READ_STATUS false*\n` +
                `*.config set PREFIX #*`);
        }

        // Get current config for this bot number
        const currentConfig = await getConfig(senderNumber);
        
        switch (action) {
            case 'view':
            case 'show':
            case 'all':
                let configText = `*⚙️ CURRENT CONFIGURATION*\n\n` +
                    `📞 *Bot Number:* ${senderNumber}\n` +
                    `🤖 *Bot Name:* ${currentConfig.BOT_NAME}\n` +
                    `📅 *Version:* ${currentConfig.VERSION}\n\n` +
                    `*━━━━━━━━━━━━━━━━━━━━━*\n`;
                
                // Group configs by category
                const categories = {
                    '🔧 Basic': ['PREFIX', 'MODE', 'BOT_NAME'],
                    '📖 Auto Features': ['AUTO_READ_STATUS', 'AUTO_REACT_STATUS', 'AUTO_REACT_STATUS_EMOJI', 'READ_MESSAGE', 'ANTI_DELETE', 'AUTO_RECORDING'],
                    '🎨 Menu': ['MENU_TYPE', 'MENU_FONT', 'MENU_IMG_URL'],
                    '🖼️ Media': ['ALIVE_IMG', 'ALIVE_MSG', 'MEDIA_URL'],
                    '📢 Other': ['NEWS_LETTER', 'BOT_INFO']
                };
                
                for (const [catName, keys] of Object.entries(categories)) {
                    configText += `\n${catName}\n`;
                    keys.forEach(key => {
                        if (key in currentConfig) {
                            let value = currentConfig[key];
                            // Truncate long values
                            if (typeof value === 'string' && value.length > 30) {
                                value = value.substring(0, 30) + '...';
                            }
                            // Format arrays
                            if (Array.isArray(value)) {
                                value = `[${value.length} items]`;
                            }
                            configText += `  • *${key}:* ${value}\n`;
                        }
                    });
                }
                
                configText += `\n\n_Use *.config get <key>* for detailed value_`;
                return reply(configText);

            case 'get':
            case 'showkey':
                if (!args[1]) {
                    return reply(`❌ Please specify a key\nExample: *.config get MODE*`);
                }
                
                const getKey = args[1].toUpperCase();
                
                if (!(getKey in defaultConfig)) {
                    return reply(`❌ Unknown key: *${getKey}*\nUse *.config keys* to see valid keys`);
                }
                
                let getValue = currentConfig[getKey];
                let valueDisplay = getValue;
                
                // Format display based on type
                if (typeof getValue === 'boolean') {
                    valueDisplay = getValue ? '✅ true' : '❌ false';
                } else if (Array.isArray(getValue)) {
                    valueDisplay = JSON.stringify(getValue, null, 2);
                } else if (typeof getValue === 'string' && getValue.startsWith('http')) {
                    valueDisplay = getValue;
                } else if (typeof getValue === 'object') {
                    valueDisplay = JSON.stringify(getValue, null, 2);
                }
                
                const keyDescriptions = getConfigKeys();
                
                return reply(`*🔍 CONFIG VALUE*\n\n` +
                    `*Key:* ${getKey}\n` +
                    `*Type:* ${typeof getValue}\n` +
                    `*Description:* ${keyDescriptions[getKey] || 'No description'}\n\n` +
                    `*Current Value:*\n\`\`\`${valueDisplay}\`\`\`\n\n` +
                    `*Default:*\n\`\`\`${defaultConfig[getKey]}\`\`\``);

            case 'keys':
            case 'list':
                const descriptions = getConfigKeys();
                let keysText = `*📋 AVAILABLE CONFIG KEYS*\n\n`;
                
                Object.entries(descriptions).forEach(([key, desc]) => {
                    keysText += `• *${key}*\n  _${desc}_\n\n`;
                });
                
                keysText += `*Usage:* *.config set <key> <value>*`;
                return reply(keysText);

            case 'set':
            case 'update':
                if (args.length < 3) {
                    return reply(`❌ Invalid format\n\n*Usage:* .config set <key> <value>\n*Example:* .config set MODE private`);
                }
                
                const setKey = args[1].toUpperCase();
                const setValue = args.slice(2).join(' ');
                
                // Validate key exists
                if (!(setKey in defaultConfig)) {
                    return reply(`❌ Unknown key: *${setKey}*\n\nUse *.config keys* to see valid keys`);
                }
                
                // Validate and parse value
                const validation = validateConfigValue(setKey, setValue);
                
                if (!validation.valid) {
                    return reply(`❌ Invalid value for *${setKey}*\n\nError: ${validation.error}`);
                }
                
                // Special validation for specific keys
                if (setKey === 'MODE' && !['public', 'private', 'inbox', 'groups'].includes(validation.value)) {
                    return reply(`❌ Invalid MODE\n\nValid values: public, private, inbox, groups`);
                }
                
                if (setKey === 'MENU_TYPE' && !['big', 'small', 'image', 'document', 'text', 'call', 'payment'].includes(validation.value)) {
                    return reply(`❌ Invalid MENU_TYPE\n\nValid values: big, small, image, document, text, call, payment`);
                }
                
                // Update config
                const updateResult = await updateConfig(senderNumber, { [setKey]: validation.value });
                
                if (updateResult.success) {
                    // Show the updated value
                    let displayValue = validation.value;
                    if (typeof displayValue === 'boolean') {
                        displayValue = displayValue ? '✅ true' : '❌ false';
                    } else if (typeof displayValue === 'object') {
                        displayValue = JSON.stringify(displayValue);
                    }
                    
                    return reply(`✅ *CONFIGURATION UPDATED*\n\n` +
                        `*Key:* ${setKey}\n` +
                        `*New Value:* ${displayValue}\n` +
                        `*Type:* ${validation.type}\n\n` +
                        `✓ Saved to GitHub\n` +
                        `✓ Changes are active immediately`);
                } else {
                    return reply(`❌ *Update Failed*\n\nError: ${updateResult.error}`);
                }

            case 'refresh':
            case 'reload':
                const refreshedConfig = await refreshConfig(senderNumber);
                return reply(`🔄 *CONFIG REFRESHED*\n\n` +
                    `Configuration reloaded from GitHub.\n` +
                    `*Bot Name:* ${refreshedConfig.BOT_NAME}\n` +
                    `*Current Mode:* ${refreshedConfig.MODE}`);

            case 'reset':
            case 'default':
                if (!args.includes('confirm')) {
                    return reply(`⚠️ *RESET CONFIGURATION*\n\n` +
                        `This will reset ALL settings to defaults!\n\n` +
                        `To confirm, type:\n*.config reset confirm*`);
                }
                
                const resetResult = await resetConfig(senderNumber);
                
                if (resetResult.success) {
                    return reply(`✅ *CONFIGURATION RESET*\n\n` +
                        `All settings restored to default values.\n` +
                        `Changes saved to GitHub.`);
                } else {
                    return reply(`❌ *Reset Failed*\n\nError: ${resetResult.error}`);
                }

            default:
                return reply(`❌ Unknown action: *${action}*\n\nUse *.config* to see available commands`);
        }
        
    } catch (error) {
        console.error('Config command error:', error);
        reply(`❌ *Error*\n\n${error.message}\n\nPlease try again or contact support.`);
    }
});

// Quick config commands
cmd({
    pattern: "mode",
    desc: "Quickly change bot mode",
    category: "main",
    react: "🔄",
    filename: __filename,
    fromMe: true
},
async (conn, mek, m, { from, sender, args, reply, botNumber }) => {
    const senderNumber = sender.split('@')[0];
    const botNum = botNumber.split('@')[0];
    
    // Only bot number can use
    if (senderNumber !== botNum) {
        return reply(`❌ Only bot number can change mode`);
    }
    
    const mode = args[0]?.toLowerCase();
    
    if (!['public', 'private', 'inbox', 'groups'].includes(mode)) {
        return reply(`❌ Invalid mode\n\nValid modes:\n• public - Everyone can use\n• private - Only owner can use\n• inbox - Only private chats\n• groups - Only groups`);
    }
    
    const result = await updateConfig(senderNumber, { MODE: mode });
    
    if (result.success) {
        return reply(`✅ *MODE CHANGED*\n\nBot is now in *${mode}* mode\n\n*Public:* Everyone can use commands\n*Private:* Only owner can use\n*Inbox:* Only in private chats\n*Groups:* Only in groups`);
    }
    reply(`❌ Failed to change mode`);
});

cmd({
    pattern: "prefix",
    desc: "Quickly change bot prefix",
    category: "main",
    react: "⌨️",
    filename: __filename,
    fromMe: true
},
async (conn, mek, m, { from, sender, args, reply, botNumber }) => {
    const senderNumber = sender.split('@')[0];
    const botNum = botNumber.split('@')[0];
    
    if (senderNumber !== botNum) {
        return reply(`❌ Only bot number can change prefix`);
    }
    
    const newPrefix = args[0];
    
    if (!newPrefix || newPrefix.length > 3) {
        return reply(`❌ Please provide a valid prefix (1-3 characters)\n\nExample: .prefix #`);
    }
    
    const result = await updateConfig(senderNumber, { PREFIX: newPrefix });
    
    if (result.success) {
        return reply(`✅ *PREFIX CHANGED*\n\nNew prefix is: *${newPrefix}*\n\nExample: ${newPrefix}menu`);
    }
    reply(`❌ Failed to change prefix`);
});

cmd({
    pattern: "anticall",
    desc: "Toggle anti-call feature",
    category: "main",
    react: "📵",
    filename: __filename,
    fromMe: true
},
async (conn, mek, m, { from, sender, reply, botNumber }) => {
    const senderNumber = sender.split('@')[0];
    const botNum = botNumber.split('@')[0];
    
    if (senderNumber !== botNum) {
        return reply(`❌ Only bot number can use this`);
    }
    
    const current = await getConfig(senderNumber);
    const newValue = current.ANTI_DELETE === "true" ? "false" : "true";
    
    const result = await updateConfig(senderNumber, { ANTI_DELETE: newValue });
    
    if (result.success) {
        return reply(`✅ *ANTI-DELETE ${newValue === "true" ? 'ENABLED' : 'DISABLED'}*\n\nDeleted messages will ${newValue === "true" ? 'now be recovered' : 'not be recovered'}`);
    }
    reply(`❌ Failed to update`);
});
