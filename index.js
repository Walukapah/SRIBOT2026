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

// IMPORTANT: Define port here
const port = process.env.PORT || 7860;

// GitHub Configuration
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});
const owner = process.env.GITHUB_REPO_OWNER || 'Walukapah';
const repo = process.env.GITHUB_REPO_NAME || 'SRI-DATABASE-HF';

// Multi-number support variables
const activeSockets = new Map();
const socketCreationTime = new Map();
const SESSION_BASE_PATH = './sessions';

// Ensure session directory exists
if (!fs.existsSync(SESSION_BASE_PATH)) {
    fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

// ============================================
// MESSAGE STORE FOR ANTI DELETE (Per Number)
// ============================================
const messageStores = new Map();

function getMessageStore(number) {
    if (!messageStores.has(number)) {
        messageStores.set(number, new Map());
    }
    return messageStores.get(number);
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
        console.warn('[STARTUP] No numbers.json found on GitHub, creating new one');
        return [];
    }
}

// Save numbers to GitHub - FIXED VERSION with fresh SHA fetch
async function saveNumbersToGitHub(numbers) {
    const pathToFile = 'numbers.json';
    const contentEncoded = Buffer.from(JSON.stringify(numbers, null, 2)).toString('base64');
    
    try {
        // ALWAYS fetch fresh SHA before updating (to avoid 409 conflicts)
        let sha = null;
        let fileExists = false;
        
        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: pathToFile,
            });
            sha = data.sha;
            fileExists = true;
            console.log(`[GITHUB] Fetched fresh SHA for numbers.json: ${sha}`);
        } catch (err) {
            if (err.status === 404) {
                console.log('[GITHUB] numbers.json does not exist, will create new file');
                fileExists = false;
                sha = null;
            } else {
                throw err;
            }
        }

        // Create or update file
        if (fileExists && sha) {
            // Update existing file with fresh SHA
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: pathToFile,
                message: "Update numbers list",
                content: contentEncoded,
                sha: sha, // Fresh SHA
            });
            console.log("[STARTUP] numbers.json updated on GitHub");
        } else {
            // Create new file (no SHA needed)
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: pathToFile,
                message: "Create numbers list",
                content: contentEncoded,
                // No SHA parameter for new files
            });
            console.log("[STARTUP] numbers.json created on GitHub");
        }
        
        return true;
    } catch (err) {
        // If 409 error (SHA mismatch), retry once with fresh SHA
        if (err.status === 409) {
            console.log('[GITHUB] Got 409 conflict, retrying with fresh SHA...');
            try {
                // Fetch fresh SHA again
                const { data } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: pathToFile,
                });
                const freshSha = data.sha;
                
                console.log(`[GITHUB] Retrying with fresh SHA: ${freshSha}`);
                
                await octokit.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    path: pathToFile,
                    message: "Update numbers list (retry after conflict)",
                    content: contentEncoded,
                    sha: freshSha,
                });
                console.log("[STARTUP] numbers.json updated on GitHub (after retry)");
                return true;
            } catch (retryErr) {
                console.error("[STARTUP] Retry failed:", retryErr.message);
                return false;
            }
        }
        
        console.error("[STARTUP] Failed to save numbers to GitHub:", err.message);
        if (err.status) console.error("[STARTUP] HTTP Status:", err.status);
        if (err.response?.data?.message) console.error("[STARTUP] GitHub API Message:", err.response.data.message);
        return false;
    }
}

