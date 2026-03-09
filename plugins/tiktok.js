const { cmd } = require('../command');
const { Button } = require('../lib/button');
const config = require('../config');
const { getBuffer, fetchJson } = require('../lib/functions');

// Store TikTok downloads globally
if (!global.tiktokDownloads) global.tiktokDownloads = new Map();
if (!global.tiktokReplyHandlers) global.tiktokReplyHandlers = new Map();

// Helper function to handle TikTok downloads
async function handleTikTokDownload(conn, mek, from, reply, downloadData) {
    try {
        if (downloadData.type === 'video') {
            if (downloadData.mode === 'document') {
                await reply(`⏳ *Downloading ${downloadData.quality} video as document...*`);
                await conn.sendMessage(from, {
                    document: { url: downloadData.url },
                    mimetype: 'video/mp4',
                    fileName: `TikTok_${downloadData.username}_${Date.now()}_${downloadData.quality}_${downloadData.quality === 'WM' ? 'WM' : 'NoWM'}.mp4`,
                    caption: `🎬 *TikTok Video (${downloadData.quality} - ${downloadData.quality === 'WM' ? 'With Watermark' : 'No Watermark'} - Document)*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            } else {
                await reply(`⏳ *Downloading ${downloadData.quality} video...*`);
                await conn.sendMessage(from, {
                    video: { url: downloadData.url },
                    caption: `🎬 *TikTok Video (${downloadData.quality} - ${downloadData.quality === 'WM' ? 'With Watermark' : 'No Watermark'})*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            }
        } else if (downloadData.type === 'audio') {
            if (downloadData.mode === 'document') {
                await reply(`⏳ *Downloading audio as document...*`);
                await conn.sendMessage(from, {
                    document: { url: downloadData.url },
                    mimetype: 'audio/mpeg',
                    fileName: `TikTok_${downloadData.title || 'Audio'}_${Date.now()}.mp3`,
                    caption: `🎵 *TikTok Music*\n\n🎶 ${downloadData.title || 'Unknown'}\n👤 ${downloadData.musicAuthor || 'Unknown'}\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            } else {
                await reply(`⏳ *Downloading audio...*`);
                await conn.sendMessage(from, {
                    audio: { url: downloadData.url },
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: mek });
            }
        }
        return true;
    } catch (error) {
        console.error('[TIKTOK DOWNLOAD ERROR]', error);
        await reply(`❌ *Failed to download!*\n\n${error.message}`);
        return false;
    }
}

// Create reply handler for a specific message
function createReplyHandler(conn, messageID, from, mek) {
    return async function replyHandler(messageUpdate) {
        try {
            const mekInfo = messageUpdate?.messages[0];
            if (!mekInfo?.message) return;

            const msgText = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
            const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (!isReplyToSentMsg || !msgText) return;

            const userReply = msgText.trim();
            const downloadData = global.tiktokDownloads.get(messageID);
            
            if (!downloadData) {
                console.log(`[TIKTOK] No download data found for message: ${messageID}`);
                return;
            }

            let selectedDownload = null;

            switch(userReply) {
                case "1.1":
                    selectedDownload = { 
                        type: 'video', 
                        quality: 'HD', 
                        mode: 'normal', 
                        url: downloadData.videoUrlHD, 
                        coverImage: downloadData.coverImage, 
                        author: downloadData.author, 
                        caption: downloadData.caption, 
                        username: downloadData.username 
                    };
                    break;
                case "1.2":
                    selectedDownload = { 
                        type: 'video', 
                        quality: 'HD', 
                        mode: 'document', 
                        url: downloadData.videoUrlHD, 
                        coverImage: downloadData.coverImage, 
                        author: downloadData.author, 
                        caption: downloadData.caption, 
                        username: downloadData.username 
                    };
                    break;
                case "1.3":
                    selectedDownload = { 
                        type: 'video', 
                        quality: 'WM', 
                        mode: 'normal', 
                        url: downloadData.videoUrlWM, 
                        coverImage: downloadData.coverImage, 
                        author: downloadData.author, 
                        caption: downloadData.caption, 
                        username: downloadData.username 
                    };
                    break;
                case "1.4":
                    selectedDownload = { 
                        type: 'video', 
                        quality: 'WM', 
                        mode: 'document', 
                        url: downloadData.videoUrlWM, 
                        coverImage: downloadData.coverImage, 
                        author: downloadData.author, 
                        caption: downloadData.caption, 
                        username: downloadData.username 
                    };
                    break;
                case "2.1":
                    selectedDownload = { 
                        type: 'audio', 
                        mode: 'normal', 
                        url: downloadData.musicUrl, 
                        coverImage: downloadData.coverImage, 
                        author: downloadData.author, 
                        title: downloadData.title, 
                        musicAuthor: downloadData.musicAuthor 
                    };
                    break;
                case "2.2":
                    selectedDownload = { 
                        type: 'audio', 
                        mode: 'document', 
                        url: downloadData.musicUrl, 
                        coverImage: downloadData.coverImage, 
                        author: downloadData.author, 
                        title: downloadData.title, 
                        musicAuthor: downloadData.musicAuthor 
                    };
                    break;
                default:
                    // Invalid reply - ignore
                    return;
            }

            if (selectedDownload) {
                console.log(`[TIKTOK] Processing reply: ${userReply} for message: ${messageID}`);
                await handleTikTokDownload(
                    conn, 
                    mekInfo, 
                    from, 
                    (text) => conn.sendMessage(from, { text }, { quoted: mekInfo }), 
                    selectedDownload
                );
                // DO NOT remove handler - allow multiple replies
                // Handler will be removed after timeout only
            }

        } catch (error) {
            console.error('[TIKTOK REPLY ERROR]', error);
        }
    };
}

// Main TikTok Command
cmd({
    pattern: "tiktok",
    alias: ["tt", "ttdl", "tiktokdl"],
    desc: "Download TikTok videos without watermark",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, reply, args, q, pushname }) => {
    try {
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        const messageType = config.MESSAGE_TYPE || 'button';

        if (!q || (!q.includes('tiktok.com') && !q.includes('vt.tiktok'))) {
            return reply(`❌ *Please provide a valid TikTok URL!*\n\n*Usage:* ${prefix}tiktok <video-url>`);
        }

        const tiktokUrl = q.trim();
        await reply(`⏳ *Downloading TikTok video...*\n\n🔄 Please wait while I fetch the video...`);

        const apiUrl = `https://sri-api.vercel.app/download/tiktokdl?url=${encodeURIComponent(tiktokUrl)}`;
        const response = await fetchJson(apiUrl);

        if (!response || !response.status || !response.result || !response.result.data) {
            return reply(`❌ *Failed to fetch video!*\n\nThe video might be private, deleted, or the API is temporarily unavailable.`);
        }

        const data = response.result.data;
        const videoInfo = data.video_info;
        const author = data.author;
        const stats = data.statistics;
        const downloadLinks = data.download_links;
        const music = data.music;

        const infoText = `🎵 *TikTok Video Info*\n\n` +
            `👤 *Author:* ${author.nickname} (@${author.username})\n` +
            `📝 *Caption:* ${videoInfo.caption || 'No caption'}\n` +
            `📅 *Posted:* ${videoInfo.created_at_pretty}\n` +
            `⏱️ *Duration:* ${videoInfo.duration_formatted}\n` +
            `📊 *Stats:*\n` +
            `   ❤️ ${stats.likes_formatted} Likes\n` +
            `   💬 ${stats.comments} Comments\n` +
            `   🔄 ${stats.shares} Shares\n` +
            `   👁️ ${stats.plays_formatted} Views\n` +
            `   💾 ${stats.saves} Saves\n\n` +
            `🎶 *Music:* ${music.title} - ${music.author}`;

        if (messageType === 'text') {
            // TEXT MODE - Multi Reply Support
            const infoMsg = infoText + `\n\n📥 *Reply with your choice:*\n` +
                `🎬 *1.1* - No Watermark Video HD\n` +
                `🎬 *1.2* - No Watermark Video HD (Document)\n` +
                `🎬 *1.3* - With Watermark Video\n` +
                `🎬 *1.4* - With Watermark Video (Document)\n` +
                `🎵 *2.1* - Audio\n` +
                `🎵 *2.2* - Audio (Document)\n\n` +
                `⏳ *Active for 3 minutes - You can reply multiple times!*\n` +
                `${config.FOOTER || "POWERED BY SRI-BOT 🇱🇰"}`;

            const sentMsg = await conn.sendMessage(from, { 
                image: { url: videoInfo.cover_image }, 
                caption: infoMsg,
                contextInfo: {
                    externalAdReply: {
                        title: "TikTok Downloader",
                        body: `${author.nickname}'s video`,
                        thumbnailUrl: videoInfo.cover_image,
                        sourceUrl: tiktokUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: mek });

            const messageID = sentMsg.key.id;
            
            // Store all download data
            global.tiktokDownloads.set(messageID, {
                videoUrlHD: downloadLinks.no_watermark.hd,
                videoUrlSD: downloadLinks.no_watermark.sd,
                videoUrlWM: downloadLinks.with_watermark.url,
                musicUrl: music.play_url,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                caption: videoInfo.caption,
                title: music.title,
                musicAuthor: music.author,
                username: author.username
            });

            // Create and register reply handler
            const replyHandler = createReplyHandler(conn, messageID, from, mek);
            global.tiktokReplyHandlers.set(messageID, replyHandler);
            conn.ev.on('messages.upsert', replyHandler);

            console.log(`[TIKTOK] Text mode handler registered for message: ${messageID}`);

            // Set timeout to remove handler after 3 minutes
            setTimeout(() => {
                if (global.tiktokReplyHandlers.has(messageID)) {
                    const handler = global.tiktokReplyHandlers.get(messageID);
                    conn.ev.off('messages.upsert', handler);
                    global.tiktokReplyHandlers.delete(messageID);
                    global.tiktokDownloads.delete(messageID);
                    console.log(`[TIKTOK] Handler expired for message: ${messageID}`);
                    
                    // Send expiration notice
                    conn.sendMessage(from, {
                        text: `⏰ *Download session expired!*\n\nThe download options for this TikTok video are no longer available.\nPlease use *.tiktok <url>* again if you need to download.`
                    }).catch(() => {});
                }
            }, 180000); // 3 minutes

        } else {
            // BUTTON MODE
            const btn = new Button();
            await btn.setImage(videoInfo.cover_image);
            btn.setTitle("🎵 TikTok Downloader");
            btn.setBody(infoText);
            btn.setFooter(`Powered by ${botName} 🇱🇰`);

            btn.addSelection("📥 Select Download Option");
            btn.makeSection("⬇️ Download Options", "Choose what to download");

            const baseId = Date.now().toString();

            const videoHDId = `ttvidhd_${baseId}`;
            const videoHDDocumentId = `ttvidhddoc_${baseId}`;
            const videoWMId = `ttvidwm_${baseId}`;
            const videoWMDocumentId = `ttvidwmdoc_${baseId}`;
            const audioId = `ttaud_${baseId}`;
            const audioDocumentId = `ttauddoc_${baseId}`;

            btn.makeRow("🎬", "No WM Video HD", "High quality no watermark", videoHDId);
            btn.makeRow("📄", "No WM Video HD (Doc)", "HD video as document", videoHDDocumentId);
            btn.makeRow("🎬", "With Watermark Video", "Video with watermark", videoWMId);
            btn.makeRow("📄", "With Watermark (Doc)", "WM video as document", videoWMDocumentId);
            btn.makeRow("🎵", "Audio", "Original audio file", audioId);
            btn.makeRow("📄", "Audio (Document)", "Audio as document file", audioDocumentId);
            btn.addUrl("🔗 View on TikTok", tiktokUrl);

            const sentMsg = await btn.send(from, conn, mek);

            console.log(`[TIKTOK] Button message sent. Base ID: ${baseId}`);

            // Store all download data with button IDs
            global.tiktokDownloads.set(videoHDId, { type: 'video', quality: 'HD', mode: 'normal', url: downloadLinks.no_watermark.hd, coverImage: videoInfo.cover_image, author: author.nickname, caption: videoInfo.caption, username: author.username });
            global.tiktokDownloads.set(videoHDDocumentId, { type: 'video', quality: 'HD', mode: 'document', url: downloadLinks.no_watermark.hd, coverImage: videoInfo.cover_image, author: author.nickname, caption: videoInfo.caption, username: author.username });
            global.tiktokDownloads.set(videoWMId, { type: 'video', quality: 'WM', mode: 'normal', url: downloadLinks.with_watermark.url, coverImage: videoInfo.cover_image, author: author.nickname, caption: videoInfo.caption, username: author.username });
            global.tiktokDownloads.set(videoWMDocumentId, { type: 'video', quality: 'WM', mode: 'document', url: downloadLinks.with_watermark.url, coverImage: videoInfo.cover_image, author: author.nickname, caption: videoInfo.caption, username: author.username });
            global.tiktokDownloads.set(audioId, { type: 'audio', mode: 'normal', url: music.play_url, coverImage: videoInfo.cover_image, author: author.nickname, title: music.title, musicAuthor: music.author });
            global.tiktokDownloads.set(audioDocumentId, { type: 'audio', mode: 'document', url: music.play_url, coverImage: videoInfo.cover_image, author: author.nickname, title: music.title, musicAuthor: music.author });

            console.log(`[TIKTOK] Stored data for IDs: ${videoHDId}, ${videoHDDocumentId}, ${videoWMId}, ${videoWMDocumentId}, ${audioId}, ${audioDocumentId}`);
        }

    } catch (error) {
        console.error("TikTok download error:", error);
        reply(`❌ *Error downloading video!*\n\n${error.message}`);
    }
});

// ============================================
// BUTTON HANDLERS - Using prefix matching
// ============================================

// Handler for all TikTok button responses
cmd({
    pattern: "ttvidhd_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttvidhd_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    if (!body.startsWith('ttvidhd_')) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) {
        console.log(`[TIKTOK HANDLER] No data found for: ${body}`);
        return;
    }

    await handleTikTokDownload(conn, mek, from, reply, downloadData);
    // DO NOT delete - allow multiple downloads
});

cmd({
    pattern: "ttvidhddoc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttvidhddoc_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    if (!body.startsWith('ttvidhddoc_')) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) return;

    await handleTikTokDownload(conn, mek, from, reply, downloadData);
});

cmd({
    pattern: "ttvidwm_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttvidwm_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    if (!body.startsWith('ttvidwm_')) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) return;

    await handleTikTokDownload(conn, mek, from, reply, downloadData);
});

cmd({
    pattern: "ttvidwmdoc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttvidwmdoc_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    if (!body.startsWith('ttvidwmdoc_')) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) return;

    await handleTikTokDownload(conn, mek, from, reply, downloadData);
});

cmd({
    pattern: "ttaud_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttaud_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    if (!body.startsWith('ttaud_')) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) return;

    await handleTikTokDownload(conn, mek, from, reply, downloadData);
});

cmd({
    pattern: "ttauddoc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttauddoc_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    if (!body.startsWith('ttauddoc_')) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) return;

    await handleTikTokDownload(conn, mek, from, reply, downloadData);
});
