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
    desc: "Show bot menu with buttons",
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

        // Working image URLs (reliable)
        const imageUrls = [
            "https://i.imgur.com/r3GZeiX.jpeg", // From your config
            "https://telegra.ph/file/ad25b2227fa2a1a01b707.jpg", // ALIVE_IMG default
            "https://i.ibb.co/6J4r7hL/menu.jpg" // Backup
        ];
        
        // Use configured image or fallback
        let imageUrl = currentConfig.MENU_IMG_URL || currentConfig.ALIVE_IMG;
        
        // If it's the broken weserv URL, use direct imgur
        if (imageUrl && imageUrl.includes('weserv.nl')) {
            imageUrl = "https://i.imgur.com/r3GZeiX.jpeg";
        }

        // WORKING Button format for Baileys v6+
        // Use template buttons instead of interactiveButtons
        const buttons = [
            {
                buttonId: `${currentConfig.PREFIX}list`,
                buttonText: { displayText: "📋 All Commands" },
                type: 1
            },
            {
                buttonId: `${currentConfig.PREFIX}owner`,
                buttonText: { displayText: "👑 Owner Info" },
                type: 1
            },
            {
                buttonId: `${currentConfig.PREFIX}ping`,
                buttonText: { displayText: "📊 Bot Status" },
                type: 1
            }
        ];

        // Send template button message (compatible format)
        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: caption,
            footer: `© ${currentConfig.BOT_NAME} • ${moment().format('YYYY')}`,
            buttons: buttons,
            headerType: 1, // Image header
            contextInfo: {
                externalAdReply: {
                    title: currentConfig.BOT_NAME,
                    body: "Multi-Number WhatsApp Bot",
                    thumbnailUrl: imageUrl,
                    sourceUrl: "https://github.com/Walukapah/SRI-DATABASE",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error('Menu error:', error);
        reply(`❌ Error: ${error.message}`);
    }
});