// Add number to numbers.json and GitHub - FIXED with immediate save
async function addNumberToStorage(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    try {
        // Load current numbers from GitHub
        let storedNumbers = await loadNumbersFromGitHub();
        
        // If empty and local file exists, use local
        if (storedNumbers.length === 0 && fs.existsSync('./numbers.json')) {
            try {
                const localData = JSON.parse(fs.readFileSync('./numbers.json', 'utf8'));
                if (Array.isArray(localData) && localData.length > 0) {
                    storedNumbers = localData;
                    console.log(`[STARTUP] Loaded ${localData.length} numbers from local file`);
                }
            } catch (e) {
                console.error('[STARTUP] Error reading local numbers.json:', e);
            }
        }
        
        // Check if number already exists
        if (!storedNumbers.includes(sanitizedNumber)) {
            storedNumbers.push(sanitizedNumber);
            
            // Save to GitHub immediately (with fresh SHA)
            const githubSuccess = await saveNumbersToGitHub(storedNumbers);
            
            // Save locally as backup
            try {
                fs.writeFileSync('./numbers.json', JSON.stringify(storedNumbers, null, 2));
            } catch (e) {
                console.error('[STARTUP] Failed to save local numbers.json:', e);
            }
            
            if (githubSuccess) {
                console.log(`[STARTUP] ✅ Added ${sanitizedNumber} to numbers list on GitHub`);
            } else {
                console.log(`[STARTUP] ⚠️ Added ${sanitizedNumber} to local numbers list only (GitHub failed)`);
            }
        } else {
            console.log(`[STARTUP] Number ${sanitizedNumber} already exists in list`);
        }
        
        return storedNumbers;
    } catch (error) {
        console.error('[STARTUP] Failed to add number to storage:', error);
        
        // Fallback to local only
        const numbersPath = './numbers.json';
        let storedNumbers = [];
        
        if (fs.existsSync(numbersPath)) {
            try {
                storedNumbers = JSON.parse(fs.readFileSync(numbersPath, 'utf8'));
            } catch (e) {
                console.error('[STARTUP] Error reading local file:', e);
            }
        }
        
        if (!storedNumbers.includes(sanitizedNumber)) {
            storedNumbers.push(sanitizedNumber);
            try {
                fs.writeFileSync(numbersPath, JSON.stringify(storedNumbers, null, 2));
            } catch (e) {
                console.error('[STARTUP] Failed to save local file:', e);
            }
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
        
        const originalLength = storedNumbers.length;
        storedNumbers = storedNumbers.filter(num => num !== sanitizedNumber);
        
        if (storedNumbers.length < originalLength) {
            // Save to GitHub with fresh SHA
            await saveNumbersToGitHub(storedNumbers);
            // Save locally
            fs.writeFileSync('./numbers.json', JSON.stringify(storedNumbers, null, 2));
            console.log(`[STARTUP] Removed ${sanitizedNumber} from numbers list`);
        }
        
        return storedNumbers;
    } catch (error) {
        console.error('[STARTUP] Failed to remove number from storage:', error);
        
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
                console.log(`[STARTUP] Deleted duplicate session file: ${sessionFiles[i].name}`);
            }
        }
    } catch (error) {
        // 404 is expected if sessions folder doesn't exist yet
        if (error.status !== 404) {
            console.error(`[STARTUP] Failed to clean duplicate files for ${number}:`, error.message);
        }
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
        console.error('[STARTUP] Failed to delete session from GitHub:', error);
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
        console.error('[STARTUP] Session restore failed:', error);
        return null;
    }
}

