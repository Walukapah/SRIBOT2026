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

// Helper to get display name for user
function getDisplayName(mek, pushname) {
    // If pushname is available and not empty, use it
    if (pushname && pushname !== 'Sin Nombre' && pushname !== 'undefined') {
        return pushname;
    }
    
    // Try to get from mek.pushName
    if (mek.pushName && mek.pushName !== 'Sin Nombre') {
        return mek.pushName;
    }
    
    // Fallback to user number
    const userNumber = getActualUserNumber(mek);
    return userNumber ? `@${userNumber}` : '@user';
}

// Main Menu Command - Supports both TEXT and BUTTON modes
cmd({
    pattern: "menu",
    alias: ["list", "commands", "cmd"],
    desc: "Show bot menu with interactive buttons or text",
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
        const messageType = config.MESSAGE_TYPE || 'button';
        
        // Get proper display name
        const displayName = getDisplayName(mek, pushname);
        const userNumber = sender.split('@')[0];
        
        // Common menu data
        const headerText = `👋 *ʜɪ* ${displayName}\n\n` +
            `*╭─「 BOT'S MENU 」*\n` +
            `*│*👾 *Bot*: *${botName}*\n` +
            `*│*👤 *User*: ${displayName}\n` +
            `*│*☎️ *Owners*: *waluka⚡*\n` +
            `*│*⏰ *Uptime*: ${uptime}\n` +
            `*│*📂 *Ram*: ${usedRam}MB / ${totalRam}MB\n` +
            `*│*✒️ *Prefix*: ${prefix}\n` +
            `╰──────────●●►\n\n`;
        
        // Check if TEXT mode or BUTTON mode
        if (messageType === 'text') {
            // ========== TEXT MODE ==========
            let textMenu = headerText +
                `📜 *COMMAND LIST*\n\n` +
                `*${prefix}downloadmenu* - 📥 Download Commands\n` +
                `*${prefix}searchmenu* - 🔍 Search Commands\n` +
                `*${prefix}ownermenu* - 👑 Owner Commands\n` +
                `*${prefix}othermenu* - 🛠️ Other Commands\n` +
                `*${prefix}settingsmenu* - ⚙️ Settings Commands\n\n` +
                `© ${botName} v${config.VERSION}`;
            
            // Send as text message with image
            await conn.sendMessage(from, {
                image: { url: menuImg },
                caption: textMenu,
                mentions: [sender]
            }, { quoted: mek });
            
        } else {
            // ========== BUTTON MODE ==========
            const btn = new Button();
            await btn.setImage(menuImg);
            btn.setTitle(`${botName} MENU`);
            
            // FIXED: Use display name instead of @mention in body
            // Button messages don't support mentions in body text properly
            const bodyText = `👋 *ʜɪ* ${displayName}\n\n` +
                `*╭─「 BOT'S MENU 」*\n` +
                `*│*👾 *Bot*: *${botName}*\n` +
                `*│*👤 *User*: ${displayName}\n` +
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
        }
        
    } catch (error) {
        console.error("Menu error:", error);
        reply("❌ Error loading menu: " + error.message);
    }
});

// Text Menu Commands (for MESSAGE_TYPE = 'text')
cmd({
    pattern: "downloadmenu",
    desc: "Show download commands",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const prefix = config.PREFIX;
    const botName = config.BOT_NAME;
    
    const menu = `*╭─「 📥 DOWNLOAD COMMANDS 」*\n` +
        `*│*\n` +
        `*│* ${prefix}ytmp3 <url> - *YouTube MP3*\n` +
        `*│* ${prefix}ytmp4 <url> - *YouTube Video*\n` +
        `*│* ${prefix}play <song> - *Search & Download*\n` +
        `*│* ${prefix}tiktok <url> - *TikTok Video*\n` +
        `*│* ${prefix}ig <url> - *Instagram*\n` +
        `*│* ${prefix}fb <url> - *Facebook*\n` +
        `*│* ${prefix}twitter <url> - *Twitter/X*\n` +
        `*│* ${prefix}mediafire <url> - *MediaFire*\n` +
        `*│* ${prefix}gdrive <url> - *Google Drive*\n` +
        `*│* ${prefix}apk <app> - *APK Download*\n` +
        `*│*\n` +
        `╰──────────●●►\n\n` +
        `© ${botName} v${config.VERSION}`;
    
    await reply(menu);
});

