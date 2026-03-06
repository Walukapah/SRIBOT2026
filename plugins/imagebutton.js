const { Button, sendImageButtons, sendImageMenu, sendImageBufferButtons } = require('../lib/button');
const { cmd } = require('../command');
const config = require('../config');
const { getBuffer } = require('../lib/functions');

// ==================== COMMAND 1: Simple Image with Buttons ====================

cmd({
    pattern: "imgbtn",
    alias: ["imagebutton", "ibtn"],
    desc: "Send image with interactive buttons",
    category: "media",
    react: "🖼️",
    filename: __filename
}, async (conn, mek, m, { from, reply, pushname }) => {
    try {
        // Example image URL - you can use any image
        const imageUrl = config.ALIVE_IMG || "https://telegra.ph/file/ad25b2227fa2a1a01b707.jpg";
        
        const btn = new Button();
        
        // Set image (supports URL, Buffer, or local path)
        await btn.setImage(imageUrl);
        
        // Set text content
        btn.setTitle(`👋 Hello ${pushname || 'User'}!`);
        btn.setBody("🤖 Welcome to *SRI-BOT*\n\nThis is a demo of image with buttons.\n\nSelect an option below:");
        btn.setFooter(`${config.BOT_NAME} | v${config.VERSION}`);
        
        // Add buttons
        btn.addReply("✅ Confirm", "img_confirm")
           .addReply("❌ Cancel", "img_cancel")
           .addUrl("🌐 Visit", "https://github.com/Walukapah", "https://github.com")
           .addCopy("📋 Copy", config.OWNER_NUMBER[0] || "94728115797", "copy_owner");
        
        await btn.send(from, conn, mek);
        
    } catch (error) {
        console.error("Image button error:", error);
        reply("❌ Error: " + error.message);
    }
});

// ==================== COMMAND 2: Image Menu with Dropdown ====================

cmd({
    pattern: "imgmenu",
    alias: ["imagemenu", "menuimg"],
    desc: "Send image menu with dropdown sections",
    category: "media",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, reply, pushname }) => {
    try {
        const imageUrl = config.ALIVE_IMG || "https://telegra.ph/file/ad25b2227fa2a1a01b707.jpg";
        
        const btn = new Button();
        
        // Set image
        await btn.setImage(imageUrl);
        
        // Set content
        btn.setTitle(`🤖 ${config.BOT_NAME}`);
        btn.setSubtitle(`Welcome ${pushname || 'User'}! 👋`);
        btn.setBody("Select a command category from the menu below:");
        btn.setFooter("Tap to browse commands");
        
        // Add dropdown menu
        btn.addSelection("📂 Browse Categories");
        
        // Section 1
        btn.makeSection("🔧 Main Commands", "Essential");
        btn.makeRow("🏓", "Ping", "Check bot speed", "cmd_ping");
        btn.makeRow("👤", "Owner", "Contact owner", "cmd_owner");
        btn.makeRow("ℹ️", "About", "Bot info", "cmd_about");
        
        // Section 2
        btn.makeSection("👥 Group Tools", "Admin");
        btn.makeRow("🔗", "Link", "Group invite", "cmd_link");
        btn.makeRow("👮", "Promote", "Make admin", "cmd_promote");
        btn.makeRow("🚫", "Kick", "Remove member", "cmd_kick");
        
        // Section 3
        btn.makeSection("🎭 Fun & Media", "Enjoy");
        btn.makeRow("🖼️", "Sticker", "Create sticker", "cmd_sticker");
        btn.makeRow("🎵", "Music", "Download audio", "cmd_music");
        btn.makeRow("😂", "Joke", "Random joke", "cmd_joke");
        
        // Quick buttons
        btn.addReply("❓ Help", "btn_help")
           .addUrl("💬 Channel", config.MEDIA_URL || "https://whatsapp.com");
        
        await btn.send(from, conn, mek);
        
    } catch (error) {
        console.error("Image menu error:", error);
        reply("❌ Error: " + error.message);
    }
});

// ==================== COMMAND 3: Quick Image Buttons (Helper Function) ====================

cmd({
    pattern: "quickimg",
    alias: ["qimg", "fastimg"],
    desc: "Quick image buttons using helper function",
    category: "media",
    react: "⚡",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const imageUrl = "https://telegra.ph/file/ad25b2227fa2a1a01b707.jpg";
        
        const buttons = [
            { type: 'reply', text: '✅ Yes', id: 'quick_yes' },
            { type: 'reply', text: '❌ No', id: 'quick_no' },
            { type: 'url', text: '🌐 GitHub', url: 'https://github.com/Walukapah' },
            { type: 'copy', text: '📋 Copy Number', copy: '94728115797' }
        ];
        
        await sendImageButtons(
            conn,
            from,
            imageUrl,
            "⚡ *Quick Image Buttons*\n\nFast and easy button message!",
            config.BOT_NAME,
            buttons,
            mek
        );
        
    } catch (error) {
        console.error("Quick image error:", error);
        reply("❌ Error: " + error.message);
    }
});

// ==================== COMMAND 4: Image with Buffer (Downloaded Image) ====================