// Save session to GitHub - FIXED with fresh SHA fetch
async function saveSessionToGitHub(number, sessionData) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const filename = `creds_${sanitizedNumber}.json`;
        const pathToFile = `sessions/${filename}`;
        
        // Always fetch fresh SHA
        let sha = null;
        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: pathToFile
            });
            sha = data.sha;
        } catch (error) {
            if (error.status !== 404) throw error;
            // File doesn't exist yet
        }

        const content = Buffer.from(JSON.stringify(sessionData, null, 2)).toString('base64');

        try {
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: pathToFile,
                message: `Update session for ${sanitizedNumber}`,
                content: content,
                sha: sha || undefined,
            });
            console.log(`[STARTUP] Session saved to GitHub for ${sanitizedNumber}`);
        } catch (err) {
            // Retry with fresh SHA if 409 error
            if (err.status === 409) {
                console.log(`[GITHUB] Session save got 409, retrying with fresh SHA...`);
                const { data } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: pathToFile
                });
                const freshSha = data.sha;
                
                await octokit.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    path: pathToFile,
                    message: `Update session for ${sanitizedNumber} (retry)`,
                    content: content,
                    sha: freshSha,
                });
                console.log(`[STARTUP] Session saved to GitHub for ${sanitizedNumber} (retry successful)`);
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('[STARTUP] Failed to save session to GitHub:', error.message);
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
        console.error('[STARTUP] Failed to load admin list:', error);
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

    console.log(`[CONNECT] Connecting WhatsApp bot for number: ${sanitizedNumber}...`);

    // IMPORTANT: Initialize config for this number BEFORE creating socket
    // This ensures config is loaded from local file or GitHub
    await config.initializeConfig(sanitizedNumber);
    
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
        console.log(`[CONNECT] Successfully restored session for ${sanitizedNumber} from GitHub`);
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

        // Get message store for this number
        const messageStore = getMessageStore(sanitizedNumber);

        // GitHub: Save creds to GitHub when updated
        conn.ev.on('creds.update', async () => {
            await saveCreds();
            try {
                const fileContent = await fs.promises.readFile(path.join(sessionPath, 'creds.json'), { encoding: 'utf8' });
                await saveSessionToGitHub(sanitizedNumber, JSON.parse(fileContent));
            } catch (error) {
                console.error('[CONNECT] Failed to read session file:', error);
            }
        });

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(`[CONNECT] Connection lost for ${sanitizedNumber}. Reason: ${lastDisconnect?.error?.message || 'Unknown'}. Reconnecting: ${shouldReconnect}`);

                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);
                messageStores.delete(sanitizedNumber); // Clean up message store

                if (shouldReconnect) {
                    await delay(5000);
                    console.log(`[CONNECT] Attempting to reconnect ${sanitizedNumber}...`);
                    connectToWAMulti(number);
                } else {
                    console.log(`[CONNECT] Logged out from ${sanitizedNumber}, removing session files.`);
                    await fsExtra.remove(sessionPath);
                    await deleteSessionFromGitHub(sanitizedNumber);
                    await removeNumberFromStorage(sanitizedNumber);
                }
            } else if (connection === 'open') {
                console.log('[PLUGINS] Installing plugins...');
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
                                console.log(`[PLUGINS] Loaded plugin: ${pluginFile}`);
                            }
                        } catch (pluginError) {
                            console.error(`[PLUGINS] Failed to load plugin ${pluginFile}:`, pluginError);
                        }
                    }
                    console.log(`[PLUGINS] All plugins loaded successfully for ${sanitizedNumber}`);
                } catch (error) {
                    console.error(`[PLUGINS] Error loading plugins for ${sanitizedNumber}:`, error);
                }
                
                console.log(`[CONNECT] Bot connected for number: ${sanitizedNumber}`);

                // Add number to numbers.json and GitHub
                await addNumberToStorage(sanitizedNumber);

                // Send connection success message to admin
                const admins = loadAdmins();
                
                // Reload config to get latest values (including any updates from GitHub)
                await config.initializeConfig(sanitizedNumber);
                const currentConfig = config.getConfigSync(sanitizedNumber);
                
                const caption = formatMessage(
                    '*Connected Successful ✅*',
                    `📞 Number: ${sanitizedNumber}\n🩵 Status: Online\n💾 Session: Saved to GitHub`,
                    `${currentConfig.BOT_NAME}`
                );

                for (const admin of admins) {
                    try {
                        await conn.sendMessage(
                            `${admin}@s.whatsapp.net`,
                            { text: caption }
                        );
                    } catch (error) {
                        console.error(`[CONNECT] Failed to send connect message to admin ${admin}:`, error);
                    }
                }

                if (res && !res.headersSent) {
                    res.status(200).send({ status: 'connected', message: 'Bot connected successfully!' });
                }
            }
        });

        // Setup message handlers for this connection
        setupMessageHandlers(conn, sanitizedNumber, messageStore);

        // Request pairing code if not registered
        if (!conn.authState.creds.registered) {
            let code;
            try {
                await delay(1500);
                code = await conn.requestPairingCode(sanitizedNumber);
                console.log(`[CONNECT] Pairing code for ${sanitizedNumber}: ${code}`);
            } catch (error) {
                console.error(`[CONNECT] Failed to request pairing code for ${sanitizedNumber}:`, error);
                if (res && !res.headersSent) {
                    return res.status(500).send({ error: 'Failed to generate pairing code.' });
                }
            }
            if (res && !res.headersSent) {
                res.status(200).send({ code });
            }
        }

    } catch (error) {
        console.error(`[CONNECT] Failed to connect number ${sanitizedNumber}:`, error);
        activeSockets.delete(sanitizedNumber);
        socketCreationTime.delete(sanitizedNumber);
        messageStores.delete(sanitizedNumber);
        if (res && !res.headersSent) {
            res.status(500).send({ error: 'Service Unavailable or Connection Failed.' });
        }
    }
}

// ============================================
// MESSAGE HANDLERS WITH PER-NUMBER CONFIGS
// ============================================

