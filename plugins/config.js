const { cmd } = require('../command');
const { getConfig, updateConfig, resetConfig, baseConfig } = require('../config');

cmd({
    pattern: "config",
    desc: "View or update bot configuration. Usage: .config view | .config set <key> <value> | .config reset",
    category: "owner",
    react: "⚙️",
    filename: __filename,
    fromMe: true  // Only bot owner can use this
},
async (conn, mek, m, { from, sender, args, q, reply, isMe }) => {
    try {
        const senderNumber = sender.split('@')[0];
        const botNumber = conn.user.id.split(':')[0];
        
        // STRICT CHECK: Only allow if sender is the bot itself (fromMe check)
        if (!isMe) {
            return reply(`❌ *Access Denied*\n\nThis command can only be used by the bot number itself.\nYou cannot use this command from another number.`);
        }
        
        const action = args[0]?.toLowerCase();
        
        if (!action) {
            return reply(`*⚙️ CONFIG COMMAND*\n\n` +
                `Usage:\n` +
                `• *.config view* - View current config\n` +
                `• *.config set <key> <value>* - Update a setting\n` +
                `• *.config reset* - Reset to defaults\n` +
                `• *.config list* - List all available keys\n\n` +
                `Example:\n` +
                `*.config set MESSAGE_TYPE text*\n` +
                `*.config set MESSAGE_TYPE button*`);
        }
        
        // Get current config for this bot number
        const currentConfig = await getConfig(botNumber);
        
        switch (action) {
            case 'view':
            case 'show':
                let configText = `*⚙️ CURRENT CONFIGURATION*\n\n` +
                    `📞 Bot Number: ${botNumber}\n` +
                    `🤖 Bot: ${currentConfig.BOT_NAME}\n\n`;
                
                // Show important configs
                const importantKeys = [
                    'PREFIX', 'MODE', 'BOT_NAME', 'AUTO_READ_STATUS', 'AUTO_REACT_STATUS',
                    'AUTO_REACT_STATUS_EMOJI', 'ANTI_DELETE', 'READ_MESSAGE',
                    'MESSAGE_TYPE', 'AUTO_RECORDING'
                ];
                
                importantKeys.forEach(key => {
                    configText += `• *${key}*: ${currentConfig[key]}\n`;
                });
                
                configText += `\n_Use *.config list* to see all keys_`;
                return reply(configText);
                
            case 'list':
                let listText = `*📋 AVAILABLE CONFIG KEYS*\n\n`;
                Object.keys(baseConfig).forEach(key => {
                    if (typeof baseConfig[key] !== 'function') {
                        listText += `• ${key}\n`;
                    }
                });
                listText += `\nUse: *.config set <key> <value>*`;
                return reply(listText);
                
            case 'set':
            case 'update':
                if (args.length < 3) {
                    return reply(`❌ Please provide key and value\nExample: *.config set MESSAGE_TYPE text*`);
                }
                
                const key = args[1].toUpperCase();
                const value = args.slice(2).join(' ');
                
                // Check if key exists in base config
                if (!(key in baseConfig)) {
                    return reply(`❌ Invalid key: *${key}*\nUse *.config list* to see valid keys`);
                }
                
                // Convert value to appropriate type
                let parsedValue = value;
                if (value.toLowerCase() === 'true') parsedValue = true;
                else if (value.toLowerCase() === 'false') parsedValue = false;
                else if (!isNaN(value)) parsedValue = Number(value);
                else if (value.startsWith('[') && value.endsWith(']')) {
                    try { parsedValue = JSON.parse(value); } catch(e) {}
                }
                
                // Special validation for MESSAGE_TYPE
                if (key === 'MESSAGE_TYPE') {
                    const validTypes = ['text', 'button'];
                    if (!validTypes.includes(parsedValue.toLowerCase())) {
                        return reply(`❌ Invalid MESSAGE_TYPE. Use: text or button`);
                    }
                    parsedValue = parsedValue.toLowerCase();
                }
                
                // Update config for BOT NUMBER ONLY
                const updateData = { [key]: parsedValue };
                const success = await updateConfig(botNumber, updateData);
                
                if (success) {
                    return reply(`✅ *Configuration Updated*\n\n` +
                        `Bot: ${botNumber}\n` +
                        `Key: ${key}\n` +
                        `Value: ${parsedValue}\n` +
                        `Type: ${typeof parsedValue}\n\n` +
                        `Changes saved to GitHub ✅`);
                } else {
                    return reply(`❌ Failed to update configuration`);
                }
                
            case 'reset':
                const resetSuccess = await resetConfig(botNumber);
                if (resetSuccess) {
                    return reply(`✅ *Configuration Reset*\n\n` +
                        `Bot: ${botNumber}\n` +
                        `All settings restored to defaults.\n` +
                        `Restart bot to apply changes.`);
                } else {
                    return reply(`❌ Failed to reset configuration`);
                }
                
            case 'get':
                if (!args[1]) {
                    return reply(`❌ Please specify a key\nExample: *.config get MODE*`);
                }
                const getKey = args[1].toUpperCase();
                const value2 = currentConfig[getKey];
                return reply(`*${getKey}*: ${value2 !== undefined ? value2 : 'Not set'}`);
                
            default:
                return reply(`❌ Unknown action: ${action}\nUse *.config* for help`);
        }
        
    } catch (error) {
        console.error('Config command error:', error);
        reply(`❌ Error: ${error.message}`);
    }
});

