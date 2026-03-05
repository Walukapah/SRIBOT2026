// /plugins/menu.js
const { cmd } = require('../command');
const config = require('../config');
const moment = require('moment-timezone');

// Get current bot number from global context
function getCurrentConfig() {
    const currentNumber = global.currentBotNumber;
    if (currentNumber) {
        return config.getConfigSync(currentNumber);
    }
    return config;
}

cmd({
    pattern: "menu",
    alias: ["help", "commands"],
    desc: "Show bot menu with interactive buttons",
    category: "main",
    react: "📜",
    filename: __filename
}, async (conn, mek, m, { from, sender, pushname, reply }) => {
    try {
        // Get config for current number
        const currentConfig = getCurrentConfig();
        
        const date = moment().tz('Asia/Colombo').format('YYYY-MM-DD');
        const time = moment().tz('Asia/Colombo').format('HH:mm:ss');
        
        const caption = `*🪷 හායි ${pushname || 'Friend'}!* 

👋 *Welcome to ${currentConfig.BOT_NAME}*

📅 *Date:* ${date}
⏰ *Time:* ${time}
🌐 *Mode:* ${currentConfig.MODE}
🔧 *Prefix:* ${currentConfig.PREFIX}
📦 *Version:* ${currentConfig.VERSION}

*Select an option below:*`;

        const imageUrl = currentConfig.MENU_IMG_URL || "https://images.weserv.nl/?url=i.imgur.com/W2CaVZW.jpeg";
        
        // New interactive button format
        const interactiveButtons = [
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 All Commands',
                    id: `${currentConfig.PREFIX}list`
                })
            },
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '👑 Owner Info',
                    id: `${currentConfig.PREFIX}owner`
                })
            },
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '📊 Bot Status',
                    id: `${currentConfig.PREFIX}ping`
                })
            },
            {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: '⚙️ Settings',
                    id: `${currentConfig.PREFIX}settings`
                })
            }
        ];

        // Send using new format
        await conn.sendMessage(from, {
            image: { 
                url: imageUrl 
            },
            caption: caption,
            title: `${currentConfig.BOT_NAME}`,
            subtitle: 'Multi-Number WhatsApp Bot',
            footer: `© ${currentConfig.BOT_NAME} • ${moment().format('YYYY')}`,
            interactiveButtons: interactiveButtons,
            hasMediaAttachment: true
        }, { quoted: mek });

    } catch (error) {
        console.error('Menu error:', error);
        reply('❌ Error displaying menu. Please try again.');
    }
});