cmd({
    pattern: "imgbuffer",
    alias: ["buffimg", "downloadimg"],
    desc: "Send image buttons with downloaded buffer",
    category: "media",
    react: "📥",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        reply("⏳ Downloading image...");
        
        // Download image to buffer
        const imageUrl = config.ALIVE_IMG || "https://telegra.ph/file/ad25b2227fa2a1a01b707.jpg";
        const buffer = await getBuffer(imageUrl);
        
        const buttons = [
            { type: 'reply', text: '🎉 Awesome', id: 'buff_awesome' },
            { type: 'reply', text: '👍 Good', id: 'buff_good' },
            { type: 'url', text: '📷 Source', url: imageUrl }
        ];
        
        await sendImageBufferButtons(
            conn,
            from,
            buffer,
            "📥 *Downloaded Image*\n\nThis image was downloaded and sent as buffer!",
            "Buffer Test | " + config.BOT_NAME,
            buttons,
            mek
        );
        
    } catch (error) {
        console.error("Buffer image error:", error);
        reply("❌ Error: " + error.message);
    }
});

// ==================== COMMAND 5: Local Image File ====================

cmd({
    pattern: "localimg",
    alias: ["fileimg", "pathimg"],
    desc: "Send local image file with buttons",
    category: "media",
    react: "📁",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Check if local image exists, if not use URL
        const localPath = path.join(__dirname, '../media', 'menu.jpg');
        
        let imageSource;
        
        if (fs.existsSync(localPath)) {
            imageSource = localPath;
            console.log('[LOCALIMG] Using local file:', localPath);
        } else {
            // Fallback to URL
            imageSource = config.ALIVE_IMG || "https://telegra.ph/file/ad25b2227fa2a1a01b707.jpg";
            console.log('[LOCALIMG] Local file not found, using URL');
        }
        
        const btn = new Button();
        await btn.setImage(imageSource);
        
        btn.setTitle("📁 Local Image Test");
        btn.setBody("This demonstrates sending a local image file (or URL fallback) with buttons.");
        btn.setFooter(config.BOT_NAME);
        
        btn.addReply("✅ Works!", "local_success")
           .addReply("❌ Failed", "local_fail")
           .addUrl("🔗 Learn More", "https://github.com/Walukapah");
        
        await btn.send(from, conn, mek);
        
    } catch (error) {
        console.error("Local image error:", error);
        reply("❌ Error: " + error.message);
    }
});

// ==================== COMMAND 6: Video with Buttons ====================

cmd({
    pattern: "vidbtn",
    alias: ["videobutton", "vbtn"],
    desc: "Send video with buttons",
    category: "media",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        // Note: Video URLs need to be direct MP4 links
        const videoUrl = "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4"; // Sample video
        
        const btn = new Button();
        await btn.setVideo(videoUrl, { caption: "🎬 Video with Buttons!" });
        
        btn.setTitle("🎬 Video Demo");
        btn.setBody("This is a video message with interactive buttons!");
        btn.setFooter(config.BOT_NAME);
        
        btn.addReply("❤️ Like", "vid_like")
           .addReply("🔁 Share", "vid_share")
           .addUrl("📺 More Videos", "https://youtube.com");
        
        await btn.send(from, conn, mek);
        
    } catch (error) {
        console.error("Video button error:", error);
        reply("❌ Video error: " + error.message + "\n\nNote: Video buttons require direct MP4 URLs.");
    }
});

// ==================== COMMAND 7: Custom Image Menu Builder ====================

cmd({
    pattern: "custommenu",
    alias: ["cmenu", "buildmenu"],
    desc: "Build custom image menu",
    category: "media",
    react: "🛠️",
    filename: __filename
}, async (conn, mek, m, { from, reply, args, q }) => {
    try {
        // Parse custom options
        const options = q.split('|').map(s => s.trim());
        const title = options[0] || "Custom Menu";
        const imageUrl = options[1] || config.ALIVE_IMG || "https://telegra.ph/file/ad25b2227fa2a1a01b707.jpg";
        const description = options[2] || "Custom description here";
        
        const btn = new Button();
        await btn.setImage(imageUrl);
        
        btn.setTitle(title);
        btn.setBody(description);
        btn.setFooter("Custom Menu | " + config.BOT_NAME);
        
        // Add dynamic buttons based on args
        btn.addReply("✅ Option 1", "custom_1")
           .addReply("✅ Option 2", "custom_2")
           .addReply("✅ Option 3", "custom_3")
           .addUrl("🔗 External Link", "https://google.com");
        
        await btn.send(from, conn, mek);
        
    } catch (error) {
        console.error("Custom menu error:", error);
        reply("❌ Error: " + error.message + "\n\nUsage: .custommenu Title | ImageURL | Description");
    }
});

// ==================== COMMAND 8: Alive with Image Buttons ====================

cmd({
    pattern: "alivebtn",
    alias: ["alive2", "testalive"],
    desc: "Alive message with image and buttons",
    category: "main",
    react: "🤖",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const imageUrl = config.ALIVE_IMG || "https://telegra.ph/file/ad25b2227fa2a1a01b707.jpg";
        const uptime = require('../lib/functions').runtime(process.uptime());
        
        const btn = new Button();
        await btn.setImage(imageUrl);
        
        btn.setTitle(`🤖 ${config.BOT_NAME}`);
        btn.setSubtitle("System Online ✅");
        btn.setBody(`⏱️ Uptime: ${uptime}\n📊 Status: Running smoothly\n💾 Mode: ${config.MODE}\n\nWhat would you like to do?`);
        btn.setFooter("Tap a button to continue");
        
        btn.addReply("📜 Menu", "alive_menu")
           .addReply("🏓 Ping", "alive_ping")
           .addReply("👤 Owner", "alive_owner")
           .addUrl("💬 Channel", config.MEDIA_URL || "https://whatsapp.com")
           .addCopy("📞 Support", config.OWNER_NUMBER[0] || "94728115797");
        
        await btn.send(from, conn, mek);
        
    } catch (error) {
        console.error("Alive button error:", error);
        reply("❌ Error: " + error.message);
    }
});
