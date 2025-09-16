const config = require('../config');
const { cmd } = require('../command');

cmd({
    pattern: "menu3",
    desc: "Displays main menu with interactive buttons",
    category: "utility",
    filename: __filename
},
async(conn, mek, m, { from, sender, pushname }) => {
    try {
        const botName = config.BOT_NAME || "SRI-BOT 🇱🇰";
        const ownerNumber = config.OWNER_NUMBER[0] || "94753670175";
        
        // Main menu text
        const menuText = `╭─⊷ *${botName}*
│ 👤 User: ${pushname || 'User'}
│ 📞 Number: ${sender.split('@')[0]}
│ 🕒 Time: ${new Date().toLocaleTimeString()}
│ 💻 Mode: ${config.MODE || 'public'}
│ 🔧 Version: ${config.VERSION || '1.0.0'}
╰─────────────

🤖 *AI MENU* - AI commands
🔍 *SEARCH MENU* - Search commands
⬇️ *DOWNLOAD MENU* - Download commands
👑 *OWNER MENU* - Owner commands
🔄 *CONVERT MENU* - Converter tools
👥 *GROUP MENU* - Group management
🎨 *STICKER MENU* - Sticker tools
🎮 *GAME MENU* - Fun games
🧮 *MATHTOOL MENU* - Math utilities

_Select an option below_`;

        // Create buttons array
        const buttons = [
            {buttonId: `${config.PREFIX}aimenu`, buttonText: {displayText: '🤖 AI MENU'}, type: 1},
            {buttonId: `${config.PREFIX}searchmenu`, buttonText: {displayText: '🔍 SEARCH'}, type: 1},
            {buttonId: `${config.PREFIX}downloadmenu`, buttonText: {displayText: '⬇️ DOWNLOAD'}, type: 1},
            {buttonId: `${config.PREFIX}ownermenu`, buttonText: {displayText: '👑 OWNER'}, type: 1},
            {buttonId: `${config.PREFIX}convertmenu`, buttonText: {displayText: '🔄 CONVERT'}, type: 1},
            {buttonId: `${config.PREFIX}groupmenu`, buttonText: {displayText: '👥 GROUP'}, type: 1},
            {buttonId: `${config.PREFIX}stickermenu`, buttonText: {displayText: '🎨 STICKER'}, type: 1},
            {buttonId: `${config.PREFIX}gamemenu`, buttonText: {displayText: '🎮 GAME'}, type: 1},
            {buttonId: `${config.PREFIX}mathtoolmenu`, buttonText: {displayText: '🧮 MATH TOOLS'}, type: 1}
        ];

        // Send the button message
        await m.replyButtons(
            menuText,
            buttons,
            'MAIN MENU',
            `Owner: ${ownerNumber} | ${botName}`
        );

    } catch (error) {
        console.error('Menu3 error:', error);
        await conn.sendMessage(from, { 
            text: "❌ Failed to display menu. Please try again later." 
        }, { quoted: mek });
    }
});
