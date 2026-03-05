// ============================================
// SRI-BOT MULTI-NUMBER WHATSAPP BOT
// With GitHub Integration & Per-Number Configs
// ============================================

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

// GitHub integration libraries
const { Octokit } = require('@octokit/rest');
const crypto = require('crypto');
const moment = require('moment-timezone');

// Load config with per-number support
const config = require('./config');
const l = console.log;
const P = require('pino');
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const qrcode = require('qrcode-terminal');
const util = require('util');
const { sms, downloadMediaMessage } = require('./lib/msg');
const axios = require('axios');

// Use dynamic config
const prefix = config.PREFIX;
const ownerNumber = config.OWNER_NUMBER;
const port = process.env.PORT || 8000;

// GitHub Configuration
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});
const owner = process.env.GITHUB_REPO_OWNER || 'Walukapah';
const repo = process.env.GITHUB_REPO_NAME || 'SRI-DATABASE';

// Multi-number support variables
const activeSockets = new Map();
const socketCreationTime = new Map();
const SESSION_BASE_PATH = './sessions';

// Ensure session directory exists
if (!fs.existsSync(SESSION_BASE_PATH)) {
    fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

// ============================================
// SIMPLE ANTI-DELETE SYSTEM (Memory Based)
// ============================================

// Store recent messages in memory (last 100 messages per chat)
const recentMessages = new Map();

// Store message temporarily
function storeMessage(mek) {
    const chatId = mek.key.remoteJid;
    const msgId = mek.key.id;
    
    if (!recentMessages.has(chatId)) {
        recentMessages.set(chatId, new Map());
    }
    
    const chatMessages = recentMessages.get(chatId);
    
    // Store only necessary data
    chatMessages.set(msgId, {
        key: mek.key,
        message: mek.message,
        timestamp: mek.messageTimestamp,
        pushName: mek.pushName
    });
    
    // Keep only last 100 messages per chat
    if (chatMessages.size > 100) {
        const firstKey = chatMessages.keys().next().value;
        chatMessages.delete(firstKey);
    }
}

// Handle message revoke (Anti-Delete)
async function handleAntiDelete(conn, mek, number) {
    try {
        // Check if this is a protocol message (revoke/delete)
        if (!mek.message?.protocolMessage) return;
        
        const protocolMsg = mek.message.protocolMessage;
        
        // Check if type is REVOKE (0 = REVOKE)
        if (protocolMsg.type !== 0) return;
        
        const revokedKey = protocolMsg.key;
        const revokedId = revokedKey.id;
        const revokedChat = revokedKey.remoteJid;
        
        console.log(`🗑️ Delete detected! Message ID: ${revokedId} in ${revokedChat}`);
        
        // Get stored message
        const chatMessages = recentMessages.get(revokedChat);
        if (!chatMessages || !chatMessages.has(revokedId)) {
            console.log('❌ Original message not found in memory');
            return;
        }
        
        const originalMsg = chatMessages.get(revokedId);
        
        // Send revoke message back to the same chat
        await conn.sendMessage(revokedChat, {
            delete: originalMsg.key
        });
        
        console.log(`✅ Auto-revoked message ${revokedId} for ${number}`);
        
        // Clean up stored message
        chatMessages.delete(revokedId);
        
    } catch (error) {
        console.error('Anti-delete error:', error);
    }
}

// ============================================
// GITHUB HELPER FUNCTIONS
// ============================================

function getSriLankaTimestamp() {
    return moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');
}

// Load numbers from GitHub
async function loadNumbersFromGitHub() {
    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'numbers.json'
        });

        const content = Buffer.from(data.content, 'base64').toString('utf8');
        return JSON.parse(content);
    } catch (error) {
        console.warn('No numbers.json found on GitHub, creating new one');
        return [];
    }
}

