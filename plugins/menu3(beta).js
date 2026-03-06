const { Button, sendSimpleButtons, sendMenu } = require('../lib/button');
const { cmd } = require('../command');
const config = require('../config');

cmd({
    pattern: "testbuttons",
    alias: ["tbtn", "btntest"],
    desc: "Test interactive button messages",
    category: "test",
    react: "🧪",
    filename: __filename
}, async (conn, mek, m, { from, reply, sender }) => {
    try {
        await reply("🔄 Testing button messages... Send .testmenu for full menu test");
        
        // Test 1: Simple Reply Buttons
        const btn1 = new Button()
            .setBody("🤖 *SRI-BOT Button Test*\n\nSelect an option below:")
            .setFooter(config.BOT_NAME)
            .addReply("✅ Yes", "btn_yes")
            .addReply("❌ No", "btn_no")
            .addReply("📊 Status", "btn_status");
        
        await btn1.send(from, conn, mek);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 2: URL and Copy Buttons
        const btn2 = new Button()
            .setBody("🔗 *External Links Test*")
            .setFooter("Tap to visit or copy")
            .addUrl("🌐 GitHub", "https://github.com/Walukapah", "https://github.com")
            .addCopy("📋 Copy Number", sender.split('@')[0], "copy_number")
            .addCall("📞 Call Owner", config.OWNER_NUMBER[0] || "94728115797");
        
        await btn2.send(from, conn, mek);
        
    } catch (error) {
        console.error("Button test error:", error);
        reply("❌ Error: " + error.message);
    }
});

cmd({
    pattern: "testmenu",
    alias: ["menu2", "imenu"],
    desc: "Test interactive menu with sections",
    category: "test",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        // Create interactive menu with sections
        const menu = new Button()
            .setTitle(`🤖 ${config.BOT_NAME}`)
            .setSubtitle("Interactive Menu System")
            .setBody("👇 Select a category from the menu below:")
            .setFooter("SRI-BOT 🇱🇰 | v" + config.VERSION);
        
        // Add selection with sections
        menu.addSelection("📂 Browse Categories");
        
        // Section 1: Main Commands
        menu.makeSection("⭐ Main Commands", "Popular");
        menu.makeRow("🚀", "Ping", "Check bot speed", "menu_ping");
        menu.makeRow("👤", "Owner", "Contact bot owner", "menu_owner");
        menu.makeRow("ℹ️", "About", "Bot information", "menu_about");
        
        // Section 2: Group Commands
        menu.makeSection("👥 Group Management", "Admin Only");
        menu.makeRow("🔗", "Group Link", "Get group invite", "menu_glink");
        menu.makeRow("👮", "Admins", "List all admins", "menu_admins");
        menu.makeRow("🚫", "Kick", "Remove member", "menu_kick");
        
        // Section 3: Media Commands
        menu.makeSection("🎬 Media Tools", "Fun");
        menu.makeRow("🖼️", "Sticker", "Create stickers", "menu_sticker");
        menu.makeRow("🎵", "Audio", "Audio tools", "menu_audio");
        menu.makeRow("📹", "Video", "Video downloader", "menu_video");
        
        // Add quick action buttons
        menu.addReply("❓ Help", "btn_help")
            .addUrl("💻 Source", "https://github.com/Walukapah/SRI-DATABASE");
        
        await menu.send(from, conn, mek);
        
    } catch (error) {
        console.error("Menu test error:", error);
        reply("❌ Error: " + error.message);
    }
});

cmd({
    pattern: "testimagebtn",
    alias: ["imgbtn", "pbtn"],
    desc: "Test buttons with image",
    category: "test",
    react: "🖼️",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const btn = new Button()
            .setImage(config.MENU_IMG_URL || "https://i.ibb.co/YT2TN2vr/Picsart-25-06-07-13-04-26-190.jpg")
            .setTitle("🖼️ Image Button Test")
            .setBody("This is a test of image header with buttons!")
            .setFooter("SRI-BOT 🇱🇰")
            .addReply("❤️ Like", "img_like")
            .addReply("🔁 Share", "img_share")
            .addUrl("🔗 Visit", config.MEDIA_URL || "https://whatsapp.com");
        
        await btn.send(from, conn, mek);
        
    } catch (error) {
        console.error("Image button error:", error);
        reply("❌ Error: " + error.message);
    }
});

// Handle button responses
cmd({
    on: "text",
    pattern: ".*",
    dontAddCommandList: true
}, async (conn, mek, m, { from, body, reply }) => {
    // Check if it's a button response (starts with btn_ or menu_)
    if (body.startsWith('btn_') || body.startsWith('menu_') || body.startsWith('img_')) {
        const responses = {
            'btn_yes': '✅ You clicked YES! Great choice.',
            'btn_no': '❌ You clicked NO! Maybe next time.',
            'btn_status': '🤖 Bot is running perfectly!',
            'btn_help': 'ℹ️ Use .menu for full command list',
            'menu_ping': '🚀 Use .ping to check speed',
            'menu_owner': '👤 Use .owner to contact owner',
            'menu_about': 'ℹ️ SRI-BOT is a multi-number WhatsApp bot',
            'img_like': '❤️ Thanks for liking!',
            'img_share': '🔁 Sharing is caring!'
        };
        
        const response = responses[body] || `📌 You selected: *${body}*\n\nThis is an interactive button response!`;
        await reply(response);
    }
});
