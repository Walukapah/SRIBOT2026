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
        
        const menuText = `*${config.BOT_NAME} - Interactive Menu* 🚀\n\n` +
            `╭─⊷ *BOT STATUS*\n` +
            `│ • Name: ${config.BOT_NAME}\n` +
            `│ • Version: 3.0.0\n` +
            `│ • Platform: ${config.PLATFORM || 'Node.js'}\n` +
            `│ • Uptime: ${hours}h ${minutes}m ${seconds}s\n` +
            `╰─────────────\n\n` +
            `*Select an option from the list below:*`;

        const sections = [
            {
                title: "🔧 MAIN COMMANDS",
                rows: [
                    { 
                        title: "🤖 BOT STATUS", 
                        description: "Show bot information and stats", 
                        rowId: `${config.PREFIX}alive`
                    },
                    { 
                        title: "💻 SYSTEM INFO", 
                        description: "Show system details and performance", 
                        rowId: `${config.PREFIX}system`
                    },
                    { 
                        title: "📊 PING TEST", 
                        description: "Check bot response time", 
                        rowId: `${config.PREFIX}ping`
                    }
                ]
            },
            {
                title: "🎵 MEDIA DOWNLOAD",
                rows: [
                    { 
                        title: "🎶 DOWNLOAD SONG", 
                        description: "Download audio from YouTube", 
                        rowId: `${config.PREFIX}song`
                    },
                    { 
                        title: "🎬 DOWNLOAD VIDEO", 
                        description: "Download video from YouTube", 
                        rowId: `${config.PREFIX}video`
                    },
                    { 
                        title: "🖼️ DOWNLOAD IMAGE", 
                        description: "Download images from various sources", 
                        rowId: `${config.PREFIX}image`
                    }
                ]
            },
            {
                title: "⚙️ BOT CONTROLS",
                rows: [
                    { 
                        title: "👤 OWNER INFO", 
                        description: "Contact bot owner", 
                        rowId: `${config.PREFIX}owner`
                    },
                    { 
                        title: "⚙️ PREFERENCES", 
                        description: "Change bot settings", 
                        rowId: `${config.PREFIX}preferences`
                    },
                    { 
                        title: "📢 JOIN CHANNEL", 
                        description: "Get our channel link", 
                        rowId: `${config.PREFIX}channel`
                    }
                ]
            },
            {
                title: "🎮 FUN & GAMES",
                rows: [
                    { 
                        title: "🎯 FUN COMMANDS", 
                        description: "Entertainment and games", 
                        rowId: `${config.PREFIX}fun`
                    },
                    { 
                        title: "🔍 SEARCH", 
                        description: "Search various content", 
                        rowId: `${config.PREFIX}search`
                    },
                    { 
                        title: "🛠️ TOOLS", 
                        description: "Utility tools and converters", 
                        rowId: `${config.PREFIX}tools`
                    }
                ]
            }
        ];

        // List Message එකක් ලෙස යැවීම
        // Image සමග List Message
await conn.sendMessage(from, {
    text: menuText,
    footer: `© ${config.BOT_NAME}`,
    title: `🌟 ${config.BOT_NAME} MENU`,
    buttonText: "📋 OPEN MENU",
    sections: sections,
    headerType: 4,
    image: { 
        url: "https://files.catbox.moe/kus7ix.jpg" 
    }
}, {
    quoted: m
});

    } catch (error) {
        console.error("Error in menu3 command:", error);
        await reply("❌ Failed to display menu. Please try again later.");
    }
});
