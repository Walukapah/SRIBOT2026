const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');
const config = require('../config');
const { cmd, commands } = require('../command');

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(tmpdir(), 'sri-bot-temp');

// Ensure data and tmp directories exist
if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
}

if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Function to get folder size in MB
const getFolderSizeInMB = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }

        return totalSize / (1024 * 1024); // Convert bytes to MB
    } catch (err) {
        console.error('Error getting folder size:', err);
        return 0;
    }
};

// Function to clean temp folder if size exceeds 100MB
const cleanTempFolderIfLarge = () => {
    try {
        const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
        
        if (sizeMB > 100) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                const filePath = path.join(TEMP_MEDIA_DIR, file);
                fs.unlinkSync(filePath);
            }
            console.log('Cleaned temp folder due to size:', sizeMB.toFixed(2), 'MB');
        }
    } catch (err) {
        console.error('Temp cleanup error:', err);
    }
};

// Start periodic cleanup check every 1 minute
setInterval(cleanTempFolderIfLarge, 60 * 1000);

// Load config
function loadAntideleteConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: config.ANTI_DELETE === 'true' };
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {
        return { enabled: config.ANTI_DELETE === 'true' };
    }
}

// Save config
function saveAntideleteConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('Config save error:', err);
    }
}

// Download media from message
async function downloadMedia(buffer, filename) {
    const filePath = path.join(TEMP_MEDIA_DIR, filename);
    await writeFile(filePath, buffer);
    return filePath;
}

// Command Handler
cmd({
    pattern: "antidelete",
    desc: "Enable/disable anti-delete feature",
    category: "utility",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!isOwner) {
            return reply('*Only the bot owner can use this command.*');
        }

        const config = loadAntideleteConfig();
        const match = q.toLowerCase().trim();

        if (!match) {
            return reply(`*ANTIDELETE SETUP*\n\nCurrent Status: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n*.antidelete on* - Enable\n*.antidelete off* - Disable`);
        }

        if (match === 'on') {
            config.enabled = true;
        } else if (match === 'off') {
            config.enabled = false;
        } else {
            return reply('*Invalid command. Use .antidelete to see usage.*');
        }

        saveAntideleteConfig(config);
        return reply(`*Antidelete ${match === 'on' ? 'enabled' : 'disabled'}*`);
    } catch (error) {
        console.error('Antidelete command error:', error);
        reply('An error occurred while processing the command.');
    }
});

// Store incoming messages
async function storeMessage(m) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return; // Don't store if antidelete is disabled

        if (!m.key?.id) return;

        const messageId = m.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';

        const sender = m.key.participant || m.key.remoteJid;

        // Detect content
        if (m.message?.conversation) {
            content = m.message.conversation;
        } else if (m.message?.extendedTextMessage?.text) {
            content = m.message.extendedTextMessage.text;
        } else if (m.message?.imageMessage) {
            mediaType = 'image';
            content = m.message.imageMessage.caption || '';
            try {
                const stream = await downloadContentFromMessage(m.message.imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                mediaPath = await downloadMedia(buffer, `${messageId}.jpg`);
            } catch (err) {
                console.error('Error downloading image:', err);
            }
        } else if (m.message?.stickerMessage) {
            mediaType = 'sticker';
            try {
                const stream = await downloadContentFromMessage(m.message.stickerMessage, 'sticker');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                mediaPath = await downloadMedia(buffer, `${messageId}.webp`);
            } catch (err) {
                console.error('Error downloading sticker:', err);
            }
        } else if (m.message?.videoMessage) {
            mediaType = 'video';
            content = m.message.videoMessage.caption || '';
            try {
                const stream = await downloadContentFromMessage(m.message.videoMessage, 'video');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                mediaPath = await downloadMedia(buffer, `${messageId}.mp4`);
            } catch (err) {
                console.error('Error downloading video:', err);
            }
        } else if (m.message?.documentMessage) {
            mediaType = 'document';
            content = m.message.documentMessage.fileName || '';
            try {
                const stream = await downloadContentFromMessage(m.message.documentMessage, 'document');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                const ext = m.message.documentMessage.fileName.split('.').pop() || 'bin';
                mediaPath = await downloadMedia(buffer, `${messageId}.${ext}`);
            } catch (err) {
                console.error('Error downloading document:', err);
            }
        } else if (m.message?.audioMessage) {
            mediaType = 'audio';
            try {
                const stream = await downloadContentFromMessage(m.message.audioMessage, 'audio');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                mediaPath = await downloadMedia(buffer, `${messageId}.mp3`);
            } catch (err) {
                console.error('Error downloading audio:', err);
            }
        }

        // Only store if there's content or media
        if (content || mediaType) {
            messageStore.set(messageId, {
                content,
                mediaType,
                mediaPath,
                sender,
                group: m.key.remoteJid.endsWith('@g.us') ? m.key.remoteJid : null,
                timestamp: new Date().toISOString(),
                pushName: m.pushName || 'Unknown'
            });
        }

    } catch (err) {
        console.error('storeMessage error:', err);
    }
}