function setupMessageHandlers(conn, number, messageStore) {
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

        // =======================================
        // HANDLE BUTTON / INTERACTIVE RESPONSES
        // =======================================

        let buttonResponseId = '';
        let isButtonResponse = false;

        // Handle native flow (interactive) button responses
        if (mek.message?.interactiveResponseMessage) {
            const response = mek.message.interactiveResponseMessage;
            isButtonResponse = true;
            
            // Try to get button ID from native flow response
            if (response.nativeFlowResponseMessage?.paramsJson) {
                try {
                    const params = JSON.parse(response.nativeFlowResponseMessage.paramsJson);
                    buttonResponseId = params.id || '';
                } catch (e) {
                    buttonResponseId = response.body?.text || '';
                }
            } else {
                buttonResponseId = response.body?.text || '';
            }
            
            console.log(`[BUTTON] User clicked native flow button: ${buttonResponseId}`);
        }

        // Handle list response (single select)
        if (mek.message?.listResponseMessage) {
            isButtonResponse = true;
            buttonResponseId = mek.message.listResponseMessage.singleSelectReply?.selectedRowId || '';
            console.log(`[LIST] User selected list item: ${buttonResponseId}`);
        }

        // Handle template button reply
        if (mek.message?.templateButtonReplyMessage) {
            isButtonResponse = true;
            buttonResponseId = mek.message.templateButtonReplyMessage.selectedId || '';
            console.log(`[TEMPLATE] User clicked template button: ${buttonResponseId}`);
        }

        // Handle buttons response message (legacy)
        if (mek.message?.buttonsResponseMessage) {
            isButtonResponse = true;
            buttonResponseId = mek.message.buttonsResponseMessage.selectedButtonId || '';
            console.log(`[LEGACY] User clicked legacy button: ${buttonResponseId}`);
        }

        // IMPORTANT: Reload config from file to get latest changes
        // This ensures .config changes take effect immediately
        const currentConfig = config.reloadConfig(number);
        
        // ============================================
        // FIXED: Ensure array configs are always arrays
        // ============================================
        const ownerNumber = Array.isArray(currentConfig.OWNER_NUMBER) 
            ? currentConfig.OWNER_NUMBER 
            : typeof currentConfig.OWNER_NUMBER === 'string' 
                ? [currentConfig.OWNER_NUMBER] 
                : [];
        
        // Auto mark as read (using dynamic config) - FIXED: removed sendReadReceipt
        if (currentConfig.READ_MESSAGE === true || currentConfig.READ_MESSAGE === "true") {
            try {
                const from = mek.key.remoteJid;
                const id = mek.key.id;
                const participant = mek.key.participant || from;

                // Only use readMessages (sendReadReceipt is not available in new Baileys)
                await conn.readMessages([{ remoteJid: from, id: id, participant: participant }]);

                console.log(blue + `[READ] Marked message from ${from} as read for ${number}.` + reset);
            } catch (error) {
                console.error(red + `[READ] Error marking message as read for ${number}:`, error + reset);
            }
        }

        // Status updates handling (using dynamic config)
        if (mek.key && mek.key.remoteJid === 'status@broadcast') {
            // Auto read Status
            if (currentConfig.AUTO_READ_STATUS === "true") {
                try {
                    await conn.readMessages([mek.key]);
                    console.log(green + `[STATUS] Status from ${mek.key.participant || mek.key.remoteJid} marked as read for ${number}.` + reset);
                } catch (error) {
                    console.error(red + `[STATUS] Error reading status for ${number}:`, error + reset);
                }
            }

            // Auto react to Status
            if (currentConfig.AUTO_REACT_STATUS === "true") {
                try {
                    await conn.sendMessage(
                        mek.key.participant || mek.key.remoteJid,
                        { react: { text: currentConfig.AUTO_REACT_STATUS_EMOJI, key: mek.key } }
                    );
                    console.log(green + `[STATUS] Reacted to status from ${mek.key.participant || mek.key.remoteJid} for ${number}` + reset);
                } catch (error) {
                    console.error(red + `[STATUS] Error reacting to status for ${number}:`, error + reset);
                }
            }
            return;
        }

        const m = sms(conn, mek);
        const type = getContentType(mek.message);
        const content = JSON.stringify(mek.message);
        const from = mek.key.remoteJid;
        const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];

        // =======================================
        // EXTRACT BODY TEXT
        // =======================================

        let body = (type === 'conversation') 
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
                            ? mek.message.listResponseMessage.singleSelectReply?.selectedRowId || mek.message.listResponseMessage.title
                        : (type === 'templateButtonReplyMessage')
                            ? mek.message.templateButtonReplyMessage.selectedId || 
                            mek.message.templateButtonReplyMessage.selectedDisplayText
                        : (type === 'interactiveResponseMessage')
                            ? (() => {
                                try {
                                    const params = JSON.parse(mek.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson || '{}');
                                    return params.id || mek.message.interactiveResponseMessage.body?.text || '';
                                } catch (e) {
                                    return mek.message.interactiveResponseMessage.body?.text || '';
                                }
                            })()
                        : (type === 'messageContextInfo')
                            ? mek.message.buttonsResponseMessage?.selectedButtonId ||
                            mek.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
                            (() => {
                                try {
                                    const params = JSON.parse(mek.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '{}');
                                    return params.id || '';
                                } catch (e) {
                                    return '';
                                }
                            })()
                        : (type === 'senderKeyDistributionMessage')
                            ? mek.message.conversation || 
                            mek.message.imageMessage?.caption ||
                            ''
                        : '';

        // If button response was detected, use that as body
        if (isButtonResponse && buttonResponseId) {
            body = buttonResponseId;
            console.log(`[HANDLER] Using button response as body: ${body}`);
        }

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
        
        const isCmd = body.startsWith(currentConfig.PREFIX);
        var budy = typeof mek.text == 'string' ? mek.text : false;
        const command = isCmd ? body.slice(currentConfig.PREFIX.length).trim().split(' ').shift().toLowerCase() : '';
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
        
        // FIXED: Use ownerNumber array that we created above
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

        // =======================================
        // ANTI DELETE SYSTEM - SAVE MESSAGES (GROUP & PRIVATE)
        // =======================================
        
        // IMPORTANT: Use currentConfig (reloaded) instead of config directly
        if ((currentConfig.ANTI_DELETE === "true" || currentConfig.ANTI_DELETE === true) && !mek.key.fromMe) {
            // Save all message types to store (works for both private and group chats)
            messageStore.set(mek.key.id, {
                key: mek.key,
                message: mek.message,
                jid: mek.key.remoteJid,
                sender: mek.key.participant || mek.key.remoteJid,
                senderName: mek.pushName || 'Unknown',
                timestamp: Date.now(),
                isGroup: mek.key.remoteJid.endsWith('@g.us')
            });
            
            // Limit store size to prevent memory issues (keep last 2000 messages)
            if (messageStore.size > 2000) {
                const firstKey = messageStore.keys().next().value;
                messageStore.delete(firstKey);
            }
        }

        // =======================================
        // HANDLE DELETE (GROUP & PRIVATE)
        // =======================================

        if (mek.message?.protocolMessage?.type === 0) { // 0 = REVOKE

            const deletedId = mek.message.protocolMessage.key.id;
            const msg = messageStore.get(deletedId);

            if (!msg) return;

            const jid = msg.jid;
            const m = msg.message;
            const deletedBy = mek.key.participant || mek.key.remoteJid;
            const deletedByNumber = deletedBy.split('@')[0];
            const sentByNumber = msg.sender.split('@')[0];
            const sentByName = msg.senderName || sentByNumber;
            
            // Don't show if bot deleted it
            if (deletedByNumber.includes(botNumber)) {
                messageStore.delete(deletedId);
                return;
            }
            
            // Create fake quoted message (the deleted message)
            const quotedMessage = {
                key: {
                    remoteJid: msg.jid,
                    fromMe: msg.sender.includes(botNumber),
                    id: deletedId,
                    participant: msg.sender
                },
                message: m
            };

            // Format sender info based on group or private chat
            const getSenderInfo = () => {
                if (msg.isGroup) {
                    return `👤 *Sent by:* @${sentByNumber} (${sentByName})\n🚮 *Deleted by:* @${deletedByNumber}`;
                } else {
                    return `👤 *Sent by:* @${sentByNumber}\n🚮 *Deleted by:* @${deletedByNumber}`;
                }
            };

            // TEXT
            if (m.conversation) {
                await conn.sendMessage(jid, {
                    text: `🚫 *This message was deleted !!*\n\n${getSenderInfo()}\n\n> 🔓 *Message:* \`\`\`${m.conversation}\`\`\``,
                    mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                }, { quoted: quotedMessage });
            }

            // EXTENDED TEXT (with caption or context)
            else if (m.extendedTextMessage) {
                await conn.sendMessage(jid, {
                    text: `🚫 *This message was deleted !!*\n\n${getSenderInfo()}\n\n> 🔓 *Message:* \`\`\`${m.extendedTextMessage.text}\`\`\``,
                    mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                }, { quoted: quotedMessage });
            }

            // IMAGE
            else if (m.imageMessage) {
                try {
                    const stream = await downloadContentFromMessage(m.imageMessage, 'image');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    await conn.sendMessage(jid, {
                        image: buffer,
                        caption: `🚫 *Deleted Image*\n\n${getSenderInfo()}${m.imageMessage.caption ? '\n\n> 🔓 *Caption:* \`\`\`' + m.imageMessage.caption + '\`\`\`' : ''}`,
                        mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                    }, { quoted: quotedMessage });
                } catch (err) {
                    console.error('[ANTI_DELETE] Error downloading deleted image:', err);
                    await conn.sendMessage(jid, {
                        text: `🚫 *Deleted Image (Could not download)*\n\n${getSenderInfo()}`,
                        mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                    }, { quoted: quotedMessage });
                }
            }

            // VIDEO
            else if (m.videoMessage) {
                try {
                    const stream = await downloadContentFromMessage(m.videoMessage, 'video');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    await conn.sendMessage(jid, {
                        video: buffer,
                        caption: `🚫 *Deleted Video*\n\n${getSenderInfo()}${m.videoMessage.caption ? '\n\n> 🔓 *Caption:* \`\`\`' + m.videoMessage.caption + '\`\`\`' : ''}`,
                        mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                    }, { quoted: quotedMessage });
                } catch (err) {
                    console.error('[ANTI_DELETE] Error downloading deleted video:', err);
                    await conn.sendMessage(jid, {
                        text: `🚫 *Deleted Video (Could not download)*\n\n${getSenderInfo()}`,
                        mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                    }, { quoted: quotedMessage });
                }
            }

            // AUDIO / VOICE
            else if (m.audioMessage) {
                try {
                    const stream = await downloadContentFromMessage(m.audioMessage, 'audio');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    await conn.sendMessage(jid, {
                        audio: buffer,
                        mimetype: 'audio/mp4',
                        ptt: m.audioMessage.ptt || false
                    }, { quoted: quotedMessage });
                    
                    // Send info text separately
                    await conn.sendMessage(jid, {
                        text: `🚫 *Deleted ${m.audioMessage.ptt ? 'Voice Message' : 'Audio'}*\n\n${getSenderInfo()}`,
                        mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                    });
                } catch (err) {
                    console.error('[ANTI_DELETE] Error downloading deleted audio:', err);
                    await conn.sendMessage(jid, {
                        text: `🚫 *Deleted ${m.audioMessage.ptt ? 'Voice Message' : 'Audio'} (Could not download)*\n\n${getSenderInfo()}`,
                        mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                    }, { quoted: quotedMessage });
                }
            }

            // DOCUMENT
            else if (m.documentMessage) {
                try {
                    const stream = await downloadContentFromMessage(m.documentMessage, 'document');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    await conn.sendMessage(jid, {
                        document: buffer,
                        mimetype: m.documentMessage.mimetype,
                        fileName: m.documentMessage.fileName || "deleted-file",
                        caption: `🚫 *Deleted Document*\n\n${getSenderInfo()}`,
                        mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                    }, { quoted: quotedMessage });
                } catch (err) {
                    console.error('[ANTI_DELETE] Error downloading deleted document:', err);
                    await conn.sendMessage(jid, {
                        text: `🚫 *Deleted Document (Could not download)*\n\n${getSenderInfo()}`,
                        mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                    }, { quoted: quotedMessage });
                }
            }

            // STICKER
            else if (m.stickerMessage) {
                try {
                    const stream = await downloadContentFromMessage(m.stickerMessage, 'sticker');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    await conn.sendMessage(jid, {
                        sticker: buffer
                    }, { quoted: quotedMessage });
                    
                    // Send info text separately
                    await conn.sendMessage(jid, {
                        text: `🚫 *Deleted Sticker*\n\n${getSenderInfo()}`,
                        mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                    });
                } catch (err) {
                    console.error('[ANTI_DELETE] Error downloading deleted sticker:', err);
                    await conn.sendMessage(jid, {
                        text: `🚫 *Deleted Sticker (Could not download)*\n\n${getSenderInfo()}`,
                        mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                    }, { quoted: quotedMessage });
                }
            }

            // LOCATION
            else if (m.locationMessage) {
                await conn.sendMessage(jid, {
                    text: `🚫 *Deleted Location*\n\n${getSenderInfo()}\n\n📍 *Location:* ${m.locationMessage.degreesLatitude}, ${m.locationMessage.degreesLongitude}`,
                    mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                }, { quoted: quotedMessage });
            }

            // LIVE LOCATION
            else if (m.liveLocationMessage) {
                await conn.sendMessage(jid, {
                    text: `🚫 *Deleted Live Location*\n\n${getSenderInfo()}\n\n📍 *Location:* ${m.liveLocationMessage.degreesLatitude}, ${m.liveLocationMessage.degreesLongitude}`,
                    mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                }, { quoted: quotedMessage });
            }

            // CONTACT CARD
            else if (m.contactMessage) {
                await conn.sendMessage(jid, {
                    text: `🚫 *Deleted Contact*\n\n${getSenderInfo()}\n\n👤 *Contact:* ${m.contactMessage.displayName || 'Unknown'}\n📞 *Number:* ${m.contactMessage.vcard ? m.contactMessage.vcard.match(/waid=(\d+)/)?.[1] || 'Unknown' : 'Unknown'}`,
                    mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                }, { quoted: quotedMessage });
            }

            // CONTACTS ARRAY
            else if (m.contactsArrayMessage) {
                await conn.sendMessage(jid, {
                    text: `🚫 *Deleted Contacts List*\n\n${getSenderInfo()}\n\n📋 *Contacts:* ${m.contactsArrayMessage.contacts?.length || 0} contacts`,
                    mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                }, { quoted: quotedMessage });
            }

            // POLL
            else if (m.pollMessage) {
                await conn.sendMessage(jid, {
                    text: `🚫 *Deleted Poll*\n\n${getSenderInfo()}\n\n📊 *Question:* ${m.pollMessage.name || 'Unknown'}\n📝 *Options:* ${m.pollMessage.options?.map(opt => opt.optionName).join(', ') || 'None'}`,
                    mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                }, { quoted: quotedMessage });
            }

            // UNKNOWN TYPE
            else {
                await conn.sendMessage(jid, {
                    text: `🚫 *Deleted Message (Unsupported type: ${Object.keys(m)[0]})*\n\n${getSenderInfo()}`,
                    mentions: msg.isGroup ? [msg.sender, deletedBy] : []
                }, { quoted: quotedMessage });
            }

            // Remove from memory after handling
            messageStore.delete(deletedId);
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

        // WORK TYPE (using currentConfig)
        if (currentConfig.MODE === "private" && !isOwner) return;
        if (currentConfig.MODE === "inbox" && isGroup) return;
        if (currentConfig.MODE === "groups" && !isGroup) return;
        
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
        
        // =======================================
        // COMMAND HANDLER
        // =======================================
        
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
        
        // =======================================
        // BUTTON RESPONSE HANDLER (Non-command)
        // =======================================
        
        // Handle button responses that don't match commands
        if (isButtonResponse && buttonResponseId && !isCmd) {
            console.log(`[BUTTON HANDLER] Processing button response: ${buttonResponseId}`);
            
            // Find command that matches button response using regex or startsWith
            const buttonCmd = events.commands.find((cmd) => {
                if (cmd.on !== "body") return false;
                
                // Check if this command's pattern matches the body
                let patternMatches = false;
                
                if (cmd.pattern) {
                    if (typeof cmd.pattern === 'string') {
                        patternMatches = body.trim() === cmd.pattern || body.startsWith(cmd.pattern);
                    } else if (cmd.pattern instanceof RegExp) {
                        patternMatches = cmd.pattern.test(body);
                    }
                }
                
                if (patternMatches) {
                    try {
                        cmd.function(conn, mek, m, {from, l, quoted, body, isCmd, command: cmd, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
                        console.log(`[BUTTON HANDLER] Body handler matched: ${cmd.pattern}`);
                    } catch (e) {
                        console.error("[BODY HANDLER ERROR] " + e);
                    }
                }
            });
            
            // If no command matched, use fallback responses
            if (!buttonCmd) {
                console.log(`[BUTTON HANDLER] No handler found for: ${buttonResponseId}`);
                
                // Fallback to old buttonResponses object
                const buttonResponses = {
                    'btn_yes': '✅ You clicked YES! Great choice.',
                    'btn_no': '❌ You clicked NO! Maybe next time.',
                    'btn_status': '🤖 Bot is running perfectly on SRI-BOT!',
                    'btn_help': 'ℹ️ Use .menu for full command list or .testbuttons for button demo',
                    'menu_ping': '🚀 Use .ping command to check bot response speed!',
                    'menu_owner': '👤 Use .owner to contact the bot owner.',
                    'menu_about': 'ℹ️ SRI-BOT is a multi-number WhatsApp bot with GitHub integration.',
                    'cmd_ping': '🚀 Use .ping command to check bot response speed!',
                    'cmd_owner': '👤 Use .owner to contact the bot owner.',
                    'cmd_status': '📊 Bot Status:\n• Uptime: ' + runtime(process.uptime()) + '\n• Version: ' + currentConfig.VERSION,
                    'cmd_invite': '🔗 Use .invite to get group invite link.',
                    'cmd_promote': '👮 Use .promote @user to make someone admin.',
                    'cmd_remove': '🚫 Use .kick @user to remove a member.',
                    'cmd_joke': '😂 Joke feature coming soon!',
                    'cmd_sticker': '🖼️ Use .sticker to create stickers from images.',
                    'cmd_ytmusic': '🎵 Use .ytmp3 or .play to download music.',
                    'cmd_all': '📜 Full command list:\n.ping - Check speed\n.owner - Contact owner\n.menu - Show menu\n.testbuttons - Button demo',
                    'img_like': '❤️ Thanks for liking! We appreciate your support.',
                    'img_share': '🔁 Sharing is caring! Spread the word about SRI-BOT.'
                };
                
                const responseText = buttonResponses[buttonResponseId];
                if (responseText) {
                    await reply(responseText);
                } else if (buttonResponseId.startsWith('cmd_') || buttonResponseId.startsWith('btn_') || buttonResponseId.startsWith('menu_') || buttonResponseId.startsWith('img_')) {
                    await reply(`📌 You selected: *${buttonResponseId}*\n\nThis feature is being developed!`);
                }
            }
        }
        
        // =======================================
        // EVENT HANDLERS (on: body, text, etc.)
        // =======================================
        // FIXED: Stop after first match to prevent duplicate messages
        
        let handled = false;
        
        for (const command of events.commands) {
            if (handled) break; // Stop if already handled
            
            if (body && command.on === "body") {
                // Skip if already handled as button response
                if (isButtonResponse && buttonResponseId) continue;
                
                // Check if this command's pattern matches the body
                let patternMatches = false;
                
                if (command.pattern) {
                    if (typeof command.pattern === 'string') {
                        patternMatches = body.trim() === command.pattern || body.startsWith(command.pattern);
                    } else if (command.pattern instanceof RegExp) {
                        patternMatches = command.pattern.test(body);
                    }
                }
                
                if (patternMatches) {
                    try {
                        await command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
                        handled = true; // Mark as handled
                        console.log(`[HANDLER] Body handler matched: ${command.pattern}`);
                    } catch (e) {
                        console.error("[BODY HANDLER ERROR] " + e);
                    }
                }
            } else if (mek.q && command.on === "text") {
                try {
                    command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
                } catch (e) {
                    console.error("[TEXT HANDLER ERROR] " + e);
                }
            } else if (
                (command.on === "image" || command.on === "photo") &&
                mek.type === "imageMessage"
            ) {
                try {
                    command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
                } catch (e) {
                    console.error("[IMAGE HANDLER ERROR] " + e);
                }
            } else if (
                command.on === "sticker" &&
                mek.type === "stickerMessage"
            ) {
                try {
                    command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
                } catch (e) {
                    console.error("[STICKER HANDLER ERROR] " + e);
                }
            }
        }
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
        console.error('[API] Failed to fetch GitHub sessions:', error);
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
            messageStores.delete(sanitizedNumber); // Clean up message store
            await fsExtra.remove(path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`));
            await deleteSessionFromGitHub(sanitizedNumber);
            await removeNumberFromStorage(sanitizedNumber);
            
            res.status(200).send({
                status: 'disconnected',
                message: `Disconnected ${sanitizedNumber} and removed session from GitHub.`
            });
        } catch (error) {
            console.error(`[API] Error disconnecting ${sanitizedNumber}:`, error);
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

app.listen(port, () => console.log(`[SERVER] Multi-Number WhatsApp Bot Server with GitHub integration listening on port http://localhost:${port}`));

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
        console.error('[STARTUP] Error connecting numbers on startup:', error);
    }
}

connectAllNumbersOnStartup();
