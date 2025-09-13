// For fs.existsSync and fs.mkdirSync
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    isJidBroadcast,
    getContentType,
    proto,
    generateWAMessageContent,
    generateWAMessage,
    AnyMessageContent,
    prepareWAMessageMedia,
    areJidsSameUser,
    downloadContentFromMessage,
    MessageRetryMap,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    generateMessageID, makeInMemoryStore,
    jidDecode,
    fetchLatestBaileysVersion,
    Browsers,
    delay
} = require('@whiskeysockets/baileys');


// Load config (assuming config.js exists and has necessary properties)
const l = console.log
const P = require('pino');
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const util = require('util');
const { sms,downloadMediaMessage } = require('./lib/msg');
const axios = require('axios');
const prefix = config.PREFIX
const ownerNumber = config.OWNER_NUMBER
const port = process.env.PORT || 8000;

// Multi-number support variables
const activeSockets = new Map();
const socketCreationTime = new Map();
const SESSION_BASE_PATH = './sessions'; // Changed to 'sessions' for consistency

// Ensure session directory exists
if (!fs.existsSync(SESSION_BASE_PATH)) {
    fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

// Load admin numbers
function loadAdmins() {
    try {
        if (fs.existsSync('./admins.json')) {
            return JSON.parse(fs.readFileSync('./admins.json', 'utf8'));
        }
        return [];
    } catch (error) {
        console.error('Failed to load admin list:', error);
        return [];
    }
}

// Format message function
function formatMessage(title, content, footer) {
    return `${title}\n\n${content}\n\n${footer}`;
}

// Multi-number connection function
async function connectToWAMulti(number, res = null) { // Added res parameter for initial connection response
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);

    console.log(`Connecting WhatsApp bot for number: ${sanitizedNumber}...`);

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        const conn = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS("Firefox"),
            syncFullHistory: true,
            auth: state,
            version
        });

        // Store socket and creation time
        activeSockets.set(sanitizedNumber, conn);
        socketCreationTime.set(sanitizedNumber, Date.now());

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(`Connection lost for ${sanitizedNumber}. Reason: ${lastDisconnect?.error?.message || 'Unknown'}. Reconnecting: ${shouldReconnect}`);

                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);

                if (shouldReconnect) {
                    await delay(5000);
                    console.log(`Attempting to reconnect ${sanitizedNumber}...`);
                    connectToWAMulti(number); // Reconnect without passing res
                } else {
                    console.log(`Logged out from ${sanitizedNumber}, removing session files.`);
                    await fsExtra.remove(sessionPath); // Remove local session files
                }
            // index.js (සංශෝධිත plugins load කිරීමේ part එක)
} else if (connection === 'open') {
    console.log('Installing plugins...');
    
    try {
        // Load commands first
        const { commands } = require('./command');
        console.log(`Loaded ${commands.length} commands`);
        
        // Then load plugins from plugins directory
        const pluginPath = path.join(__dirname, 'plugins');
        if (fs.existsSync(pluginPath)) {
            const pluginFiles = fs.readdirSync(pluginPath).filter(file => 
                path.extname(file).toLowerCase() === '.js'
            );
            
            console.log(`Found ${pluginFiles.length} plugin files`);
            
            for (const pluginFile of pluginFiles) {
                try {
                    const pluginPathFull = path.join(pluginPath, pluginFile);
                    console.log(`Loading plugin: ${pluginFile}`);
                    
                    // Clear cache for this specific plugin
                    delete require.cache[require.resolve(pluginPathFull)];
                    
                    const plugin = require(pluginPathFull);
                    
                    if (typeof plugin === 'function') {
                        plugin(conn);
                        console.log(`✓ Successfully loaded plugin: ${pluginFile}`);
                    } else {
                        console.log(`✗ Plugin ${pluginFile} is not a function`);
                    }
                } catch (pluginError) {
                    console.error(`✗ Failed to load plugin ${pluginFile}:`, pluginError.message);
                }
            }
        } else {
            console.log('Plugins directory not found, creating...');
            fs.mkdirSync(pluginPath, { recursive: true });
        }
        
        console.log(`All plugins loaded successfully for ${sanitizedNumber}`);
    } catch (error) {
        console.error(`Error loading plugins for ${sanitizedNumber}:`, error.message);
    }
    
    console.log(`Bot connected for number: ${sanitizedNumber}`);
    // ... rest of your connection code


                // Add number to numbers.json if not already present
                const numbersPath = './numbers.json';
                let storedNumbers = [];
                if (fs.existsSync(numbersPath)) {
                    storedNumbers = JSON.parse(fs.readFileSync(numbersPath, 'utf8'));
                }
                if (!storedNumbers.includes(sanitizedNumber)) {
                    storedNumbers.push(sanitizedNumber);
                    fs.writeFileSync(numbersPath, JSON.stringify(storedNumbers, null, 2));
                }

                // Send connection success message to admin
                const admins = loadAdmins();
                const caption = formatMessage(
                    '*Connected Successful ✅*',
                    `📞 Number: ${sanitizedNumber}\n🩵 Status: Online`,
                    `${config.BOT_NAME}`
                );

                for (const admin of admins) {
                    try {
                        await conn.sendMessage(
                            `${admin}@s.whatsapp.net`,
                            { text: caption }
                        );
                    } catch (error) {
                        console.error(`Failed to send connect message to admin ${admin}:`, error);
                    }
                }

                // Send success response to web interface if applicable
                if (res && !res.headersSent) {
                    res.status(200).send({ status: 'connected', message: 'Bot connected successfully!' });
                }
            }
        });

        conn.ev.on('creds.update', saveCreds);

        // Setup message handlers for this connection
        setupMessageHandlers(conn, sanitizedNumber);

        // Request pairing code if not registered
        if (!conn.authState.creds.registered) {
            let code;
            try {
                await delay(1500);
                code = await conn.requestPairingCode(sanitizedNumber);
                console.log(`Pairing code for ${sanitizedNumber}: ${code}`);
            } catch (error) {
                console.error(`Failed to request pairing code for ${sanitizedNumber}:`, error);
                if (res && !res.headersSent) {
                    return res.status(500).send({ error: 'Failed to generate pairing code.' });
                }
            }
            if (res && !res.headersSent) {
                res.status(200).send({ code });
            }
        }

    } catch (error) {
        console.error(`Failed to connect number ${sanitizedNumber}:`, error);
        activeSockets.delete(sanitizedNumber);
        socketCreationTime.delete(sanitizedNumber);
        if (res && !res.headersSent) {
            res.status(500).send({ error: 'Service Unavailable or Connection Failed.' });
        }
    }
}

