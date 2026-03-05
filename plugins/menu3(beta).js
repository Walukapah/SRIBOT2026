const { cmd } = require('../command');
const config = require('../config');
const moment = require('moment-timezone');
const { generateInteractiveButtons, generateTemplateButtons, generateListMessage } = require('../lib/functions');

// Get active sockets count from index.js
const getActiveBotCount = () => {
    try {
        // This will be set by index.js when bot starts
        return global.activeSockets ? global.activeSockets.size : 1;
    } catch {
        return 1;
    }
};

cmd({
    pattern: "menu3",
    alias: ["help", "panel", "commands"],
    desc: "Show bot menu with interactive buttons",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, sender, pushname, reply, isGroup, prefix }) => {
    try {
        const currentTime = moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');
        const botCount = getActiveBotCount();
        
        const menuText = `*🪷 හායි ${pushname || 'Friend'}!* 

මම *${config.BOT_NAME}* - Multi-Number WhatsApp Bot එකක්. 
මගේ මෙහෙයවීම යටතේ *${botCount}* අංක ක්‍රියාත්මකව පතී.

📅 *Date:* ${currentTime}
🔧 *Prefix:* ${config.PREFIX}
⚙️ *Mode:* ${config.MODE}
📌 *Version:* ${config.VERSION}

පහත බටන භාවිතා කර ඔබට අවශ්‍ය විධාන ලබා ගන්න.`;

        const footer = `© ${config.BOT_NAME} • ${moment().format('YYYY')}`;
        const imageUrl = config.MENU_IMG_URL || "https://i.ibb.co/YT2TN2vr/Picsart-25-06-07-13-04-26-190.jpg";

        // Interactive Buttons (New Format - Best for WhatsApp)
        const buttons = [
            {
                type: 'quick_reply',
                text: '📋 All Commands',
                id: `${config.PREFIX}list`
            },
            {
                type: 'quick_reply',
                text: '👑 Owner Info',
                id: `${config.PREFIX}owner`
            },
            {
                type: 'quick_reply',
                text: '📊 Bot Stats',
                id: `${config.PREFIX}stats`
            },
            {
                type: 'quick_reply',
                text: '⚙️ Settings',
                id: `${config.PREFIX}settings`
            },
            {
                type: 'url',
                text: '🌐 Visit Channel',
                url: config.MEDIA_URL || 'https://whatsapp.com/channel/0029VaAPzWX0G0XdhMbtRI2i'
            }
        ];

        // Method 1: Using Interactive Buttons (Recommended)
        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: menuText,
            footer: footer,
            interactiveButtons: buttons.map(btn => {
                if (btn.type === 'quick_reply') {
                    return {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: btn.text,
                            id: btn.id
                        })
                    };
                } else if (btn.type === 'url') {
                    return {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: btn.text,
                            url: btn.url,
                            merchant_url: btn.url
                        })
                    };
                }
                return null;
            }).filter(Boolean),
            hasMediaAttachment: true
        }, { quoted: mek });

        console.log(`[MENU] Menu sent to ${pushname} (${sender})`);

    } catch (error) {
        console.error('[MENU ERROR]', error);
        reply('❌ Menu පූරණය කිරීමේදී දෝෂයක් ඇතිවිය. නැවත උත්සාහ කරන්න.');
    }
});

// Alternative Menu with Template Buttons (Legacy but more compatible)
cmd({
    pattern: "menu2",
    alias: ["help2", "panel2"],
    desc: "Show bot menu with template buttons",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, sender, pushname, reply }) => {
    try {
        const menuText = `*🪷 හායි ${pushname || 'Friend'}!* 

මම *${config.BOT_NAME}* - ඔබගේ WhatsApp Assistant.

🔧 *Prefix:* ${config.PREFIX}
⚙️ *Mode:* ${config.MODE}`;

        const footer = `© ${config.BOT_NAME}`;
        const imageUrl = config.MENU_IMG_URL || "https://i.ibb.co/YT2TN2vr/Picsart-25-06-07-13-04-26-190.jpg";

        // Template Buttons (Legacy Format)
        const templateButtons = [
            {
                index: 1,
                urlButton: {
                    displayText: '🌐 GitHub',
                    url: 'https://github.com/Walukapah/SRI-DATABASE'
                }
            },
            {
                index: 2,
                quickReplyButton: {
                    displayText: '📋 All Commands',
                    id: `${config.PREFIX}list`
                }
            },
            {
                index: 3,
                quickReplyButton: {
                    displayText: '👑 Owner',
                    id: `${config.PREFIX}owner`
                }
            },
            {
                index: 4,
                callButton: {
                    displayText: '📞 Call Owner',
                    phoneNumber: config.OWNER_NUMBER[0] || '+94728115797'
                }
            }
        ];

        await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: menuText,
            footer: footer,
            templateButtons: templateButtons
        }, { quoted: mek });

    } catch (error) {
        console.error('[MENU2 ERROR]', error);
        reply('❌ Error displaying menu2.');
    }
});

// List Menu (Best for many commands)
cmd({
    pattern: "listmenu",
    alias: ["list", "commands"],
    desc: "Show all commands in list format",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, sender, pushname, reply }) => {
    try {
        const sections = [
            {
                title: "📱 Main Commands",
                rows: [
                    { title: "🏠 Menu", description: "Show main menu", id: `${config.PREFIX}menu` },
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

        const listMessage = generateListMessage(
            `*🪷 හායි ${pushname || 'Friend'}!*

මෙය *${config.BOT_NAME}* හි සියලුම විධාන ලැයිස්තුවයි.
ඔබට අවශ්‍ය විධානය තෝරන්න.`,
            "Command List",
            "📋 View Commands",
            sections,
            `© ${config.BOT_NAME} • ${moment().format('YYYY')}`
        );

        await conn.sendMessage(from, listMessage, { quoted: mek });

    } catch (error) {
        console.error('[LISTMENU ERROR]', error);
        reply('❌ Error displaying list menu.');
    }
});
