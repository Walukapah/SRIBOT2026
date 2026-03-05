const { cmd } = require('../command');
const config = require('../config');
const moment = require('moment-timezone');
const { generateListMessage } = require('../lib/functions');

cmd({
    pattern: "listmenu",
    alias: ["list", "menu", "help", "commands", "panel"],
    desc: "Show all commands in list format with image",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, sender, pushname, reply }) => {
    try {
        const currentTime = moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');
        
        const sections = [
            {
                title: "📱 Main Commands",
                rows: [
                    { title: "🏠 Menu", description: "Show main menu", id: `${config.PREFIX}listmenu` },
                    { title: "👑 Owner", description: "Contact bot owner", id: `${config.PREFIX}owner` },
                    { title: "📊 Stats", description: "Bot statistics", id: `${config.PREFIX}stats` },
                    { title: "ℹ️ Alive", description: "Check bot status", id: `${config.PREFIX}alive` }
                ]
            },
            {
                title: "⚙️ Settings",
                rows: [
                    { title: "🔧 Config", description: "View/Edit config", id: `${config.PREFIX}config` },
                    { title: "🔄 Restart", description: "Restart bot", id: `${config.PREFIX}restart` },
                    { title: "❌ Shutdown", description: "Stop bot", id: `${config.PREFIX}shutdown` }
                ]
            },
            {
                title: "👥 Group Commands",
                rows: [
                    { title: "🔗 Link", description: "Get group link", id: `${config.PREFIX}link` },
                    { title: "👢 Kick", description: "Remove member", id: `${config.PREFIX}kick` },
                    { title: "➕ Add", description: "Add member", id: `${config.PREFIX}add` },
                    { title: "📢 Tagall", description: "Mention all members", id: `${config.PREFIX}tagall` }
                ]
            },
            {
                title: "🛠️ Tools",
                rows: [
                    { title: "🔍 Search", description: "Search commands", id: `${config.PREFIX}search` },
                    { title: "⬇️ Download", description: "Download media", id: `${config.PREFIX}download` },
                    { title: "🤖 AI", description: "AI features", id: `${config.PREFIX}ai` }
                ]
            }
        ];

        const menuText = `*Hello ${pushname || 'Friend'}! 👋*

I am *${config.BOT_NAME}* - Your Multi-Number WhatsApp Assistant.

📅 *Date:* ${currentTime}
🔧 *Prefix:* ${config.PREFIX}
⚙️ *Mode:* ${config.MODE}
📌 *Version:* ${config.VERSION}

Select a command from the list below:`;

        const footer = `© ${config.BOT_NAME} • ${moment().format('YYYY')}`;
        const imageUrl = "https://i.ibb.co/YT2TN2vr/Picsart-25-06-07-13-04-26-190.jpg";

        // Send image with list message
        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: menuText,
            footer: footer,
            title: "Command List",
            buttonText: "📋 View Commands",
            sections: sections.map((section, idx) => ({
                title: section.title,
                rows: section.rows.map((row, ridx) => ({
                    title: row.title,
                    description: row.description || '',
                    rowId: row.id || `row_${idx}_${ridx}`
                }))
            }))
        }, { quoted: mek });

        console.log(`[LISTMENU] Menu sent to ${pushname} (${sender})`);

    } catch (error) {
        console.error('[LISTMENU ERROR]', error);
        reply('❌ Error displaying menu. Please try again.');
    }
});
