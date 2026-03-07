const { cmd } = require('../command');
const config = require('../config');
const { runtime } = require('../lib/functions');

// ============================================
// MENU BUTTON RESPONSES - Specific Handlers
// ============================================

// Download Commands Menu
cmd({
    pattern: "download_cmd",
    on: "text",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, sender }) => {
    try {
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        
        const downloadMenu = `*╭─「 📥 DOWNLOAD COMMANDS 」*
*│*
*│* ${prefix}ytmp3 <url> - *YouTube MP3*
*│* ${prefix}ytmp4 <url> - *YouTube Video*
*│* ${prefix}play <song name> - *Search & Download*
*│* ${prefix}tiktok <url> - *TikTok Video*
*│* ${prefix}ig <url> - *Instagram Download*
*│* ${prefix}fb <url> - *Facebook Video*
*│* ${prefix}twitter <url> - *Twitter/X Video*
*│* ${prefix}mediafire <url> - *MediaFire Download*
*│* ${prefix}gdrive <url> - *Google Drive*
*│* ${prefix}apk <app name> - *APK Download*
*│*
╰──────────●●►

© ${botName} v${config.VERSION}`;
        
        await reply(downloadMenu);
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// Search Commands Menu
cmd({
    pattern: "search_cmd",
    on: "text",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        
        const searchMenu = `*╭─「 🔍 SEARCH COMMANDS 」*
*│*
*│* ${prefix}yts <query> - *YouTube Search*
*│* ${prefix}img <query> - *Google Image Search*
*│* ${prefix}pinterest <query> - *Pinterest Search*
*│* ${prefix}wiki <query> - *Wikipedia Search*
*│* ${prefix}news - *Latest News*
*│* ${prefix}weather <city> - *Weather Info*
*│* ${prefix}movie <name> - *Movie Info*
*│* ${prefix}songinfo <name> - *Song Information*
*│* ${prefix}lyrics <song> - *Song Lyrics*
*│* ${prefix}github <user> - *GitHub Profile*
*│*
╰──────────●●►

© ${botName} v${config.VERSION}`;
        
        await reply(searchMenu);
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// Owner Commands Menu
cmd({
    pattern: "owner_cmd",
    on: "text",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, sender }) => {
    try {
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        
        // Check if sender is owner
        const isOwner = config.OWNER_NUMBER.includes(sender.split('@')[0]);
        
        if (!isOwner) {
            return reply("⛔ *This command is only for owners!*");
        }
        
        const ownerMenu = `*╭─「 👑 OWNER COMMANDS 」*
*│*
*│* ${prefix}broadcast <text> - *Send to all*
*│* ${prefix}ban <@user> - *Ban User*
*│* ${prefix}unban <@user> - *Unban User*
*│* ${prefix}restart - *Restart Bot*
*│* ${prefix}shutdown - *Shutdown Bot*
*│* ${prefix}setvar <var>=<value> - *Set Config*
*│* ${prefix}getvar <var> - *Get Config*
*│* ${prefix}block <@user> - *Block User*
*│* ${prefix}unblock <@user> - *Unblock User*
*│* ${prefix}join <group link> - *Join Group*
*│* ${prefix}leave - *Leave Group*
*│* ${prefix}addsudo <number> - *Add Owner*
*│* ${prefix}delsudo <number> - *Remove Owner*
*│*
╰──────────●●►

© ${botName} v${config.VERSION}`;
        
        await reply(ownerMenu);
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// Other Commands Menu
cmd({
    pattern: "other_cmd",
    on: "text",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        
        const otherMenu = `*╭─「 🛠️ OTHER COMMANDS 」*
*│*
*│* ${prefix}sticker - *Create Sticker*
*│* ${prefix}toimg - *Sticker to Image*
*│* ${prefix}tovid - *Sticker to Video*
*│* ${prefix}ttp <text> - *Text to Picture*
*│* ${prefix}attp <text> - *Animated Text*
*│* ${prefix}emojimix 🎉+😂 - *Mix Emojis*
*│* ${prefix}translate <lang> <text> - *Translate*
*│* ${prefix}tts <text> - *Text to Speech*
*│* ${prefix}qr <text> - *Generate QR*
*│* ${prefix}short <url> - *Short URL*
*│* ${prefix}calc <math> - *Calculator*
*│* ${prefix}time - *Current Time*
*│* ${prefix}date - *Current Date*
*│* ${prefix}joke - *Random Joke*
*│* ${prefix}fact - *Random Fact*
*│* ${prefix}quote - *Random Quote*
*│*
╰──────────●●►

© ${botName} v${config.VERSION}`;
        
        await reply(otherMenu);
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// Settings Commands Menu
cmd({
    pattern: "setting_cmd",
    on: "text",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, sender }) => {
    try {
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        
        // Check if sender is owner
        const isOwner = config.OWNER_NUMBER.includes(sender.split('@')[0]);
        
        if (!isOwner) {
            return reply("⛔ *This command is only for owners!*");
        }
        
        const settingsMenu = `*╭─「 ⚙️ SETTINGS COMMANDS 」*
*│*
*│* ${prefix}autoread <on/off> - *Auto Read Status*
*│* ${prefix}autoreact <on/off> - *Auto React Status*
*│* ${prefix}antidelete <on/off> - *Anti Delete Msgs*
*│* ${prefix}antilink <on/off> - *Anti Group Links*
*│* ${prefix}antispam <on/off> - *Anti Spam*
*│* ${prefix}autorecord <on/off> - *Auto Recording*
*│* ${prefix}mode <public/private> - *Bot Mode*
*│* ${prefix}prefix <newprefix> - *Change Prefix*
*│* ${prefix}aliveimg <url> - *Set Alive Image*
*│* ${prefix}menuimg <url> - *Set Menu Image*
*│* ${prefix}botname <name> - *Change Bot Name*
*│* ${prefix}alivemsg <text> - *Set Alive Message*
*│* ${prefix}reactemoji <emoji> - *Set Status React*
*│*
╰──────────●●►

© ${botName} v${config.VERSION}`;
        
        await reply(settingsMenu);
    } catch (error) {
        reply("❌ Error: " + error.message);
    }
});

// ============================================
// ADDITIONAL MENU BUTTONS (Quick Actions)
// ============================================

cmd({
    pattern: "menu_ping",
    on: "text",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const start = Date.now();
    await reply("🏓 *Pong!*");
    const end = Date.now();
    await reply(`⏱️ *Response Time:* ${end - start}ms`);
});

cmd({
    pattern: "menu_owner",
    on: "text",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const owner = config.OWNER_NUMBER[0] || "94728115797";
    await reply(`👤 *Owner:* @${owner}
📞 *Contact:* wa.me/${owner}

💬 *Support:* ${config.MEDIA_URL || "https://whatsapp.com"}`);
});
