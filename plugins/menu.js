const { Button } = require('../lib/button');
const { cmd } = require('../command');
const config = require('../config');
const { runtime } = require('../lib/functions');

// Helper function to check if user is owner - FIXED
function checkIsOwner(config, userNumber) {
    const ownerNumber = Array.isArray(config.OWNER_NUMBER) 
        ? config.OWNER_NUMBER 
        : typeof config.OWNER_NUMBER === 'string' 
            ? [config.OWNER_NUMBER] 
            : [];
    
    // Clean numbers - keep country code
    const cleanUser = userNumber.replace(/[^0-9]/g, '');
    // Don't remove leading digits from owner numbers
    const cleanOwners = ownerNumber.map(n => n.toString().replace(/[^0-9]/g, ''));
    
    console.log("[CHECK_OWNER] User:", cleanUser);
    console.log("[CHECK_OWNER] Owners:", cleanOwners);
    
    // Check if user number ends with any owner number (handles LID case)
    // OR exact match
    const isMatch = cleanOwners.some(owner => {
        const exactMatch = cleanUser === owner;
        const endsWithMatch = cleanUser.endsWith(owner) || owner.endsWith(cleanUser);
        return exactMatch || endsWithMatch;
    });
    
    console.log("[CHECK_OWNER] Match:", isMatch);
    return isMatch;
}

// Helper to get actual phone number from mek.key - FIXED for LID
function getActualUserNumber(mek) {
    // Try remoteJidAlt first (contains actual phone number)
    if (mek.key.remoteJidAlt) {
        const altNumber = mek.key.remoteJidAlt.split('@')[0];
        console.log("[GET_USER] Using remoteJidAlt:", altNumber);
        return altNumber;
    }
    
    // Fallback to participant or remoteJid
    const jid = mek.key.participant || mek.key.remoteJid;
    if (!jid) return '';
    
    const number = jid.split('@')[0];
    console.log("[GET_USER] Using participant/remoteJid:", number);
    return number;
}

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
        const botName = config.BOT_NAME;
        const menuImg = config.MENU_IMG_URL;
        const prefix = config.PREFIX;
        const uptime = runtime(process.uptime());
        const usedRam = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalRam = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2);
        
        const btn = new Button();
        await btn.setImage(menuImg);
        btn.setTitle(`${botName} MENU`);
        
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
        
        btn.addSelection("📂 SELECT OPTION");
        btn.makeSection("⬇️ Select Option", `${botName}`);
        btn.makeRow("📥", "Download Commands", "Download Command Menu", "download_cmd");
        btn.makeRow("🔍", "Search Commands", "Search Command Menu", "search_cmd");
        btn.makeRow("👑", "Owner Commands", "Owner Command Menu", "owner_cmd");
        btn.makeRow("🛠️", "Other Commands", "Other Command Menu", "other_cmd");
        btn.makeRow("⚙️", "Settings", "Bot Settings Command Menu", "setting_cmd");
        btn.addUrl("💬 Channel", config.MEDIA_URL || "https://whatsapp.com");
        
        await btn.send(from, conn, mek);
        
    } catch (error) {
        console.error("Menu error:", error);
        reply("❌ Error loading menu: " + error.message);
    }
});

// Download Commands Handler
cmd({
    pattern: "download_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
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
});

// Search Commands Handler
cmd({
    pattern: "search_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
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
});

// Owner Commands Handler - FIXED for LID
cmd({
    pattern: "owner_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (body !== "owner_cmd") return;
    
    // FIXED: Get actual user number using remoteJidAlt (handles LID)
    const userNumber = getActualUserNumber(mek);
    
    console.log("[OWNER_CMD] mek.key:", JSON.stringify(mek.key));
    console.log("[OWNER_CMD] Extracted user number:", userNumber);
    
    const isOwner = checkIsOwner(config, userNumber);
    
    if (!isOwner) {
        return reply(`⛔ *This command is only for owners!*\n\nYour number: ${userNumber}\nConfig owners: ${JSON.stringify(config.OWNER_NUMBER)}`);
    }
    
    const prefix = config.PREFIX;
    const botName = config.BOT_NAME;
    
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
});

// Other Commands Handler
cmd({
    pattern: "other_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
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
});

// Settings Commands Handler - FIXED for LID
cmd({
    pattern: "setting_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (body !== "setting_cmd") return;
    
    // FIXED: Get actual user number using remoteJidAlt
    const userNumber = getActualUserNumber(mek);
    
    console.log("[SETTING_CMD] Extracted user number:", userNumber);
    
    const isOwner = checkIsOwner(config, userNumber);
    
    if (!isOwner) {
        return reply(`⛔ *This command is only for owners!*\n\nYour number: ${userNumber}`);
    }
    
    const prefix = config.PREFIX;
    const botName = config.BOT_NAME;
    
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
});