// Save numbers to GitHub
async function saveNumbersToGitHub(numbers) {
    try {
        const pathToFile = 'numbers.json';
        let sha = null;

        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: pathToFile,
            });
            sha = data.sha;
        } catch (err) {
            if (err.status !== 404) throw err;
        }

        const contentEncoded = Buffer.from(JSON.stringify(numbers, null, 2)).toString('base64');

        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: pathToFile,
            message: "Update numbers list",
            content: contentEncoded,
            sha: sha || undefined,
        });

        console.log("✅ numbers.json updated on GitHub");
    } catch (err) {
        console.error("❌ Failed to save numbers to GitHub:", err);
    }
}

// Add number to numbers.json and GitHub
async function addNumberToStorage(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    try {
        let storedNumbers = await loadNumbersFromGitHub();
        
        if (storedNumbers.length === 0 && fs.existsSync('./numbers.json')) {
            storedNumbers = JSON.parse(fs.readFileSync('./numbers.json', 'utf8'));
        }
        
        if (!storedNumbers.includes(sanitizedNumber)) {
            storedNumbers.push(sanitizedNumber);
            await saveNumbersToGitHub(storedNumbers);
            fs.writeFileSync('./numbers.json', JSON.stringify(storedNumbers, null, 2));
            console.log(`Added ${sanitizedNumber} to numbers list`);
        }
        
        return storedNumbers;
    } catch (error) {
        console.error('Failed to add number to storage:', error);
        
        const numbersPath = './numbers.json';
        let storedNumbers = [];
        
        if (fs.existsSync(numbersPath)) {
            storedNumbers = JSON.parse(fs.readFileSync(numbersPath, 'utf8'));
        }
        
        if (!storedNumbers.includes(sanitizedNumber)) {
            storedNumbers.push(sanitizedNumber);
            fs.writeFileSync(numbersPath, JSON.stringify(storedNumbers, null, 2));
        }
        
        return storedNumbers;
    }
}

// Remove number from numbers.json and GitHub
async function removeNumberFromStorage(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    try {
        let storedNumbers = await loadNumbersFromGitHub();
        
        if (storedNumbers.length === 0 && fs.existsSync('./numbers.json')) {
            storedNumbers = JSON.parse(fs.readFileSync('./numbers.json', 'utf8'));
        }
        
        storedNumbers = storedNumbers.filter(num => num !== sanitizedNumber);
        await saveNumbersToGitHub(storedNumbers);
        fs.writeFileSync('./numbers.json', JSON.stringify(storedNumbers, null, 2));
        
        console.log(`Removed ${sanitizedNumber} from numbers list`);
        return storedNumbers;
    } catch (error) {
        console.error('Failed to remove number from storage:', error);
        
        const numbersPath = './numbers.json';
        let storedNumbers = [];
        
        if (fs.existsSync(numbersPath)) {
            storedNumbers = JSON.parse(fs.readFileSync(numbersPath, 'utf8'));
        }
        
        storedNumbers = storedNumbers.filter(num => num !== sanitizedNumber);
        fs.writeFileSync(numbersPath, JSON.stringify(storedNumbers, null, 2));
        
        return storedNumbers;
    }
}

async function cleanDuplicateFiles(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'sessions'
        });

        const sessionFiles = data.filter(file => 
            file.name.startsWith(`session_${sanitizedNumber}_`) && file.name.endsWith('.json')
        ).sort((a, b) => {
            const timeA = parseInt(a.name.match(/session_\d+_(\d+)\.json/)?.[1] || 0);
            const timeB = parseInt(b.name.match(/session_\d+_(\d+)\.json/)?.[1] || 0);
            return timeB - timeA;
        });

        if (sessionFiles.length > 1) {
            for (let i = 1; i < sessionFiles.length; i++) {
                await octokit.repos.deleteFile({
                    owner,
                    repo,
                    path: `sessions/${sessionFiles[i].name}`,
                    message: `Delete duplicate session file for ${sanitizedNumber}`,
                    sha: sessionFiles[i].sha
                });
                console.log(`Deleted duplicate session file: ${sessionFiles[i].name}`);
            }
        }
    } catch (error) {
        console.error(`Failed to clean duplicate files for ${number}:`, error);
    }
}