// Setup message handlers for each connection
function setupMessageHandlers(conn, number) {
    conn.ev.on('messages.upsert', async (mek) => {
        mek = mek.messages[0];
        if (!mek.message) return;
        mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;

        const reset = "\x1b[0m";
        const red = "\x1b[31m";
        const green = "\x1b[32m";
        const blue = "\x1b[34m";
        const cyan = "\x1b[36m";
        const bold = "\x1b[1m";

        console.log(red + "☰".repeat(32) + reset);
        console.log(green + bold + `New Message for ${number}:` + reset);
        console.log(cyan + JSON.stringify(mek, null, 2) + reset);
        console.log(red + "☰".repeat(32) + reset);

        // Auto mark as seen
        if (config.MARK_AS_SEEN === 'true') {
            try {
                await conn.sendReadReceipt(mek.key.remoteJid, mek.key.id, [mek.key.participant || mek.key.remoteJid]);
                console.log(blue + `Marked message from ${mek.key.remoteJid} as seen for ${number}.` + reset);
            } catch (error) {
                console.error(red + `Error marking message as seen for ${number}:`, error + reset);
            }
        }

        // Auto read messages
        if (config.READ_MESSAGE === 'true') {
            try {
                await conn.readMessages([mek.key]);
                console.log(cyan + `Marked message from ${mek.key.remoteJid} as read for ${number}.` + reset);
            } catch (error) {
                console.error(red + `Error marking message as read for ${number}:`, error + reset);
            }
        }

        // Status updates handling
        if (mek.key && mek.key.remoteJid === 'status@broadcast') {
            // Auto read Status
            if (config.AUTO_READ_STATUS === "true") {
                try {
                    await conn.readMessages([mek.key]);
                    console.log(green + `Status from ${mek.key.participant || mek.key.remoteJid} marked as read for ${number}.` + reset);
                } catch (error) {
                    console.error(red + `Error reading status for ${number}:`, error + reset);
                }
            }

            // Auto react to Status
            if (config.AUTO_REACT_STATUS === "true") {
                try {
                    await conn.sendMessage(
                        mek.key.participant || mek.key.remoteJid,
                        { react: { text: config.AUTO_REACT_STATUS_EMOJI, key: mek.key } }
                    );
                    console.log(green + `Reacted to status from ${mek.key.participant || mek.key.remoteJid} for ${number}` + reset);
                } catch (error) {
                    console.error(red + `Error reacting to status for ${number}:`, error + reset);
                }
            }
            return;
        }

        const m = sms(conn, mek)
  const type = getContentType(mek.message)
  const content = JSON.stringify(mek.message)
  const from = mek.key.remoteJid
  const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
  
        
        const body = (type === 'conversation') 
  ? mek.message.conversation 
  : (type === 'extendedTextMessage') 
    ? mek.message.extendedTextMessage.text 
    : (type === 'imageMessage') && mek.message.imageMessage.caption 
      ? mek.message.imageMessage.caption 
      : (type === 'videoMessage') && mek.message.videoMessage.caption 
        ? mek.message.videoMessage.caption 
        : (type === 'buttonsResponseMessage')
          ? mek.message.buttonsResponseMessage.selectedButtonId
          : (type === 'listResponseMessage')
            ? mek.message.listResponseMessage.title
            : (type === 'templateButtonReplyMessage')
              ? mek.message.templateButtonReplyMessage.selectedId || 
                mek.message.templateButtonReplyMessage.selectedDisplayText
              : (type === 'interactiveResponseMessage')
                ? mek.message.interactiveResponseMessage?.body?.text ||
                  (mek.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson 
                    ? JSON.parse(mek.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id 
                    : mek.message.interactiveResponseMessage?.buttonReply?.buttonId || '')
                : (type === 'messageContextInfo')
                  ? mek.message.buttonsResponseMessage?.selectedButtonId ||
                    mek.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
                    mek.message.interactiveResponseMessage?.body?.text ||
                    (mek.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson 
                      ? JSON.parse(mek.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id
                      : '')
                  : (type === 'senderKeyDistributionMessage')
                    ? mek.message.conversation || 
                      mek.message.imageMessage?.caption ||
                      ''
                    : '';
        
  const isCmd = body.startsWith(prefix)
  var budy = typeof mek.text == 'string' ? mek.text : false;
  const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
  const args = body.trim().split(/ +/).slice(1)
  const q = args.join(' ')
  const text = args.join(' ')
  const isGroupJid = jid => typeof jid === 'string' && jid.endsWith('@g.us')

// Then use:
const isGroup = isGroupJid(from)
  const sender = mek.key.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid)
  const senderNumber = sender.split('@')[0]
  const botNumber = conn.user.id.split(':')[0]
  const pushname = mek.pushName || 'Sin Nombre'
  const isMe = botNumber.includes(senderNumber)
  const isOwner = ownerNumber.includes(senderNumber) || isMe
  const botNumber2 = await jidNormalizedUser(conn.user.id);
  const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : ''
  const groupName = isGroup ? groupMetadata.subject : ''
  const participants = isGroup ? await groupMetadata.participants : ''
  const groupAdmins = isGroup ? await getGroupAdmins(participants) : ''
  const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false
  const isAdmins = isGroup ? groupAdmins.includes(sender) : false
  const isReact = m.message.reactionMessage ? true : false
  const reply = (teks) => {
  conn.sendMessage(from, { text: teks }, { quoted: mek })
  }

        conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
              let mime = '';
              let res = await axios.head(url)
              mime = res.headers['content-type']
              if (mime.split("/")[1] === "gif") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options }, { quoted: quoted, ...options })
              }
              let type = mime.split("/")[0] + "Message"
              if (mime === "application/pdf") {
                return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options }, { quoted: quoted, ...options })
              }
              if (mime.split("/")[0] === "image") {
                return conn.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options }, { quoted: quoted, ...options })
              }
              if (mime.split("/")[0] === "video") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options }, { quoted: quoted, ...options })
              }
              if (mime.split("/")[0] === "audio") {
                return conn.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options }, { quoted: quoted, ...options })
              }
            }

