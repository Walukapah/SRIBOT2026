const { cmd } = require('../command');
const { Button } = require('../lib/button');
const config = require('../config');
const { fetchJson, getBuffer } = require('../lib/functions');

// Store PH downloads globally
if (!global.phDownloads) global.phDownloads = new Map();
if (!global.phReplyHandlers) global.phReplyHandlers = new Map();

// API Base URL
const API_BASE = 'https://sriapi.koyeb.app/download/phdl';

// Quality labels mapping
const QUALITY_LABELS = {
    '1080p': '1080p (Full HD)',
    '720p': '720p (HD)',
    '480p': '480p (SD)',
    '240p': '240p (Low)'
};

// Helper: Process download with retry
async function processDownload(url, maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            console.log(`[PHDL] Download attempt ${i + 1}/${maxAttempts}`);
            const response = await fetch(url, { 
                method: 'GET',
                timeout: 30000 
            });
            
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('video')) {
                    return { success: true, url: url, direct: true };
                }
                const text = await response.text();
                // Check if we got a redirect or actual file
                if (text.length < 500) {
                    // Might be a redirect URL
                    try {
                        const json = JSON.parse(text);
                        if (json.url || json.download) return { success: true, url: json.url || json.download };
                    } catch {
                        // Not JSON, might be direct file
                    }
                }
                return { success: true, url: url, direct: true };
            }
        } catch (error) {
            console.error(`[PHDL] Attempt ${i + 1} failed:`, error.message);
            if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 2000));
        }
    }
    return { success: true, url: url }; // Return original URL anyway
}

// Helper: Handle PH download
async function handlePHDownload(conn, mek, from, reply, downloadData) {
    try {
        await reply(`⏳ *Processing ${downloadData.quality} download...*\\n\\n⏱️ This may take a moment...`);
        
        const fileUrl = downloadData.url;
        console.log(`[PHDL] Sending file: ${fileUrl.substring(0, 60)}...`);
        
        const caption = `🎬 *PH Download (${downloadData.quality})*\\n\\n⏱️ *Duration:* ${downloadData.duration}\\n👁️ *Views:* ${downloadData.views}\\n❤️ *Likes:* ${downloadData.likes}\\n\\n📥 Downloaded via ${config.BOT_NAME}`;
        
        if (downloadData.mode === 'document') {
            await conn.sendMessage(from, {
                document: { url: fileUrl },
                mimetype: 'video/mp4',
                fileName: `PH_${downloadData.quality}_${Date.now()}.mp4`,
                caption: caption
            }, { quoted: mek });
        } else {
            await conn.sendMessage(from, {
                video: { url: fileUrl },
                caption: caption,
                mimetype: 'video/mp4'
            }, { quoted: mek });
        }
        return true;
    } catch (error) {
        console.error('[PHDL DOWNLOAD ERROR]', error);
        await reply(`❌ *Failed to download!*\n\n${error.message}`);
        return false;
    }
}