async function deleteSessionFromGitHub(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'sessions'
        });

        const sessionFiles = data.filter(file =>
            file.name.includes(sanitizedNumber) && file.name.endsWith('.json')
        );

        for (const file of sessionFiles) {
            await octokit.repos.deleteFile({
                owner,
                repo,
                path: `sessions/${file.name}`,
                message: `Delete session for ${sanitizedNumber}`,
                sha: file.sha
            });
        }
    } catch (error) {
        console.error('Failed to delete session from GitHub:', error);
    }
}

async function restoreSession(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'sessions'
        });

        const sessionFiles = data.filter(file =>
            file.name === `creds_${sanitizedNumber}.json`
        );

        if (sessionFiles.length === 0) return null;

        const latestSession = sessionFiles[0];
        const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path: `sessions/${latestSession.name}`
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Session restore failed:', error);
        return null;
    }
}

async function saveSessionToGitHub(number, sessionData) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const filename = `creds_${sanitizedNumber}.json`;
        let sha;

        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: `sessions/${filename}`
            });
            sha = data.sha;
        } catch (error) {
            // File doesn't exist yet
        }

        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: `sessions/${filename}`,
            message: `Update session for ${sanitizedNumber}`,
            content: Buffer.from(JSON.stringify(sessionData, null, 2)).toString('base64'),
            sha
        });
        console.log(`Session saved to GitHub for ${sanitizedNumber}`);
    } catch (error) {
        console.error('Failed to save session to GitHub:', error);
    }
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

// ============================================
// MULTI-NUMBER CONNECTION FUNCTION
// ============================================

async function connectToWAMulti(number, res = null) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);

    console.log(`Connecting WhatsApp bot for number: ${sanitizedNumber}...`);

    // Set default number for config context
    config.setDefaultNumber(sanitizedNumber);

    await cleanDuplicateFiles(sanitizedNumber);

    // Try to restore session from GitHub first
    const restoredCreds = await restoreSession(sanitizedNumber);
    if (restoredCreds) {
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(restoredCreds, null, 2));
        console.log(`Successfully restored session for ${sanitizedNumber} from GitHub`);
    }

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

        // GitHub: Save creds to GitHub when updated
        conn.ev.on('creds.update', async () => {
            await saveCreds();
            try {
                const fileContent = await fs.promises.readFile(path.join(sessionPath, 'creds.json'), { encoding: 'utf8' });
                await saveSessionToGitHub(sanitizedNumber, JSON.parse(fileContent));
            } catch (error) {
                console.error('Failed to read session file:', error);
            }
        });

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
                    connectToWAMulti(number);
                } else {
                    console.log(`Logged out from ${sanitizedNumber}, removing session files.`);
                    await fsExtra.remove(sessionPath);
                    await deleteSessionFromGitHub(sanitizedNumber);
                    await removeNumberFromStorage(sanitizedNumber);
                }
            } else if (connection === 'open') {
                console.log('Installing plugins...');
                const pluginPath = path.join(__dirname, 'plugins');
                
                Object.keys(require.cache).forEach(key => {
                    if (key.includes(pluginPath)) {
                        delete require.cache[key];
                    }
                });
                
                try {
                    const pluginFiles = fs.readdirSync(pluginPath).filter(file => 
                        path.extname(file).toLowerCase() === '.js'
                    );
                    
                    for (const pluginFile of pluginFiles) {
                        try {
                            const pluginPathFull = path.join(pluginPath, pluginFile);
                            const plugin = require(pluginPathFull);
                            
                            if (typeof plugin === 'function') {
                                plugin(conn);
                                console.log(`✓ Loaded plugin: ${pluginFile}`);
                            }
                        } catch (pluginError) {
                            console.error(`✗ Failed to load plugin ${pluginFile}:`, pluginError);
                        }
                    }
                    console.log(`All plugins loaded successfully for ${sanitizedNumber}`);
                } catch (error) {
                    console.error(`Error loading plugins for ${sanitizedNumber}:`, error);
                }
                
                console.log(`Bot connected for number: ${sanitizedNumber}`);

                // Add number to numbers.json and GitHub
                await addNumberToStorage(sanitizedNumber);

                // Send connection success message to admin
                const admins = loadAdmins();
                const caption = formatMessage(
                    '*Connected Successful ✅*',
                    `📞 Number: ${sanitizedNumber}\n🩵 Status: Online\n💾 Session: Saved to GitHub`,
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

                if (res && !res.headersSent) {
                    res.status(200).send({ status: 'connected', message: 'Bot connected successfully!' });
                }
            }
        });

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

