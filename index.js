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

// GitHub integration libraries
const { Octokit } = require('@octokit/rest');
const crypto = require('crypto');
const moment = require('moment-timezone');

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
const { sms, downloadMediaMessage } = require('./lib/msg');
const axios = require('axios');
const prefix = config.PREFIX
const ownerNumber = config.OWNER_NUMBER
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
const otpStore = new Map();

// Ensure session directory exists
if (!fs.existsSync(SESSION_BASE_PATH)) {
    fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

// GitHub Helper Functions
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    // Try to get existing file
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: pathToFile,
      });
      sha = data.sha; // If file exists
    } catch (err) {
      if (err.status !== 404) throw err; // Only ignore if not found
    }

    const contentEncoded = Buffer.from(JSON.stringify(numbers, null, 2)).toString('base64');

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: pathToFile,
      message: "Update numbers list",
      content: contentEncoded,
      sha: sha || undefined, // if file exists -> update, if not -> create
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
        // First try to load from GitHub
        let storedNumbers = await loadNumbersFromGitHub();
        
        // If not found on GitHub, check local file
        if (storedNumbers.length === 0 && fs.existsSync('./numbers.json')) {
            storedNumbers = JSON.parse(fs.readFileSync('./numbers.json', 'utf8'));
        }
        
        if (!storedNumbers.includes(sanitizedNumber)) {
            storedNumbers.push(sanitizedNumber);
            
            // Save to both GitHub and local file
            await saveNumbersToGitHub(storedNumbers);
            fs.writeFileSync('./numbers.json', JSON.stringify(storedNumbers, null, 2));
            
            console.log(`Added ${sanitizedNumber} to numbers list`);
        }
        
        return storedNumbers;
    } catch (error) {
        console.error('Failed to add number to storage:', error);
        
        // Fallback to local file only
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
        // First try to load from GitHub
        let storedNumbers = await loadNumbersFromGitHub();
        
        // If not found on GitHub, check local file
        if (storedNumbers.length === 0 && fs.existsSync('./numbers.json')) {
            storedNumbers = JSON.parse(fs.readFileSync('./numbers.json', 'utf8'));
        }
        
        storedNumbers = storedNumbers.filter(num => num !== sanitizedNumber);
        
        // Save to both GitHub and local file
        await saveNumbersToGitHub(storedNumbers);
        fs.writeFileSync('./numbers.json', JSON.stringify(storedNumbers, null, 2));
        
        console.log(`Removed ${sanitizedNumber} from numbers list`);
        return storedNumbers;
    } catch (error) {
        console.error('Failed to remove number from storage:', error);
        
        // Fallback to local file only
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

        const configFiles = data.filter(file => 
            file.name === `config_${sanitizedNumber}.json`
        );

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

        if (configFiles.length > 1) {
            console.log(`Config file for ${sanitizedNumber} already exists`);
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
            // File doesn't exist yet, that's fine
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

async function loadUserConfig(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const configPath = `sessions/config_${sanitizedNumber}.json`;
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: configPath
        });

        const content = Buffer.from(data.content, 'base64').toString('utf8');
        return JSON.parse(content);
    } catch (error) {
        console.warn(`No configuration found for ${number}, using default config`);
        return { ...config };
    }
}

async function updateUserConfig(number, newConfig) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const configPath = `sessions/config_${sanitizedNumber}.json`;
        let sha;

        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: configPath
            });
            sha = data.sha;
        } catch (error) {
            // File doesn't exist yet
        }

        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: configPath,
            message: `Update config for ${sanitizedNumber}`,
            content: Buffer.from(JSON.stringify(newConfig, null, 2)).toString('base64'),
            sha
        });
        console.log(`Updated config for ${sanitizedNumber}`);
    } catch (error) {
        console.error('Failed to update config:', error);
        throw error;
    }
}