// Create reply handler for text mode
function createReplyHandler(conn, messageID, from, mek) {
    return async function replyHandler(messageUpdate) {
        try {
            const mekInfo = messageUpdate?.messages[0];
            if (!mekInfo?.message) return;

            const msgText = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
            const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (!isReplyToSentMsg || !msgText) return;

            const userReply = msgText.trim();
            const downloadData = global.phDownloads.get(messageID);
            
            if (!downloadData) {
                console.log(`[PHDL] No download data found for message: ${messageID}`);
                return;
            }

            let selectedDownload = null;

            switch(userReply) {
                case "1":
                    selectedDownload = { 
                        ...downloadData, 
                        quality: downloadData.qualities[0] || '1080p',
                        url: downloadData.downloads[downloadData.qualities[0] || '1080p'],
                        mode: 'normal'
                    };
                    break;
                case "1d":
                    selectedDownload = { 
                        ...downloadData, 
                        quality: downloadData.qualities[0] || '1080p',
                        url: downloadData.downloads[downloadData.qualities[0] || '1080p'],
                        mode: 'document'
                    };
                    break;
                case "2":
                    selectedDownload = { 
                        ...downloadData, 
                        quality: downloadData.qualities[1] || '720p',
                        url: downloadData.downloads[downloadData.qualities[1] || '720p'],
                        mode: 'normal'
                    };
                    break;
                case "2d":
                    selectedDownload = { 
                        ...downloadData, 
                        quality: downloadData.qualities[1] || '720p',
                        url: downloadData.downloads[downloadData.qualities[1] || '720p'],
                        mode: 'document'
                    };
                    break;
                case "3":
                    selectedDownload = { 
                        ...downloadData, 
                        quality: downloadData.qualities[2] || '480p',
                        url: downloadData.downloads[downloadData.qualities[2] || '480p'],
                        mode: 'normal'
                    };
                    break;
                case "3d":
                    selectedDownload = { 
                        ...downloadData, 
                        quality: downloadData.qualities[2] || '480p',
                        url: downloadData.downloads[downloadData.qualities[2] || '480p'],
                        mode: 'document'
                    };
                    break;
                case "4":
                    selectedDownload = { 
                        ...downloadData, 
                        quality: downloadData.qualities[3] || '240p',
                        url: downloadData.downloads[downloadData.qualities[3] || '240p'],
                        mode: 'normal'
                    };
                    break;
                case "4d":
                    selectedDownload = { 
                        ...downloadData, 
                        quality: downloadData.qualities[3] || '240p',
                        url: downloadData.downloads[downloadData.qualities[3] || '240p'],
                        mode: 'document'
                    };
                    break;
                default:
                    return;
            }

            if (selectedDownload && selectedDownload.url) {
                console.log(`[PHDL] Processing reply: ${userReply} for quality: ${selectedDownload.quality}`);
                await handlePHDownload(
                    conn, 
                    mekInfo, 
                    from, 
                    (text) => conn.sendMessage(from, { text }, { quoted: mekInfo }), 
                    selectedDownload
                );
            } else {
                await conn.sendMessage(from, { text: "❌ *Download URL not available for this quality!*" }, { quoted: mekInfo });
            }

        } catch (error) {
            console.error('[PHDL REPLY ERROR]', error);
        }
    };
}

