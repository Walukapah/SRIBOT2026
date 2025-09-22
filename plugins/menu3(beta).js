// menu3(beta).js - Image with Sections Menu
const { cmd } = require('../command');
const config = require('../config');

cmd({
    pattern: "menu3",
    desc: "Show interactive menu with image and sections",
    category: "general",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply, pushname }) => {
    try {
        const startTime = conn.creationTime || Date.now();
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        // Sections with image
        const sections = [
            {
                title: "🎯 BOT INFORMATION",
                rows: [
                    {
                        title: "🤖 Bot Status",
                        description: `Uptime: ${hours}h ${minutes}m ${seconds}s`,
                        rowId: `${config.PREFIX}alive`
                    },
                    {
                        title: "⚡ Ping Test",
                        description: "Check bot response time",
                        rowId: `${config.PREFIX}ping`
                    },
                    {
                        title: "📊 System Info",
                        description: "View system details",
                        rowId: `${config.PREFIX}system`
                    }
                ]
            },
            {
                title: "📥 DOWNLOADER",
                rows: [
                    {
                        title: "🎵 YouTube Audio",
                        description: "Download songs from YouTube",
                        rowId: `${config.PREFIX}song`
                    },
                    {
                        title: "🎬 YouTube Video",
                        description: "Download videos from YouTube",
                        rowId: `${config.PREFIX}video`
                    },
                    {
                        title: "📷 Instagram DL",
                        description: "Download IG posts/stories",
                        rowId: `${config.PREFIX}ig`
                    }
                ]
            },
            {
                title: "🛠️ TOOLS",
                rows: [
                    {
                        title: "👑 Owner Info",
                        description: "Contact bot developer",
                        rowId: `${config.PREFIX}owner`
                    },
                    {
                        title: "🔍 Sticker Maker",
                        description: "Convert images to stickers",
                        rowId: `${config.PREFIX}sticker`
                    },
                    {
                        title: "📝 Text Tools",
                        description: "Text formatting utilities",
                        rowId: `${config.PREFIX}text`
                    }
                ]
            },
            {
                title: "🎮 ENTERTAINMENT",
                rows: [
                    {
                        title: "🎯 Mini Games",
                        description: "Play fun games",
                        rowId: `${config.PREFIX}game`
                    },
                    {
                        title: "😂 Memes & Jokes",
                        description: "Get random entertainment",
                        rowId: `${config.PREFIX}meme`
                    },
                    {
                        title: "🔮 AI Chat",
                        description: "Chat with AI",
                        rowId: `${config.PREFIX}ai`
                    }
                ]
            }
        ];

        // Send image with caption and sections
        await conn.sendMessage(from, {
            image: { 
                url: config.MENU_IMG_URL || "https://i.imgur.com/r3GZeiX.jpeg" 
            },
            caption: `*${config.BOT_NAME} MENU*\n\n👤 User: ${pushname || 'User'}\n🤖 Version: ${config.VERSION || '1.0.0'}\n⏰ Uptime: ${hours}h ${minutes}m ${seconds}s\n\n*Select a category below:*`,
            footer: `Total Commands: ${sections.reduce((acc, sec) => acc + sec.rows.length, 0)} | ${config.BOT_NAME}`,
            buttons: [
                {
                    buttonId: `${config.PREFIX}help`,
                    buttonText: { displayText: "📖 ALL COMMANDS" },
                    type: 1
                },
                {
                    buttonId: `${config.PREFIX}owner`,
                    buttonText: { displayText: "👑 OWNER" },
                    type: 1
                }
            ],
            sections: sections,
            headerType: 4,
            viewOnce: false
        });

    } catch (error) {
        console.error("Error in menu3 command:", error);
        reply("❌ Failed to display menu. Please try again later.");
    }
});
