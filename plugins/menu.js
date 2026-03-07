const { Button } = require('../lib/button');
const { cmd } = require('../command');
const config = require('../config');
const { runtime } = require('../lib/functions');

// Main Menu Command
cmd({
    pattern: "menu",
    alias: ["list", "commands", "cmd"],
    desc: "Show bot menu with interactive buttons",
    category: "main",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, reply, pushname, sender }) => {
    try {
        // Get dynamic config values
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
        
        // Build body text
        const bodyText = `👋 *ʜɪ* @${sender.split('@')[0]}\n\n` +
            `*╭─「 BOT'S MENU 」*\n` +
            `*│*👾 *Bot*: *${botName}*\n` +
            `*│*👤 *User*: @${sender.split('@')[0]}\n` +
            `*│*☎️ *Owners*: *waluka⚡*\n` +
            `*│*⏰ *Uptime*: ${uptime}\n` +
            `*│*📂 *Ram*: ${usedRam}MB / ${totalRam}MB\n` +
            `*│*✒️ *Prefix*: ${prefix}\n` +
            `╰──────────●●►\n\n` +
            `🎀 Ξ *Select a Command List:* Ξ`;
        
        btn.setBody(bodyText);
        btn.setFooter(`© ${botName} v${config.VERSION}`);
        
        // Add dropdown selection menu
        btn.addSelection("📂 SELECT OPTION");
        
        // Section 1: Main Options
        btn.makeSection("⬇️ Select Option", `${botName}`);
        btn.makeRow("📥", "Download Commands", "Download Command Menu", "download_cmd");
        btn.makeRow("🔍", "Search Commands", "Search Command Menu", "search_cmd");
        btn.makeRow("👑", "Owner Commands", "Owner Command Menu", "owner_cmd");
        btn.makeRow("🛠️", "Other Commands", "Other Command Menu", "other_cmd");
        btn.makeRow("⚙️", "Settings", "Bot Settings Command Menu", "setting_cmd");

        // Add quick action buttons
        btn.addUrl("💬 Channel", config.MEDIA_URL || "https://whatsapp.com");
        
        // Send the message
        await btn.send(from, conn, mek);
        
    } catch (error) {
        console.error("Menu error:", error);
        reply("❌ Error loading menu: " + error.message);
    }
});