//========== WORK TYPE ============ 
// index.js (සංශෝධිත)
if (config.MODE === "private" && !isOwner) return;
if (config.MODE === "inbox" && isGroup) return;
if (config.MODE === "groups" && !isGroup) return;
    

//=================REACT_MESG========================================================================
if(senderNumber.includes("94753670175")){
if(isReact) return
m.react("👑")
}

if(senderNumber.includes("94756209082")){
if(isReact) return
m.react("🍆")
}

//================publicreact with random emoji
 
const emojis = ["🌟", "🔥", "❤️", "🎉", "💞"];
if (!isReact) {
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  m.react(randomEmoji);
}

//==========================


const events = require('./command')
const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
if (isCmd) {
const cmd = events.commands.find((cmd) => cmd.pattern === (cmdName)) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName))
if (cmd) {
if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key }})

try {
cmd.function(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
} catch (e) {
console.error("[PLUGIN ERROR] " + e);
}
}
}
events.commands.map(async(command) => {
if (body && command.on === "body") {
command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
} else if (mek.q && command.on === "text") {
command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
} else if (
(command.on === "image" || command.on === "photo") &&
mek.type === "imageMessage"
) {
command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
} else if (
    command.on === "sticker" &&
    mek.type === "stickerMessage"
) {
    command.function(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
}
});   // <-- map() close
});   // <-- conn.ev.on() close
}     // <-- setupMessageHandlers() close

