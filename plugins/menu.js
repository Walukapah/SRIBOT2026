const { Button } = require('../lib/button');
const { cmd } = require('../command');
const config = require('../config');
const { runtime } = require('../lib/functions');

cmd({
    pattern: "menu",
    alias: ["list", "commands"],
    desc: "Show bot menu with interactive buttons",
    category: "main",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, reply, pushname, sender }) => {
    try {
        // Get dynamic config values (these will update when config changes)
        const botName = config.BOT_NAME;
        const menuImg = config.MENU_IMG_URL;
        const prefix = config.PREFIX;
        
        // Calculate uptime
        const uptime = runtime(process.uptime());
        
        // Get RAM usage
        const usedRam = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalRam = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2);
        
        // Create button instance
        const btn = new Button();
        
        // Set menu image from config
        await btn.setImage(menuImg);
        
        // Set title
        btn.setTitle(`${botName} MENU`);
        
        // Build body text exactly as requested format
        const bodyText = `👋 *ʜɪ* @${sender.split('@')[0]}\n\n` +
            `*╭─「 BOT'S MENU 」*\n` +
            `*│*👾 *Bot*: *${botName}*\n` +
            `*│*👤 *User*: @${sender.split('@')[0]}\n` +
            `*│*☎️ *Owners*: *${config.OWNER_NUMBER[0] || 'waluka⚡'}*\n` +
            `*│*⏰ *Uptime*: ${uptime}\n` +
            `*│*📂 *Ram*: ${usedRam}MB / ${totalRam}MB\n` +
            `*│*✒️ *Prefix*: ${prefix}\n` +
            `╰──────────●●►\n\n` +
            `🎀 Ξ *Select a Command List:* Ξ\n` +
            `© ${botName} v${config.VERSION}`;
        
        btn.setBody(bodyText);
        btn.setFooter("Powered by SRI-BOT 🇱🇰");
        
        // Add dropdown selection menu
        btn.addSelection("📂 SELECT OPTION");
        
        // Section 1: Download Commands
        btn.makeSection("⬇️ Download Commands", "Media Downloads");
        btn.makeRow("🎵", "YouTube Audio", "Download MP3 from YouTube", "menu_ytmp3");
        btn.makeRow("🎬", "YouTube Video", "Download MP4 from YouTube", "menu_ytmp4");
        btn.makeRow("📱", "TikTok", "Download TikTok videos", "menu_tiktok");
        btn.makeRow("📸", "Instagram", "Download Instagram content", "menu_ig");
        btn.makeRow("🐦", "Twitter/X", "Download Twitter videos", "menu_twitter");
        
        // Section 2: Search Commands
        btn.makeSection("🔍 Search Commands", "Find Content");
        btn.makeRow("🎵", "Song Search", "Search and download music", "menu_play");
        btn.makeRow("📹", "Video Search", "Search YouTube videos", "menu_yts");
        btn.makeRow("🖼️", "Image Search", "Search Google images", "menu_img");
        btn.makeRow("📰", "News", "Get latest news", "menu_news");
        btn.makeRow("🌤️", "Weather", "Check weather info", "menu_weather");
        
        // Section 3: Owner Commands
        btn.makeSection("👑 Owner Commands", "Bot Management");
        btn.makeRow("📢", "Broadcast", "Send message to all", "menu_broadcast");
        btn.makeRow("⛔", "Ban User", "Ban someone from bot", "menu_ban");
        btn.makeRow("✅", "Unban User", "Unban a user", "menu_unban");
        btn.makeRow("🔄", "Restart", "Restart the bot", "menu_restart");
        btn.makeRow("⚙️", "Settings", "Configure bot settings", "menu_settings");
        
        // Section 4: Settings
        btn.makeSection("⚙️ Settings", "Configuration");
        btn.makeRow("🔧", "Auto Read", "Toggle auto read status", "menu_autoread");
        btn.makeRow("😀", "Auto React", "Toggle auto react", "menu_autoreact");
        btn.makeRow("📝", "Prefix", "Change command prefix", "menu_prefix");
        btn.makeRow("🖼️", "Alive Image", "Change alive image", "menu_aliveimg");
        btn.makeRow("🔒", "Mode", "Change bot mode", "menu_mode");
        
        // Add quick action buttons
        btn.addReply("🏓 Ping", "menu_ping")
           .addReply("👤 Owner", "menu_owner")
           .addUrl("💬 Channel", config.MEDIA_URL || "https://whatsapp.com")
           .addCopy("📞 Support", config.OWNER_NUMBER[0] || "94728115797");
        
        // Send the message
        await btn.send(from, conn, mek);
        
    } catch (error) {
        console.error("Menu error:", error);
        reply("❌ Error loading menu: " + error.message);
    }
});
