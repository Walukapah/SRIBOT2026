const { cmd } = require('../command');
const config = require('../config');
const moment = require('moment-timezone');
const os = require('os');

// Global variables from index.js (simulate)
const activeSockets = new Map();

cmd({
    pattern: "menu3",
    desc: "Show bot menu with buttons",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, sender, pushname, reply, isGroup }) => {
    try {
        const text = `*🪷 හායි ${pushname}!* 

මම *${config.BOT_NAME}* - Multi-Number WhatsApp Bot එකක්. 
මගේ මෙහෙයවීම යටතේ *${activeSockets.size}* අංක ක්‍රියාත්මකව පවතී.

▢ *Prefix:* ${config.PREFIX}
▢ *Mode:* ${config.MODE}
▢ *Version:* ${config.VERSION}

පහත බටනය භාවිතා කර මගේ සියලුම විධාන දකින්න.`;

        const footer = `© ${config.BOT_NAME} • ${moment().format('YYYY')}`;
        const imageUrl = config.MENU_IMG_URL || "https://i.imgur.com/r3GZeiX.jpeg";
        
        const buttons = [
            {
                buttonId: `${config.PREFIX}list`,
                buttonText: { displayText: "📋 All Commands" },
                type: 1
            },
            {
                buttonId: `${config.PREFIX}owner`,
                buttonText: { displayText: "👑 Owner" },
                type: 1
            },
            {
                buttonId: `${config.PREFIX}stats`,
                buttonText: { displayText: "📊 Stats" },
                type: 1
            }
        ];

        await conn.sendButtonMessage(from, text, footer, buttons, imageUrl, { quoted: mek });
        
    } catch (error) {
        console.error('Menu error:', error);
        reply('❌ Error displaying menu. Please try again.');
    }
});