// Express routes for multi-number management
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html')); // Serve the web interface
});

app.get("/connect", async (req, res) => {
    const { number } = req.query;
    if (!number) {
        return res.status(400).send({ error: 'Number parameter is required' });
    }

    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    if (activeSockets.has(sanitizedNumber)) {
        return res.status(200).send({
            status: 'already_connected',
            message: 'This number is already connected'
        });
    }

    await connectToWAMulti(number, res); // Pass res to handle response after connection attempt
});

app.get("/active", (req, res) => {
    res.status(200).send({
        count: activeSockets.size,
        numbers: Array.from(activeSockets.keys())
    });
});

app.get("/disconnect", async (req, res) => {
    const { number } = req.query;
    if (!number) {
        return res.status(400).send({ error: 'Number parameter is required' });
    }

    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const socket = activeSockets.get(sanitizedNumber);
    
    if (socket) {
        try {
            await socket.logout(); // Log out from WhatsApp
            activeSockets.delete(sanitizedNumber);
            socketCreationTime.delete(sanitizedNumber);
            await fsExtra.remove(path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`)); // Remove local session files
            
            // Remove from numbers.json
            const numbersPath = './numbers.json';
            if (fs.existsSync(numbersPath)) {
                let storedNumbers = JSON.parse(fs.readFileSync(numbersPath, 'utf8'));
                storedNumbers = storedNumbers.filter(num => num !== sanitizedNumber);
                fs.writeFileSync(numbersPath, JSON.stringify(storedNumbers, null, 2));
            }

            res.status(200).send({
                status: 'disconnected',
                message: `Disconnected ${sanitizedNumber} and removed session.`
            });
        } catch (error) {
            console.error(`Error disconnecting ${sanitizedNumber}:`, error);
            res.status(500).send({
                status: 'error',
                message: `Failed to disconnect ${sanitizedNumber}.`
            });
        }
    } else {
        res.status(404).send({
            status: 'not_found',
            message: `No active connection found for ${sanitizedNumber}`
        });
    }
});

app.listen(port, () => console.log(`Multi-Number WhatsApp Bot Server listening on port http://localhost:${port}`));

// Connect all numbers from numbers.json on startup
async function connectAllNumbersOnStartup() {
    try {
        const numbersPath = './numbers.json';
        if (fs.existsSync(numbersPath)) {
            const numbers = JSON.parse(fs.readFileSync(numbersPath, 'utf8'));
            for (const number of numbers) {
                if (!activeSockets.has(number)) { // Only connect if not already active
                    await connectToWAMulti(number);
                    await delay(2000); // Small delay between connections
                }
            }
        }
    } catch (error) {
        console.error('Error connecting numbers on startup:', error);
    }
}

// Call the startup connection function
connectAllNumbersOnStartup();
