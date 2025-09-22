const { cmd } = require('../command');
const config = require('../config');

cmd({
    pattern: "menu3",
    desc: "Show interactive menu with buttons",
    category: "general",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply }) => {
    try {
        const startTime = conn.creationTime || Date.now();
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const title = '🪨 Hellow, *"Itz: ZEUS-MINI"*';
        const text = `╭──◯\n` +
            `│ \`S T A T U S\`\n` +
            `│ *⦁ Name:* @ZEUS-MINI\n` +
            `│ *⦁ Version:* 0.0001+\n` +
            `│ *⦁ Platform:* Heroku\n` +
            `│ *⦁ Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
            `╰──◯`;

        const sections = [
            {
                title: "MAIN COMMANDS",
                rows: [
                    { title: "BOT STATUS", description: "Show bot information", rowId: `${config.PREFIX}alive` },
                    { title: "SYSTEM INFO", description: "Show system details", rowId: `${config.PREFIX}system` },
                    { title: "PING TEST", description: "Check bot latency", rowId: `${config.PREFIX}ping` }
                ]
            },
            {
                title: "MEDIA DOWNLOAD",
                rows: [
                    { title: "DOWNLOAD SONG", description: "Download audio from YouTube", rowId: `${config.PREFIX}song` },
                    { title: "DOWNLOAD VIDEO", description: "Download video from YouTube", rowId: `${config.PREFIX}video` }
                ]
            },
            {
                title: "OTHER OPTIONS",
                rows: [
                    { title: "OWNER INFO", description: "Contact bot owner", rowId: `${config.PREFIX}owner` },
                    { title: "PREFERENCES", description: "Change bot settings", rowId: `${config.PREFIX}preferences` },
                    { title: "JOIN CHANNEL", description: "Get our channel link", rowId: `${config.PREFIX}channel` }
                ]
            }
        ];

        await conn.sendMessage(from, {
            image: { url: config.MENU_IMG_URL || "https://files.catbox.moe/kus7ix.jpg" },
            text: text,
            footer: config.BOT_NAME,
            title: title,
            buttonText: "SELECT OPTION W",
            sections: sections,
            headerType: 4
        });
    } catch (error) {
        console.error("Error in menu3 command:", error);
        reply("❌ Failed to display menu. Please try again later.");
    }
});