// Download Commands Handler - FIXED: on: "body" with pattern check
cmd({
    pattern: "download_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, sender, body }) => {
    try {
        // Check if body matches the pattern
        if (body !== "download_cmd") return;
        
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        
        const downloadMenu = `*╭─「 📥 DOWNLOAD COMMANDS 」*\n` +
            `*│*\n` +
            `*│* ${prefix}ytmp3 <url> - *YouTube MP3*\n` +
            `*│* ${prefix}ytmp4 <url> - *YouTube Video*\n` +
            `*│* ${prefix}play <song name> - *Search & Download*\n` +
            `*│* ${prefix}tiktok <url> - *TikTok Video*\n` +
            `*│* ${prefix}ig <url> - *Instagram Download*\n` +
            `*│* ${prefix}fb <url> - *Facebook Video*\n` +
            `*│* ${prefix}twitter <url> - *Twitter/X Video*\n` +
            `*│* ${prefix}mediafire <url> - *MediaFire Download*\n` +
            `*│* ${prefix}gdrive <url> - *Google Drive*\n` +
            `*│* ${prefix}apk <app name> - *APK Download*\n` +
            `*│*\n` +
            `╰──────────●●►\n\n` +
            `© ${botName} v${config.VERSION}`;
        
        await reply(downloadMenu);
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// Search Commands Handler - FIXED
cmd({
    pattern: "search_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    try {
        // Check if body matches the pattern
        if (body !== "search_cmd") return;
        
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        
        const searchMenu = `*╭─「 🔍 SEARCH COMMANDS 」*\n` +
            `*│*\n` +
            `*│* ${prefix}yts <query> - *YouTube Search*\n` +
            `*│* ${prefix}img <query> - *Google Image Search*\n` +
            `*│* ${prefix}pinterest <query> - *Pinterest Search*\n` +
            `*│* ${prefix}wiki <query> - *Wikipedia Search*\n` +
            `*│* ${prefix}news - *Latest News*\n` +
            `*│* ${prefix}weather <city> - *Weather Info*\n` +
            `*│* ${prefix}movie <name> - *Movie Info*\n` +
            `*│* ${prefix}songinfo <name> - *Song Information*\n` +
            `*│* ${prefix}lyrics <song> - *Song Lyrics*\n` +
            `*│* ${prefix}github <user> - *GitHub Profile*\n` +
            `*│*\n` +
            `╰──────────●●►\n\n` +
            `© ${botName} v${config.VERSION}`;
        
        await reply(searchMenu);
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// Owner Commands Handler - FIXED
cmd({
    pattern: "owner_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, sender, body }) => {
    try {
        // Check if body matches the pattern
        if (body !== "owner_cmd") return;
        
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        
        // Check if sender is owner
        const isOwner = config.OWNER_NUMBER.includes(sender.split('@')[0]);
        
        if (!isOwner) {
            return reply("⛔ *This command is only for owners!*");
        }
        
        const ownerMenu = `*╭─「 👑 OWNER COMMANDS 」*\n` +
            `*│*\n` +
            `*│* ${prefix}broadcast <text> - *Send to all*\n` +
            `*│* ${prefix}ban <@user> - *Ban User*\n` +
            `*│* ${prefix}unban <@user> - *Unban User*\n` +
            `*│* ${prefix}restart - *Restart Bot*\n` +
            `*│* ${prefix}shutdown - *Shutdown Bot*\n` +
            `*│* ${prefix}setvar <var>=<value> - *Set Config*\n` +
            `*│* ${prefix}getvar <var> - *Get Config*\n` +
            `*│* ${prefix}block <@user> - *Block User*\n` +
            `*│* ${prefix}unblock <@user> - *Unblock User*\n` +
            `*│* ${prefix}join <group link> - *Join Group*\n` +
            `*│* ${prefix}leave - *Leave Group*\n` +
            `*│* ${prefix}addsudo <number> - *Add Owner*\n` +
            `*│* ${prefix}delsudo <number> - *Remove Owner*\n` +
            `*│*\n` +
            `╰──────────●●►\n\n` +
            `© ${botName} v${config.VERSION}`;
        
        await reply(ownerMenu);
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// Other Commands Handler - FIXED
cmd({
    pattern: "other_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    try {
        // Check if body matches the pattern
        if (body !== "other_cmd") return;
        
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        
        const otherMenu = `*╭─「 🛠️ OTHER COMMANDS 」*\n` +
            `*│*\n` +
            `*│* ${prefix}sticker - *Create Sticker*\n` +
            `*│* ${prefix}toimg - *Sticker to Image*\n` +
            `*│* ${prefix}tovid - *Sticker to Video*\n` +
            `*│* ${prefix}ttp <text> - *Text to Picture*\n` +
            `*│* ${prefix}attp <text> - *Animated Text*\n` +
            `*│* ${prefix}emojimix 🎉+😂 - *Mix Emojis*\n` +
            `*│* ${prefix}translate <lang> <text> - *Translate*\n` +
            `*│* ${prefix}tts <text> - *Text to Speech*\n` +
            `*│* ${prefix}qr <text> - *Generate QR*\n` +
            `*│* ${prefix}short <url> - *Short URL*\n` +
            `*│* ${prefix}calc <math> - *Calculator*\n` +
            `*│* ${prefix}time - *Current Time*\n` +
            `*│* ${prefix}date - *Current Date*\n` +
            `*│* ${prefix}joke - *Random Joke*\n` +
            `*│* ${prefix}fact - *Random Fact*\n` +
            `*│* ${prefix}quote - *Random Quote*\n` +
            `*│*\n` +
            `╰──────────●●►\n\n` +
            `© ${botName} v${config.VERSION}`;
        
        await reply(otherMenu);
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// Settings Commands Handler - FIXED
cmd({
    pattern: "setting_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, sender, body }) => {
    try {
        // Check if body matches the pattern
        if (body !== "setting_cmd") return;
        
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        
        // Check if sender is owner
        const isOwner = config.OWNER_NUMBER.includes(sender.split('@')[0]);
        
        if (!isOwner) {
            return reply("⛔ *This command is only for owners!*");
        }
        
        const settingsMenu = `*╭─「 ⚙️ SETTINGS COMMANDS 」*\n` +
            `*│*\n` +
            `*│* ${prefix}autoread <on/off> - *Auto Read Status*\n` +
            `*│* ${prefix}autoreact <on/off> - *Auto React Status*\n` +
            `*│* ${prefix}antidelete <on/off> - *Anti Delete Msgs*\n` +
            `*│* ${prefix}antilink <on/off> - *Anti Group Links*\n` +
            `*│* ${prefix}antispam <on/off> - *Anti Spam*\n` +
            `*│* ${prefix}autorecord <on/off> - *Auto Recording*\n` +
            `*│* ${prefix}mode <public/private> - *Bot Mode*\n` +
            `*│* ${prefix}prefix <newprefix> - *Change Prefix*\n` +
            `*│* ${prefix}aliveimg <url> - *Set Alive Image*\n` +
            `*│* ${prefix}menuimg <url> - *Set Menu Image*\n` +
            `*│* ${prefix}botname <name> - *Change Bot Name*\n` +
            `*│* ${prefix}alivemsg <text> - *Set Alive Message*\n` +
            `*│* ${prefix}reactemoji <emoji> - *Set Status React*\n` +
            `*│*\n` +
            `╰──────────●●►\n\n` +
            `© ${botName} v${config.VERSION}`;
        
        await reply(settingsMenu);
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});