// Handle message deletion
async function handleMessageRevocation(conn, revocationMessage) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;

        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const ownerNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';

        // Don't report if bot or owner deleted the message
        if (deletedBy.includes(conn.user.id) || deletedBy === ownerNumber) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender = original.sender;
        const senderName = original.pushName || sender.split('@')[0];
        const deletedByName = revocationMessage.pushName || deletedBy.split('@')[0];
        
        let groupName = '';
        if (original.group) {
            try {
                const metadata = await conn.groupMetadata(original.group);
                groupName = metadata.subject || 'Unknown Group';
            } catch (err) {
                groupName = 'Unknown Group';
            }
        }

        const time = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Colombo',
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric'
        });

        let text = `*🔰 ANTIDELETE REPORT 🔰*\n\n` +
            `*🗑️ Deleted By:* @${deletedBy.split('@')[0]}\n` +
            `*👤 Sender:* @${senderName}\n` +
            `*📱 Number:* ${sender}\n` +
            `*🕒 Time:* ${time}\n`;

        if (groupName) {
            text += `*👥 Group:* ${groupName}\n`;
        }

        if (original.content) {
            text += `\n*💬 Deleted Message:*\n${original.content}`;
        }

        // Send to owner
        await conn.sendMessage(ownerNumber, {
            text,
            mentions: [deletedBy, sender]
        });

        // Media sending
        if (original.mediaType && original.mediaPath && fs.existsSync(original.mediaPath)) {
            const mediaOptions = {
                caption: `*Deleted ${original.mediaType}*\nFrom: @${senderName}\nDeleted by: @${deletedByName}`,
                mentions: [sender, deletedBy]
            };

            try {
                switch (original.mediaType) {
                    case 'image':
                        await conn.sendMessage(ownerNumber, {
                            image: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'sticker':
                        await conn.sendMessage(ownerNumber, {
                            sticker: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'video':
                        await conn.sendMessage(ownerNumber, {
                            video: { url: original.mediaPath },
                            ...mediaOptions
                        });
                        break;
                    case 'document':
                        await conn.sendMessage(ownerNumber, {
                            document: { url: original.mediaPath },
                            fileName: `deleted_${path.basename(original.mediaPath)}`,
                            ...mediaOptions
                        });
                        break;
                    case 'audio':
                        await conn.sendMessage(ownerNumber, {
                            audio: { url: original.mediaPath },
                            mimetype: 'audio/mp4',
                            ...mediaOptions
                        });
                        break;
                }
            } catch (err) {
                await conn.sendMessage(ownerNumber, {
                    text: `⚠️ Error sending media: ${err.message}`
                });
            }

            // Cleanup
            try {
                fs.unlinkSync(original.mediaPath);
            } catch (err) {
                console.error('Media cleanup error:', err);
            }
        }

        messageStore.delete(messageId);

    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}

// Listen for message deletions
cmd({
    on: "protocol"
},
async (conn, mek, m) => {
    try {
        if (m.message?.protocolMessage?.type === 5) { // Message revocation
            await handleMessageRevocation(conn, m);
        }
    } catch (err) {
        console.error('Protocol message error:', err);
    }
});

// Store all incoming messages
cmd({
    on: "body"
},
async (conn, mek, m) => {
    try {
        await storeMessage(m);
    } catch (err) {
        console.error('Message storage error:', err);
    }
});

module.exports = {
    storeMessage,
    handleMessageRevocation
};
