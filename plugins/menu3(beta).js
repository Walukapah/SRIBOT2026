const { cmd } = require('../command');
const { generateInteractiveMessageText, createSingleSelectButton, createUrlButton, createCopyButton } = require('../lib/functions');
const config = require('../config');

// Format uptime
const formatUptime = (seconds) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds = seconds % (24 * 60 * 60);
    const hours = Math.floor(seconds / (60 * 60));
    seconds = seconds % (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    
    let time = '';
    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;
    return time.trim();
};

// Get memory usage
const getMemoryUsage = () => {
    const used = process.memoryUsage();
    return `${(used.heapUsed / 1024 / 1024).toFixed(2)}MB`;
};

cmd({
    pattern: "menu3",
    alias: ["help", "list", "commands"],
    desc: "Show bot menu with interactive buttons",
    category: "main",
    react: "📜",
    filename: __filename
}, async (conn, mek, m, { from, pushname, reply }) => {
    try {
        const uptime = formatUptime(process.uptime());
        const ram = getMemoryUsage();
        const userName = pushname || "User";
        
        // Menu sections with command lists
        const sections = [
            {
                title: "📂 Command Categories",
                rows: [
                    {
                        header: "⬇️",
                        title: "Download Commands",
                        description: "YouTube, TikTok, Facebook, Instagram downloads",
                        id: ".menu download"
                    },
                    {
                        header: "🔍",
                        title: "Search Commands", 
                        description: "Google, YouTube, Wiki, Pinterest search",
                        id: ".menu search"
                    },
                    {
                        header: "📰",
                        title: "News Commands",
                        description: "Latest news and updates",
                        id: ".menu news"
                    },
                    {
                        header: "🔞",
                        title: "NSFW Commands",
                        description: "Adult content commands",
                        id: ".menu nsfw"
                    },
                    {
                        header: "🤖",
                        title: "AI Commands",
                        description: "ChatGPT, Image AI, Voice AI",
                        id: ".menu ai"
                    },
                    {
                        header: "👥",
                        title: "Group Commands",
                        description: "Admin tools, group management",
                        id: ".menu group"
                    },
                    {
                        header: "⚙️",
                        title: "Owner Commands",
                        description: "Bot owner exclusive commands",
                        id: ".menu owner"
                    },
                    {
                        header: "🧩",
                        title: "Other Commands",
                        description: "Tools, fun, converter commands",
                        id: ".menu other"
                    },
                    {
                        header: "🛠️",
                        title: "Settings",
                        description: "Bot configuration settings",
                        id: ".settings"
                    }
                ]
            }
        ];

        // Create buttons array
        const buttons = [
            // Main menu select button
            createSingleSelectButton("Click Here ⤵️", sections),
            
            // URL button
            createUrlButton("🌐 GitHub Repo", "https://github.com/Walukapah/SRI-DATABASE"),
            
            // Copy button
            createCopyButton("📋 Copy Owner Number", config.OWNER_NUMBER[0] || "94728115797")
        ];

        // Menu body text
        const menuText = `👋 *Hi* ${userName}

*╭─「 ${config.BOT_NAME} MENU 」*
*│* 👾 *Bot*: ${config.BOT_NAME}
*│* 👤 *User*: ${userName}
*│* ☎️ *Owner*: ${config.BOT_INFO.split(';')[1] || 'WALUKA'}
*│* ⏰ *Uptime*: ${uptime}
*│* 📂 *Ram*: ${ram}
*│* ✒️ *Prefix*: ${config.PREFIX}
╰──────────●●►

🎀 Ξ *Select a Command List:* Ξ`;

        const footerText = `© ${config.BOT_NAME} v${config.VERSION}\nMulti-Number WhatsApp Bot by Walukapah 🇱🇰`;

        // Generate interactive message WITHOUT image (text only)
        const interactiveMessage = generateInteractiveMessageText(
            `${config.BOT_NAME} MENU`,
            menuText,
            footerText,
            buttons
        );

        // Send the interactive message
        await conn.sendMessage(from, interactiveMessage, { quoted: mek });

    } catch (error) {
        console.error('[MENU ERROR]', error);
        reply(`❌ Error showing menu: ${error.message}`);
    }
});