// Quick config commands for common settings
cmd({
    pattern: "mode",
    desc: "Quickly change bot mode. Usage: .mode public/private/inbox/groups",
    category: "owner",
    react: "🔄",
    filename: __filename,
    fromMe: true
},
async (conn, mek, m, { from, sender, args, reply, isMe }) => {
    const botNumber = conn.user.id.split(':')[0];
    
    // STRICT CHECK: Only bot number can use this
    if (!isMe) {
        return reply(`❌ This command can only be used by the bot number itself.`);
    }
    
    const mode = args[0]?.toLowerCase();
    
    if (!['public', 'private', 'inbox', 'groups'].includes(mode)) {
        return reply(`❌ Invalid mode. Use: public, private, inbox, or groups`);
    }
    
    const success = await updateConfig(botNumber, { MODE: mode });
    if (success) {
        return reply(`✅ *Bot mode changed to: ${mode}*\nBot: ${botNumber}\nChanges saved to GitHub`);
    }
    reply(`❌ Failed to update mode`);
});

cmd({
    pattern: "prefix",
    desc: "Quickly change bot prefix. Usage: .prefix <new_prefix>",
    category: "owner",
    react: "⌨️",
    filename: __filename,
    fromMe: true
},
async (conn, mek, m, { from, sender, args, reply, isMe }) => {
    const botNumber = conn.user.id.split(':')[0];
    
    // STRICT CHECK: Only bot number can use this
    if (!isMe) {
        return reply(`❌ This command can only be used by the bot number itself.`);
    }
    
    const newPrefix = args[0];
    
    if (!newPrefix || newPrefix.length > 3) {
        return reply(`❌ Please provide a valid prefix (max 3 characters)`);
    }
    
    const success = await updateConfig(botNumber, { PREFIX: newPrefix });
    if (success) {
        return reply(`✅ *Prefix changed to: ${newPrefix}*\nBot: ${botNumber}\nChanges saved to GitHub`);
    }
    reply(`❌ Failed to update prefix`);
});

// NEW: Quick command to change message type
cmd({
    pattern: "messagetype",
    alias: ["msgtype", "menutype"],
    desc: "Change message display type. Usage: .messagetype text OR .messagetype button",
    category: "owner",
    react: "📋",
    filename: __filename,
    fromMe: true
},
async (conn, mek, m, { from, sender, args, reply, isMe }) => {
    const botNumber = conn.user.id.split(':')[0];
    
    // STRICT CHECK: Only bot number can use this
    if (!isMe) {
        return reply(`❌ This command can only be used by the bot number itself.`);
    }
    
    const msgType = args[0]?.toLowerCase();
    
    if (!['text', 'button'].includes(msgType)) {
        return reply(`❌ Invalid type. Use: text or button\n\n` +
            `*text* - All messages in text format\n` +
            `*button* - Interactive button messages`);
    }
    
    const success = await updateConfig(botNumber, { MESSAGE_TYPE: msgType });
    if (success) {
        return reply(`✅ *Message type changed to: ${msgType}*\n\n` +
            `Bot: ${botNumber}\n` +
            `Menu will now display as: ${msgType.toUpperCase()}\n` +
            `Changes saved to GitHub ✅`);
    }
    reply(`❌ Failed to update message type`);
});