async function sendOTP(conn, number, otp) {
    const userJid = jidNormalizedUser(conn.user.id);
    const message = `*🔐 OTP VERIFICATION*\n\nYour OTP for config update is: *${otp}*\nThis OTP will expire in 5 minutes.\n\n> © ${config.BOT_NAME}`;

    try {
        await conn.sendMessage(userJid, { text: message });
        console.log(`OTP ${otp} sent to ${number}`);
    } catch (error) {
        console.error(`Failed to send OTP to ${number}:`, error);
        throw error;
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

// Multi-number connection function (updated with GitHub integration)
async function connectToWAMulti(number, res = null) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);

    console.log(`Connecting WhatsApp bot for number: ${sanitizedNumber}...`);

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

                // Load user config from GitHub
                try {
                    const userConfig = await loadUserConfig(sanitizedNumber);
                    console.log(`Loaded config for ${sanitizedNumber} from GitHub`);
                } catch (error) {
                    await updateUserConfig(sanitizedNumber, config);
                }

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
        // Auto Seen + Read (Blue Tick)
// Auto Seen + Read (Blue Tick)
if (config.READ_MESSAGE === true) {
    try {
        const from = mek.key.remoteJid;
        const id = mek.key.id;
        const participant = mek.key.participant || from;

        // Seen (double grey tick ✓✓)
        await conn.sendReadReceipt(from, id, [participant]);

        // Read (blue tick ✓✓) - නිවැරදි ක්‍රමය
        await conn.readMessages([{ remoteJid: from, id: id, participant: participant }]);

        console.log(blue + `✅ Marked message from ${from} as seen & read for ${number}.` + reset);
    } catch (error) {
        console.error(red + `❌ Error marking message as seen/read for ${number}:`, error + reset);
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
       // const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
        const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []

const body = (type === 'conversation') 
    ? mek.message.conversation 
    : (type === 'extendedTextMessage') 
        ? mek.message.extendedTextMessage.text 
        : (type === 'imageMessage') && mek.message.imageMessage.caption 
            ? mek.message.imageMessage.caption 
            : (type === 'videoMessage') && mek.message.videoMessage.caption 
                ? mek.message.videoMessage.caption 
                : (type === 'buttonsMessage') // නව button message type එක
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


    // index.js හි setupMessageHandlers function එකට ඇතුලත් කරන්න
const { generateButtonMessage } = require('./lib/functions');

// Button message handler එකතු කරන්න (setupMessageHandlers function එක තුල)
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
        
        



        if(!isOwner) {  // Fixed redundant condition
    if(config.ANTI_DELETE === "true") {
        
        if (!m.id.startsWith("BAE5")) {
            
            // Ensure the base directory exists
            const baseDir = 'message_data';
            if (!fs.existsSync(baseDir)) {
                fs.mkdirSync(baseDir);
            }
            
            function loadChatData(remoteJid, messageId) {
                const chatFilePath = path.join(baseDir, remoteJid, `${messageId}.json`);
                try {
                    const data = fs.readFileSync(chatFilePath, 'utf8');
                    return JSON.parse(data) || [];
                } catch (error) {
                    return [];
                }
            }
            
            function saveChatData(remoteJid, messageId, chatData) {
                const chatDir = path.join(baseDir, remoteJid);
            
                if (!fs.existsSync(chatDir)) {
                    fs.mkdirSync(chatDir, { recursive: true });
                }
            
                const chatFilePath = path.join(chatDir, `${messageId}.json`);
            
                try {
                    fs.writeFileSync(chatFilePath, JSON.stringify(chatData, null, 2));
                    // console.log('Chat data saved successfully.');
                } catch (error) {
                    console.error('Error saving chat data:', error);
                }
            }
                
            function handleIncomingMessage(message) {
                const remoteJid = from; // Fixed: removed comment
                const messageId = message.key.id;
            
                const chatData = loadChatData(remoteJid, messageId);
            
                chatData.push(message);
            
                saveChatData(remoteJid, messageId, chatData);
            
                // console.log('Message received and saved:', messageId);
            }
            
            const delfrom = config.DELETEMSGSENDTO !== '' ? config.DELETEMSGSENDTO + '@s.whatsapp.net' : from;
            
            function handleMessageRevocation(revocationMessage) {
                // const remoteJid = revocationMessage.message.protocolMessage.key.remoteJid;
                // const messageId = revocationMessage.message.protocolMessage.key.id;
                const remoteJid = from; 
                const messageId = revocationMessage.msg.key.id;
            
                // console.log('Received revocation message with ID:', messageId);
            
                const chatData = loadChatData(remoteJid, messageId);
            
                const originalMessage = chatData[0];
            
                if (originalMessage) {
                    const deletedBy = revocationMessage.sender.split('@')[0];
                    const sentBynn = originalMessage.key.participant ?? revocationMessage.sender;
                    const sentBy = sentBynn.split('@')[0];
                    
                    if (deletedBy.includes(botNumber) || sentBy.includes(botNumber)) return;
                    
                    const xx = '```';
                    
                    if (originalMessage.message && originalMessage.message.conversation && originalMessage.message.conversation !== '') {
                        const messageText = originalMessage.message.conversation;
                        if (isGroup && messageText.includes('chat.whatsapp.com')) return;
                        
                        conn.sendMessage(delfrom, { 
                            text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${xx}${messageText}${xx}` 
                        });
                        //........................................//........................................
                    } else if (originalMessage.msg && originalMessage.msg.type === 'MESSAGE_EDIT') { // Fixed: added check for originalMessage.msg
                        conn.sendMessage(delfrom, { 
                            text: `❌ *edited message detected* ${originalMessage.message.editedMessage.message.protocolMessage.editedMessage.conversation}` 
                        }, {quoted: mek});
                        
                        //........................................//........................................
                    } else if (originalMessage.message && originalMessage.message.extendedTextMessage && originalMessage.msg && originalMessage.msg.text ) { // Fixed: typo in extendedTextMessage
                        const messageText = originalMessage.msg.text;
                        if (isGroup && messageText.includes('chat.whatsapp.com')) return;
                        
                        conn.sendMessage(delfrom, { 
                            text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${xx}${messageText}${xx}` 
                        });
                    } else if (originalMessage.message && originalMessage.message.extendedTextMessage) { // Fixed: typo in extendedTextMessage
                        const messageText = originalMessage.message.extendedTextMessage.text; // Fixed: corrected variable name
                        if (isGroup && messageText && messageText.includes('chat.whatsapp.com')) return; // Fixed: added check if messageText exists
                        
                        conn.sendMessage(delfrom, { 
                            text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${xx}${originalMessage.body}${xx}` 
                        });
                    } else if (originalMessage.type === 'extendedTextMessage') {
                        async function quotedMessageRetrive() {     
                            var nameJpg = getRandom('');
                            const ml = sms(conn, originalMessage);
                            
                            if (originalMessage.message.extendedTextMessage) {
                                const messageText = originalMessage.message.extendedTextMessage.text;
                                if (isGroup && messageText && messageText.includes('chat.whatsapp.com')) return; // Fixed: added check if messageText exists
                                
                                conn.sendMessage(delfrom, { 
                                    text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${xx}${originalMessage.message.extendedTextMessage.text}${xx}` 
                                });
                            } else {
                                const messageText = originalMessage.message.extendedTextMessage && originalMessage.message.extendedTextMessage.text; // Fixed: added safe check
                                if (isGroup && messageText && messageText.includes('chat.whatsapp.com')) return; // Fixed: added check if messageText exists
                                
                                conn.sendMessage(delfrom, { 
                                    text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${xx}${originalMessage.message.extendedTextMessage && originalMessage.message.extendedTextMessage.text}${xx}` 
                                });
                            }
                        }
                        
                        quotedMessageRetrive();
                    } else if (originalMessage.type === 'imageMessage') {
                        async function imageMessageRetrive() {
                            var nameJpg = getRandom('');
                            const ml = sms(conn, originalMessage);
                            let buff = await ml.download(nameJpg);
                            let fileType = require('file-type');
                            let type = fileType.fromBuffer(buff);
                            await fs.promises.writeFile("./" + type.ext, buff);
                            
                            if (originalMessage.message.imageMessage.caption) {
                                const messageText = originalMessage.message.imageMessage.caption;
                                if (isGroup && messageText.includes('chat.whatsapp.com')) return;
                                
                                await conn.sendMessage(delfrom, { 
                                    image: fs.readFileSync("./" + type.ext), 
                                    caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${originalMessage.message.imageMessage.caption}` 
                                });
                            } else {
                                await conn.sendMessage(delfrom, { 
                                    image: fs.readFileSync("./" + type.ext), 
                                    caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_` 
                                });
                            }       
                        }
                        
                        imageMessageRetrive();
                    } else if (originalMessage.type === 'videoMessage') {
                        async function videoMessageRetrive() {
                            var nameJpg = getRandom('');
                            const ml = sms(conn, originalMessage);
                            
                            const vData = originalMessage.message.videoMessage.fileLength;
                            const vTime = originalMessage.message.videoMessage.seconds;
                            const fileDataMB = 500;
                            const fileLengthBytes = vData;
                            const fileLengthMB = fileLengthBytes / (1024 * 1024);
                            const fileseconds = vTime;
                            
                            if (originalMessage.message.videoMessage.caption) {
                                if (fileLengthMB < fileDataMB && fileseconds < 30*60) {
                                    let buff = await ml.download(nameJpg);
                                    let fileType = require('file-type');
                                    let type = fileType.fromBuffer(buff);
                                    await fs.promises.writeFile("./" + type.ext, buff);
                                    
                                    const messageText = originalMessage.message.videoMessage.caption;
                                    if (isGroup && messageText.includes('chat.whatsapp.com')) return;
                                    
                                    await conn.sendMessage(delfrom, { 
                                        video: fs.readFileSync("./" + type.ext), 
                                        caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n\n> 🔓 Message Text: ${originalMessage.message.videoMessage.caption}` 
                                    });
                                }
                            } else {
                                let buff = await ml.download(nameJpg);
                                let fileType = require('file-type');
                                let type = fileType.fromBuffer(buff);
                                await fs.promises.writeFile("./" + type.ext, buff);
                                
                                const vData = originalMessage.message.videoMessage.fileLength;
                                const vTime = originalMessage.message.videoMessage.seconds;
                                const fileDataMB = 500;
                                const fileLengthBytes = vData;
                                const fileLengthMB = fileLengthBytes / (1024 * 1024);
                                const fileseconds = vTime;
                                
                                if (fileLengthMB < fileDataMB && fileseconds < 30*60) {
                                    await conn.sendMessage(delfrom, { 
                                        video: fs.readFileSync("./" + type.ext), 
                                        caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_` 
                                    });
                                }
                            }       
                        }
                        
                        videoMessageRetrive();
                    } else if (originalMessage.type === 'documentMessage') {
                        async function documentMessageRetrive() {
                            var nameJpg = getRandom('');
                            const ml = sms(conn, originalMessage);
                            let buff = await ml.download(nameJpg);
                            let fileType = require('file-type');
                            let type = fileType.fromBuffer(buff);
                            await fs.promises.writeFile("./" + type.ext, buff);
                            
                            if (originalMessage.message.documentWithCaptionMessage) {
                                await conn.sendMessage(delfrom, { 
                                    document: fs.readFileSync("./" + type.ext), 
                                    mimetype: originalMessage.message.documentMessage.mimetype, 
                                    fileName: originalMessage.message.documentMessage.fileName, 
                                    caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n`
                                });
                            } else {
                                await conn.sendMessage(delfrom, { 
                                    document: fs.readFileSync("./" + type.ext), 
                                    mimetype: originalMessage.message.documentMessage.mimetype, 
                                    fileName: originalMessage.message.documentMessage.fileName, 
                                    caption: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n`
                                });
                            }
                        }
                        
                        documentMessageRetrive();
                    } else if (originalMessage.type === 'audioMessage') {
                        async function audioMessageRetrive() {
                            var nameJpg = getRandom('');
                            const ml = sms(conn, originalMessage);
                            let buff = await ml.download(nameJpg);
                            let fileType = require('file-type');
                            let type = fileType.fromBuffer(buff);
                            await fs.promises.writeFile("./" + type.ext, buff);
                            
                            if (originalMessage.message.audioMessage) {
                                const audioq = await conn.sendMessage(delfrom, { 
                                    audio: fs.readFileSync("./" + type.ext), 
                                    mimetype: originalMessage.message.audioMessage.mimetype, 
                                    fileName: `${m.id}.mp3` 
                                });
                                
                                return await conn.sendMessage(delfrom, { 
                                    text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n` 
                                }, {quoted: audioq});
                            } else {
                                if (originalMessage.message.audioMessage.ptt === "true") {
                                    const pttt = await conn.sendMessage(delfrom, { 
                                        audio: fs.readFileSync("./" + type.ext), 
                                        mimetype: originalMessage.message.audioMessage.mimetype, 
                                        ptt: 'true',
                                        fileName: `${m.id}.mp3` 
                                    });
                                    
                                    return await conn.sendMessage(delfrom, { 
                                        text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n` 
                                    }, {quoted: pttt});
                                }
                            }
                        }
                        
                        audioMessageRetrive();
                    } else if (originalMessage.type === 'stickerMessage') {
                        async function stickerMessageRetrive() {
                            var nameJpg = getRandom('');
                            const ml = sms(conn, originalMessage);
                            let buff = await ml.download(nameJpg);
                            let fileType = require('file-type');
                            let type = fileType.fromBuffer(buff);
                            await fs.promises.writeFile("./" + type.ext, buff);
                            
                            if (originalMessage.message.stickerMessage) {
                                const sdata = await conn.sendMessage(delfrom, {
                                    sticker: fs.readFileSync("./" + type.ext),
                                    package: 'DEVIL-TECH-MD  🌟'
                                });
                                
                                return await conn.sendMessage(delfrom, { 
                                    text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n` 
                                }, {quoted: sdata});
                            } else {
                                const stdata = await conn.sendMessage(delfrom, {
                                    sticker: fs.readFileSync("./" + type.ext),
                                    package: 'DEVIL-TECH-MD  🌟'
                                });
                                
                                return await conn.sendMessage(delfrom, { 
                                    text: `🚫 *This message was deleted !!*\n\n  🚮 *Deleted by:* _${deletedBy}_\n  📩 *Sent by:* _${sentBy}_\n` 
                                }, {quoted: stdata});
                            }
                        }
                        
                        stickerMessageRetrive();
                    }
                } else {
                    console.log('Original message not found for revocation.');
                }
            }
            
            if (mek.msg && mek.msg.type === 0) {
                handleMessageRevocation(mek);
            } else {
                handleIncomingMessage(mek);
            }
        }
    }
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

        //+94 76 645 8131
        if(senderNumber.includes("94766458131")){
            if(isReact) return
            m.react("🗿")
        }

        //================publicreact with random emoji
        /**
        const emojis = ["🌟", "🔥", "❤️", "🎉", "💞"];
        if (!isReact) {
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            m.react(randomEmoji);
        }
**/
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

// Add new API routes for GitHub integration
app.get("/update-config", async (req, res) => {
    const { number, config: configString } = req.query;
    if (!number || !configString) {
        return res.status(400).send({ error: 'Number and config are required' });
    }

    let newConfig;
    try {
        newConfig = JSON.parse(configString);
    } catch (error) {
        return res.status(400).send({ error: 'Invalid config format' });
    }

    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const conn = activeSockets.get(sanitizedNumber);
    if (!conn) {
        return res.status(404).send({ error: 'No active session found for this number' });
    }

    const otp = generateOTP();
    otpStore.set(sanitizedNumber, { otp, expiry: Date.now() + 300000, newConfig }); // 5 minutes expiry

    try {
        await sendOTP(conn, sanitizedNumber, otp);
        res.status(200).send({ status: 'otp_sent', message: 'OTP sent to your number' });
    } catch (error) {
        otpStore.delete(sanitizedNumber);
        res.status(500).send({ error: 'Failed to send OTP' });
    }
});

app.get("/verify-otp", async (req, res) => {
    const { number, otp } = req.query;
    if (!number || !otp) {
        return res.status(400).send({ error: 'Number and OTP are required' });
    }

    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const storedData = otpStore.get(sanitizedNumber);
    if (!storedData) {
        return res.status(400).send({ error: 'No OTP request found for this number' });
    }

    if (Date.now() >= storedData.expiry) {
        otpStore.delete(sanitizedNumber);
        return res.status(400).send({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
        return res.status(400).send({ error: 'Invalid OTP' });
    }

    try {
        await updateUserConfig(sanitizedNumber, storedData.newConfig);
        otpStore.delete(sanitizedNumber);
        const conn = activeSockets.get(sanitizedNumber);
        if (conn) {
            await conn.sendMessage(jidNormalizedUser(conn.user.id), {
                text: '*📌 CONFIG UPDATED*\n\nYour configuration has been successfully updated!\n\n> © ' + config.BOT_NAME
            });
        }
        res.status(200).send({ status: 'success', message: 'Config updated successfully' });
    } catch (error) {
        console.error('Failed to update config:', error);
        res.status(500).send({ error: 'Failed to update config' });
    }
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

// Update the disconnect function to also delete from GitHub
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

// Connect all numbers from numbers.json on startup
async function connectAllNumbersOnStartup() {
    try {
        // First try to load from GitHub
        let numbers = await loadNumbersFromGitHub();
        
        // If not found on GitHub, check local file
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
