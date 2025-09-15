const config = require('../config');
const { cmd, commands } = require('../command');
const { proto, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

cmd({
    pattern: "menu3",
    desc: "Displays main menu with interactive buttons",
    category: "utility",
    filename: __filename
},
async(conn, mek, m, { from, reply }) => {
    try {
        const buttons = [
            { buttonId: '.aimenu', buttonText: { displayText: 'AI MENU' }, type: 1 },
            { buttonId: '.searchmenu', buttonText: { displayText: 'SEARCH MENU' }, type: 1 },
            { buttonId: '.downloadmenu', buttonText: { displayText: 'DOWNLOAD MENU' }, type: 1 },
            { buttonId: '.ownermenu', buttonText: { displayText: 'OWNER MENU' }, type: 1 },
            { buttonId: '.convertmenu', buttonText: { displayText: 'CONVERT MENU' }, type: 1 },
            { buttonId: '.groupmenu', buttonText: { displayText: 'GROUP MENU' }, type: 1 },
            { buttonId: '.stickermenu', buttonText: { displayText: 'STICKER MENU' }, type: 1 },
            { buttonId: '.gamemenu', buttonText: { displayText: 'GAME MENU' }, type: 1 },
            { buttonId: '.mathtoolmenu', buttonText: { displayText: 'MATHTOOL MENU' }, type: 1 }
        ];

        const buttonMessage = {
            text: "SRI BOT",
            footer: "Select an option below",
            headerType: 1,
            buttons: buttons,
            viewOnce: true
        };

        await conn.sendMessage(from, buttonMessage, { quoted: mek });

    } catch (error) {
        console.error('Menu3 error:', error);
        await reply("Failed to display menu. Please try again.");
    }
});