// Handle menu category selection
cmd({
    pattern: "menuw",
    alias: ["help"],
    desc: "Show specific menu category",
    category: "main",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const category = q.toLowerCase().trim();
        
        const menus = {
            download: `
╭───「 ⬇️ *DOWNLOAD COMMANDS* 」───
│
│ 🎵 *.yt* <url> - YouTube video/audio
│ 🎶 *.yta* <url> - YouTube audio only  
│ 📹 *.ytv* <url> - YouTube video only
│ 🎵 *.tiktok* <url> - TikTok download
│ 📘 *.fb* <url> - Facebook download
│ 📸 *.ig* <url> - Instagram download
│ 🎧 *.spotify* <url> - Spotify download
│ 📱 *.mediafire* <url> - MediaFire download
│
╰──────────────────────────────`,

            search: `
╭───「 🔍 *SEARCH COMMANDS* 」───
│
│ 🔎 *.google* <query> - Google search
│ 📺 *.ytsearch* <query> - YouTube search
│ 🖼️ *.pinterest* <query> - Pinterest images
│ 📖 *.wiki* <query> - Wikipedia search
│ 🎵 *.lyrics* <song> - Song lyrics
│ 🎬 *.movie* <name> - Movie info
│
╰──────────────────────────────`,

            ai: `
╭───「 🤖 *AI COMMANDS* 」───
│
│ 💬 *.ai* <text> - Chat with GPT
│ 🖼️ *.imagine* <prompt> - Generate image
│ 🎙️ *.voiceai* <text> - Text to speech
│ 📝 *.translate* <text> - Translator
│ ✍️ *.rewrite* <text> - Rewrite text
│
╰──────────────────────────────`,

            group: `
╭───「 👥 *GROUP COMMANDS* 」───
│
│ 🔗 *.link* - Get group link
│ 🚫 *.kick* @user - Remove member
│ ➕ *.add* <number> - Add member
│ 👑 *.promote* @user - Make admin
│ 📛 *.demote* @user - Remove admin
│ 🏷️ *.tagall* - Mention all
│ 🔇 *.mute* - Mute group
│ 🔊 *.unmute* - Unmute group
│ 📋 *.ginfo* - Group info
│
╰──────────────────────────────`,

            owner: `
╭───「 ⚙️ *OWNER COMMANDS* 」───
│
│ 🔄 *.restart* - Restart bot
│ 📊 *.status* - Bot status
│ 👤 *.setpp* - Set bot picture
│ 📝 *.setname* <text> - Set bot name
│ 📢 *.broadcast* <text> - Send to all
│ ⛔ *.ban* @user - Ban user
│ ✅ *.unban* @user - Unban user
│
╰──────────────────────────────`,

            other: `
╭───「 🧩 *OTHER COMMANDS* 」───
│
│ 😂 *.joke* - Random joke
│ 🎲 *.roll* - Roll dice
│ 🎯 *.8ball* <question> - Magic 8-ball
│ 🎰 *.slot* - Slot machine
│ 💰 *.balance* - Check balance
│ 🏆 *.leaderboard* - Top users
│ ⏰ *.time* - Current time
│ 📅 *.date* - Current date
│
╰──────────────────────────────`,

            nsfw: `
╭───「 🔞 *NSFW COMMANDS* 」───
│
│ ⚠️ *Age restricted content*
│
│ Use at your own risk!
│
╰──────────────────────────────`,

            news: `
╭───「 📰 *NEWS COMMANDS* 」───
│
│ 📺 *.news* - Latest news
│ 🌍 *.world* - World news
│ 🏏 *.sports* - Sports news
│ 💻 *.tech* - Tech news
│ 🎬 *.entertainment* - Entertainment
│
╰──────────────────────────────`
        };

        if (menus[category]) {
            reply(menus[category]);
        } else {
            reply("❌ Invalid category. Use *.menu* to see all categories.");
        }
        
    } catch (error) {
        console.error('[MENU CAT ERROR]', error);
        reply(`❌ Error: ${error.message}`);
    }
});