cmd({
    pattern: "searchmenu",
    desc: "Show search commands",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const prefix = config.PREFIX;
    const botName = config.BOT_NAME;
    
    const menu = `*╭─「 🔍 SEARCH COMMANDS 」*\n` +
        `*│*\n` +
        `*│* ${prefix}yts <query> - *YouTube Search*\n` +
        `*│* ${prefix}img <query> - *Google Images*\n` +
        `*│* ${prefix}pinterest <query> - *Pinterest*\n` +
        `*│* ${prefix}wiki <query> - *Wikipedia*\n` +
        `*│* ${prefix}news - *Latest News*\n` +
        `*│* ${prefix}weather <city> - *Weather*\n` +
        `*│* ${prefix}movie <name> - *Movie Info*\n` +
        `*│* ${prefix}songinfo <name> - *Song Info*\n` +
        `*│* ${prefix}lyrics <song> - *Lyrics*\n` +
        `*│* ${prefix}github <user> - *GitHub*\n` +
        `*│*\n` +
        `╰──────────●●►\n\n` +
        `© ${botName} v${config.VERSION}`;
    
    await reply(menu);
});

cmd({
    pattern: "ownermenu",
    desc: "Show owner commands",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, reply, sender, pushname }) => {
    const userNumber = getActualUserNumber(mek);
    const isOwner = checkIsOwner(config, userNumber);
    
    if (!isOwner) {
        const displayName = getDisplayName(mek, pushname);
        return reply(`⛔ *This command is only for owners!*\n\nUser: ${displayName}`);
    }
    
    const prefix = config.PREFIX;
    const botName = config.BOT_NAME;
    
    const menu = `*╭─「 👑 OWNER COMMANDS 」*\n` +
        `*│*\n` +
        `*│* ${prefix}broadcast <text> - *Send to all*\n` +
        `*│* ${prefix}ban <@user> - *Ban User*\n` +
        `*│* ${prefix}unban <@user> - *Unban User*\n` +
        `*│* ${prefix}restart - *Restart Bot*\n` +
        `*│* ${prefix}shutdown - *Shutdown*\n` +
        `*│* ${prefix}setvar <var>=<val> - *Set Config*\n` +
        `*│* ${prefix}getvar <var> - *Get Config*\n` +
        `*│* ${prefix}block <@user> - *Block*\n` +
        `*│* ${prefix}unblock <@user> - *Unblock*\n` +
        `*│* ${prefix}join <link> - *Join Group*\n` +
        `*│* ${prefix}leave - *Leave Group*\n` +
        `*│* ${prefix}addsudo <num> - *Add Owner*\n` +
        `*│* ${prefix}delsudo <num> - *Remove Owner*\n` +
        `*│*\n` +
        `╰──────────●●►\n\n` +
        `© ${botName} v${config.VERSION}`;
    
    await reply(menu);
});

cmd({
    pattern: "othermenu",
    desc: "Show other commands",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    const prefix = config.PREFIX;
    const botName = config.BOT_NAME;
    
    const menu = `*╭─「 🛠️ OTHER COMMANDS 」*\n` +
        `*│*\n` +
        `*│* ${prefix}sticker - *Create Sticker*\n` +
        `*│* ${prefix}toimg - *Sticker to Image*\n` +
        `*│* ${prefix}tovid - *Sticker to Video*\n` +
        `*│* ${prefix}ttp <text> - *Text to Pic*\n` +
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
    
    await reply(menu);
});