// Main PHDL Command
cmd({
    pattern: "phdl",
    alias: ["ph", "phdownload", "phvideo"],
    desc: "Download PH videos",
    category: "download",
    react: "🔞",
    filename: __filename
}, async (conn, mek, m, { from, reply, args, q, pushname }) => {
    try {
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        const messageType = config.MESSAGE_TYPE || 'button';

        if (!q || (!q.includes('pornhub.com') && !q.includes('phncdn.com'))) {
            return reply(`❌ *Please provide a valid PH URL!*\n\n*Usage:* ${prefix}phdl <video-url>`);
        }

        const videoUrl = q.trim();
        await reply(`⏳ *Fetching video info...*\n\n🔄 Please wait...`);

        const apiUrl = `${API_BASE}?url=${encodeURIComponent(videoUrl)}`;
        
        console.log(`[PHDL] Fetching: ${apiUrl}`);
        
        let response;
        try {
            response = await fetchJson(apiUrl);
        } catch (apiError) {
            console.error('[PHDL] API Error:', apiError);
            return reply(`❌ *API Error!*\n\nFailed to fetch video information.`);
        }

        // Parse response
        if (!response || response.status !== true || !response.result) {
            console.error('[PHDL] Invalid response:', response);
            return reply(`❌ *Failed to fetch video!*`);
        }

        const result = response.result;
        
        if (!result.success) {
            return reply(`❌ *API returned error!*\n\nStatus: ${result.status || 'Unknown'}`);
        }

        // Extract data
        const title = result.title || 'Unknown Title';
        const description = result.description || '';
        const duration = result.duration || 'Unknown';
        const uploadDate = result.upload_date ? new Date(result.upload_date).toLocaleDateString() : 'Unknown';
        const thumbnail = result.thumbnail || '';
        const views = result.views || 'Unknown';
        const likes = result.likes || 'Unknown';
        
        // Extract download URLs
        const downloads = result.download || {};
        const m3u8Urls = result.m3u8 || {};
        
        // Get available qualities (sorted high to low)
        const qualities = Object.keys(downloads).filter(q => downloads[q]).sort((a, b) => {
            const getNum = (s) => parseInt(s.replace(/[^0-9]/g, '')) || 0;
            return getNum(b) - getNum(a);
        });
        
        if (qualities.length === 0) {
            return reply(`❌ *No download formats found!*`);
        }

        console.log(`[PHDL] Available qualities: ${qualities.join(', ')}`);

        // Build info text
        let infoText = `🔞 *PH Video Info*\n\n`;
        infoText += `📌 *Title:* ${title}\n`;
        if (description) infoText += `📝 *Description:* ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}\n`;
        infoText += `⏱️ *Duration:* ${duration}\n`;
        infoText += `📅 *Upload Date:* ${uploadDate}\n`;
        infoText += `👁️ *Views:* ${views}\n`;
        infoText += `❤️ *Likes:* ${likes}\n\n`;
        infoText += `📊 *Available Qualities:* ${qualities.length}`;

        // Store download data
        const downloadData = {
            downloads: downloads,
            qualities: qualities,
            duration: duration,
            views: views,
            likes: likes,
            thumbnail: thumbnail
        };

        if (messageType === 'text') {
            // TEXT MODE
            let optionsText = `\n\n📥 *Reply with your choice:*\n`;
            
            qualities.forEach((quality, index) => {
                const label = QUALITY_LABELS[quality] || quality;
                optionsText += `\n${index + 1}. *${label}*\n`;
                optionsText += `   🎬 *${index + 1}* - Video\n`;
                optionsText += `   📄 *${index + 1}d* - Document\n`;
            });
            
            optionsText += `\n⏳ *Active for 3 minutes*\n`;
            optionsText += `${config.FOOTER || "POWERED BY SRI-BOT 🇱🇰"}`;

            const sendOptions = thumbnail 
                ? { image: { url: thumbnail }, caption: infoText + optionsText }
                : { text: infoText + optionsText };

            const sentMsg = await conn.sendMessage(from, sendOptions, { quoted: mek });

            const messageID = sentMsg.key.id;
            global.phDownloads.set(messageID, downloadData);

            const replyHandler = createReplyHandler(conn, messageID, from, mek);
            global.phReplyHandlers.set(messageID, replyHandler);
            conn.ev.on('messages.upsert', replyHandler);

            // Timeout cleanup
            setTimeout(() => {
                if (global.phReplyHandlers.has(messageID)) {
                    const handler = global.phReplyHandlers.get(messageID);
                    conn.ev.off('messages.upsert', handler);
                    global.phReplyHandlers.delete(messageID);
                    global.phDownloads.delete(messageID);
                }
            }, 180000);

        } else {
            // BUTTON MODE
            const btn = new Button();
            
            if (thumbnail) {
                await btn.setImage(thumbnail);
            }
            
            btn.setTitle("🔞 PH Downloader");
            btn.setBody(infoText);
            btn.setFooter(`Powered by ${botName} 🇱🇰`);

            btn.addSelection("📥 Select Quality");
            btn.makeSection("⬇️ Download Options", "Available qualities");

            const baseId = Date.now().toString();

            qualities.forEach((quality, index) => {
                const label = QUALITY_LABELS[quality] || quality;
                const vidId = `phvid_${baseId}_${quality}`;
                const docId = `phviddoc_${baseId}_${quality}`;
                
                btn.makeRow("🎬", label, "Video format", vidId);
                btn.makeRow("📄", `${label} (Doc)`, "Document format", docId);
                
                global.phDownloads.set(vidId, {
                    url: downloads[quality],
                    quality: quality,
                    mode: 'normal',
                    duration: duration,
                    views: views,
                    likes: likes
                });
                
                global.phDownloads.set(docId, {
                    url: downloads[quality],
                    quality: quality,
                    mode: 'document',
                    duration: duration,
                    views: views,
                    likes: likes
                });
            });

            await btn.send(from, conn, mek);
        }

    } catch (error) {
        console.error("[PHDL] Error:", error);
        reply(`❌ *Error!*\n\n${error.message}`);
    }
});

// Button handlers for button mode
cmd({
    pattern: "phvid_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !global.phDownloads || !body.startsWith('phvid_')) return;
    
    const data = global.phDownloads.get(body);
    if (!data) return;
    
    await handlePHDownload(conn, mek, from, reply, data);
});

cmd({
    pattern: "phviddoc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !global.phDownloads || !body.startsWith('phviddoc_')) return;
    
    const data = global.phDownloads.get(body);
    if (!data) return;
    
    await handlePHDownload(conn, mek, from, reply, data);
});