// ============================================
// MESSAGE HANDLERS WITH SIMPLE ANTI-DELETE
// ============================================

function setupMessageHandlers(conn, number) {
    // Set global context for this number so config.js can access it
    global.currentBotNumber = number;
    
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

        // Auto mark as seen and read (using dynamic config)
        if (config.READ_MESSAGE === true) {
            try {
                const from = mek.key.remoteJid;
                const id = mek.key.id;
                const participant = mek.key.participant || from;

                // Seen (double grey tick ✓✓)
                await conn.sendReadReceipt(from, id, [participant]);

                // Read (blue tick ✓✓)
                await conn.readMessages([{ remoteJid: from, id: id, participant: participant }]);

                console.log(blue + `✅ Marked message from ${from} as seen & read for ${number}.` + reset);
            } catch (error) {
                console.error(red + `❌ Error marking message as seen/read for ${number}:`, error + reset);
            }
        }

        // Status updates handling (using dynamic config)
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

        // ============================================
        // SIMPLE ANTI-DELETE: Store normal messages
        // ============================================
        
        // Store message if it's not a protocol message (not a revoke)
        if (!mek.message?.protocolMessage) {
            storeMessage(mek);
        } else {
            // Handle revoke message
            await handleAntiDelete(conn, mek, number);
        }

        const m = sms(conn, mek);
        const type = getContentType(mek.message);
        const content = JSON.stringify(mek.message);
        const from = mek.key.remoteJid;
        const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];

        const body = (type === 'conversation') 
            ? mek.message.conversation 
            : (type === 'extendedTextMessage') 
                ? mek.message.extendedTextMessage.text 
                : (type === 'imageMessage') && mek.message.imageMessage.caption 
                    ? mek.message.imageMessage.caption 
                    : (type === 'videoMessage') && mek.message.videoMessage.caption 
                        ? mek.message.videoMessage.caption 
                        : (type === 'buttonsMessage')
                            ? mek.message.buttonsMessage.contentText || ''
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

        // Button message handler
        const { generateButtonMessage } = require('./lib/functions');

        conn.sendButtonMessage = async (jid, text, footer, buttons, imageUrl, options = {}) => {
            const message = generateButtonMessage(text, footer, buttons, imageUrl);
            return conn.sendMessage(jid, message, options);
        };

        conn.sendImageButton = async (jid, image, text, footer, buttons, options = {}) => {
            let buffer;
            if (Buffer.isBuffer(image)) {
                buffer = image;
            } else if (isUrl(image)) {
                buffer = await getBuffer(image);
            } else if (fs.existsSync(image)) {
                buffer = fs.readFileSync(image);
            } else {
                throw new Error('Invalid image source');
            }
            
            return conn.sendMessage(jid, {
                image: buffer,
                caption: text,
                footer: footer,
                buttons: buttons,
                headerType: 1,
                ...options
            }, options);
        };
        
        const isCmd = body.startsWith(config.PREFIX);
        var budy = typeof mek.text == 'string' ? mek.text : false;
        const command = isCmd ? body.slice(config.PREFIX.length).trim().split(' ').shift().toLowerCase() : '';
        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');
        const text = args.join(' ');
        const isGroupJid = jid => typeof jid === 'string' && jid.endsWith('@g.us');

        const isGroup = isGroupJid(from);
        const sender = mek.key.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid);
        const senderNumber = sender.split('@')[0];
        const botNumber = conn.user.id.split(':')[0];
        const pushname = mek.pushName || 'Sin Nombre';
        const isMe = botNumber.includes(senderNumber);
        const isOwner = ownerNumber.includes(senderNumber) || isMe;
        const botNumber2 = await jidNormalizedUser(conn.user.id);
        const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : '';
        const groupName = isGroup ? groupMetadata.subject : '';
        const participants = isGroup ? await groupMetadata.participants : '';
        const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
        const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
        const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
        const isReact = m.message.reactionMessage ? true : false;
        const reply = (teks) => {
            conn.sendMessage(from, { text: teks }, { quoted: mek });
        }

        conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
            let mime = '';
            let res = await axios.head(url);
            mime = res.headers['content-type'];
            if (mime.split("/")[1] === "gif") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options }, { quoted: quoted, ...options });
            }
            let type = mime.split("/")[0] + "Message";
            if (mime === "application/pdf") {
                return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options }, { quoted: quoted, ...options });
            }
            if (mime.split("/")[0] === "image") {
                return conn.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options }, { quoted: quoted, ...options });
            }
            if (mime.split("/")[0] === "video") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options }, { quoted: quoted, ...options });
            }
            if (mime.split("/")[0] === "audio") {
                return conn.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options }, { quoted: quoted, ...options });
            }
        }

        // WORK TYPE (using dynamic config)
        if (config.MODE === "private" && !isOwner) return;
        if (config.MODE === "inbox" && isGroup) return;
        if (config.MODE === "groups" && !isGroup) return;
        
        // REACT_MESG
        if(senderNumber.includes("94753670175")){
            if(isReact) return;
            m.react("👑");
        }

        if(senderNumber.includes("94756209082")){
            if(isReact) return;
            m.react("🍆");
        }

        if(senderNumber.includes("94766458131")){
            if(isReact) return;
            m.react("🗿");
        }

        const events = require('./command');
        const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
        if (isCmd) {
            const cmd = events.commands.find((cmd) => cmd.pattern === (cmdName)) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
            if (cmd) {
                if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key }});

                try {
                    cmd.function(conn, mek, m, {from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
                } catch (e) {
                    console.error("[PLUGIN ERROR] " + e);
                }
            }
        }
        events.commands.map(async(command) => {
            if (body && command.on === "body") {
                command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
            } else if (mek.q && command.on === "text") {
                command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
            } else if (
                (command.on === "image" || command.on === "photo") &&
                mek.type === "imageMessage"
            ) {
                command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
            } else if (
                command.on === "sticker" &&
                mek.type === "stickerMessage"
            ) {
                command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
            }
        });
    });
}