cmd({
    pattern: "settingsmenu",
    desc: "Show settings commands",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, reply, pushname }) => {
    const botNumber = conn.user.id.split(':')[0];
    const userNumber = getActualUserNumber(mek);
    
    // STRICT CHECK: Only bot number itself
    const cleanBot = botNumber.replace(/[^0-9]/g, '');
    const cleanUser = userNumber.replace(/[^0-9]/g, '');
    const isBotItself = cleanUser === cleanBot || cleanUser.endsWith(cleanBot) || mek.key.fromMe;
    
    if (!isBotItself) {
        const displayName = getDisplayName(mek, pushname);
        return reply(`⛔ *Settings commands are restricted to bot number only!*\n\nUser: ${displayName}`);
    }
    
    const prefix = config.PREFIX;
    const botName = config.BOT_NAME;
    
    const menu = `*╭─「 ⚙️ SETTINGS COMMANDS 」*\n` +
        `*│*\n` +
        `*│* ${prefix}autoread <on/off> - *Auto Read Status*\n` +
        `*│* ${prefix}autoreact <on/off> - *Auto React Status*\n` +
        `*│* ${prefix}antidelete <on/off> - *Anti Delete*\n` +
        `*│* ${prefix}antilink <on/off> - *Anti Links*\n` +
        `*│* ${prefix}antispam <on/off> - *Anti Spam*\n` +
        `*│* ${prefix}autorecord <on/off> - *Auto Recording*\n` +
        `*│* ${prefix}mode <public/private> - *Bot Mode*\n` +
        `*│* ${prefix}prefix <new> - *Change Prefix*\n` +
        `*│* ${prefix}messagetype <text/button> - *Message Type*\n` +
        `*│* ${prefix}aliveimg <url> - *Set Alive Img*\n` +
        `*│* ${prefix}menuimg <url> - *Set Menu Img*\n` +
        `*│* ${prefix}botname <name> - *Change Bot Name*\n` +
        `*│* ${prefix}alivemsg <text> - *Set Alive Msg*\n` +
        `*│* ${prefix}reactemoji <emoji> - *Status React*\n` +
        `*│*\n` +
        `╰──────────●●►\n\n` +
        `© ${botName} v${config.VERSION}`;
    
    await reply(menu);
});

// Button Response Handlers (keep existing ones for button mode)
// Download Commands Handler
cmd({
    pattern: "download_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body, pushname }) => {
    if (body !== "download_cmd") return;
    
    const prefix = config.PREFIX;
    const botName = config.BOT_NAME;
    const displayName = getDisplayName(mek, pushname);
    
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
}, async (conn, mek, m, { from, reply, body, pushname }) => {
    if (body !== "search_cmd") return;
    
    const prefix = config.PREFIX;
    const botName = config.BOT_NAME;
    const displayName = getDisplayName(mek, pushname);
    
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
}, async (conn, mek, m, { from, reply, body, pushname }) => {
    if (body !== "owner_cmd") return;
    
    // FIXED: Get actual user number using remoteJidAlt (handles LID)
    const userNumber = getActualUserNumber(mek);
    const displayName = getDisplayName(mek, pushname);
    
    console.log("[OWNER_CMD] mek.key:", JSON.stringify(mek.key));
    console.log("[OWNER_CMD] Extracted user number:", userNumber);
    console.log("[OWNER_CMD] Display name:", displayName);
    
    const isOwner = checkIsOwner(config, userNumber);
    
    if (!isOwner) {
        return reply(`⛔ *This command is only for owners!*\n\nUser: ${displayName}\nNumber: ${userNumber}`);
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
}, async (conn, mek, m, { from, reply, body, pushname }) => {
    if (body !== "other_cmd") return;
    
    const prefix = config.PREFIX;
    const botName = config.BOT_NAME;
    const displayName = getDisplayName(mek, pushname);
    
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

// Settings Commands Handler - BOT NUMBER ONLY
cmd({
    pattern: "setting_cmd",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body, pushname }) => {
    if (body !== "setting_cmd") return;
    
    // BOT NUMBER ONLY - Check if message is from bot itself
    const botNumber = conn.user.id.split(':')[0];
    const userNumber = getActualUserNumber(mek);
    const displayName = getDisplayName(mek, pushname);
    
    console.log("[SETTING_CMD] Bot number:", botNumber);
    console.log("[SETTING_CMD] User number:", userNumber);
    console.log("[SETTING_CMD] Display name:", displayName);
    
    // STRICT CHECK: Only allow if user is the bot number itself
    const cleanBot = botNumber.replace(/[^0-9]/g, '');
    const cleanUser = userNumber.replace(/[^0-9]/g, '');
    const isBotItself = cleanUser === cleanBot || cleanUser.endsWith(cleanBot) || mek.key.fromMe;
    
    if (!isBotItself) {
        return reply(`⛔ *Settings commands are restricted to bot number only!*\n\nUser: ${displayName}\nYour number: ${userNumber}\nAllowed: ${botNumber}`);
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
        `*│* ${prefix}messagetype <text/button> - *Message Type*\n` +
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