// ============================================
// EXPRESS ROUTES
// ============================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
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

    await connectToWAMulti(number, res);
});

app.get("/active", (req, res) => {
    res.status(200).send({
        count: activeSockets.size,
        numbers: Array.from(activeSockets.keys())
    });
});

app.get("/github-sessions", async (req, res) => {
    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'sessions'
        });

        const sessionFiles = data.filter(file => file.name.endsWith('.json'));
        res.status(200).send({
            status: 'success',
            sessions: sessionFiles.map(file => file.name)
        });
    } catch (error) {
        console.error('Failed to fetch GitHub sessions:', error);
        res.status(500).send({ error: 'Failed to fetch sessions from GitHub' });
    }
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
            await socket.logout();
            activeSockets.delete(sanitizedNumber);
            socketCreationTime.delete(sanitizedNumber);
            await fsExtra.remove(path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`));
            await deleteSessionFromGitHub(sanitizedNumber);
            await removeNumberFromStorage(sanitizedNumber);
            
            res.status(200).send({
                status: 'disconnected',
                message: `Disconnected ${sanitizedNumber} and removed session from GitHub.`
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

app.listen(port, () => console.log(`Multi-Number WhatsApp Bot Server with GitHub integration listening on port http://localhost:${port}`));

// ============================================
// STARTUP: CONNECT ALL NUMBERS
// ============================================

async function connectAllNumbersOnStartup() {
    try {
        let numbers = await loadNumbersFromGitHub();
        
        if (numbers.length === 0 && fs.existsSync('./numbers.json')) {
            numbers = JSON.parse(fs.readFileSync('./numbers.json', 'utf8'));
        }
        
        for (const number of numbers) {
            if (!activeSockets.has(number)) {
                await connectToWAMulti(number);
                await delay(2000);
            }
        }
    } catch (error) {
        console.error('Error connecting numbers on startup:', error);
    }
}

connectAllNumbersOnStartup();
