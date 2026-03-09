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
            // TEXT MODE
            const infoMsg = infoText + `\n\n📥 *Reply with your choice:*\n` +
                `🎬 *1.1* - No Watermark Video HD\n` +
                `🎬 *1.2* - No Watermark Video HD (Document)\n` +
                `🎬 *1.3* - With Watermark Video\n` +
                `🎬 *1.4* - With Watermark Video (Document)\n` +
                `🎵 *2.1* - Audio\n` +
                `🎵 *2.2* - Audio (Document)\n\n` +
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

            // Reply handler for text mode
            const replyHandler = async (messageUpdate) => {
                try {
                    const mekInfo = messageUpdate?.messages[0];
                    if (!mekInfo?.message) return;

                    const msgText = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
                    const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                    if (!isReplyToSentMsg || !msgText) return;

                    let userReply = msgText.trim();
                    let downloadData = null;

                    switch(userReply) {
                        case "1.1":
                            downloadData = { type: 'video', quality: 'HD', mode: 'normal', url: downloadLinks.no_watermark.hd, coverImage: videoInfo.cover_image, author: author.nickname, caption: videoInfo.caption, username: author.username };
                            break;
                        case "1.2":
                            downloadData = { type: 'video', quality: 'HD', mode: 'document', url: downloadLinks.no_watermark.hd, coverImage: videoInfo.cover_image, author: author.nickname, caption: videoInfo.caption, username: author.username };
                            break;
                        case "1.3":
                            downloadData = { type: 'video', quality: 'WM', mode: 'normal', url: downloadLinks.with_watermark.url, coverImage: videoInfo.cover_image, author: author.nickname, caption: videoInfo.caption, username: author.username };
                            break;
                        case "1.4":
                            downloadData = { type: 'video', quality: 'WM', mode: 'document', url: downloadLinks.with_watermark.url, coverImage: videoInfo.cover_image, author: author.nickname, caption: videoInfo.caption, username: author.username };
                            break;
                        case "2.1":
                            downloadData = { type: 'audio', mode: 'normal', url: music.play_url, coverImage: videoInfo.cover_image, author: author.nickname, title: music.title, musicAuthor: music.author };
                            break;
                        case "2.2":
                            downloadData = { type: 'audio', mode: 'document', url: music.play_url, coverImage: videoInfo.cover_image, author: author.nickname, title: music.title, musicAuthor: music.author };
                            break;
                        default:
                            return;
                    }

                    conn.ev.off('messages.upsert', replyHandler);
                    global.tiktokReplyHandlers.delete(messageID);
                    await handleTikTokDownload(conn, mekInfo, from, 
                        (text) => conn.sendMessage(from, { text }, { quoted: mekInfo }), 
                        downloadData);

                } catch (error) {
                    console.error('[TIKTOK REPLY ERROR]', error);
                }
            };

            global.tiktokReplyHandlers.set(messageID, replyHandler);
            conn.ev.on('messages.upsert', replyHandler);

            setTimeout(() => {
                if (global.tiktokReplyHandlers.has(messageID)) {
                    conn.ev.off('messages.upsert', replyHandler);
                    global.tiktokReplyHandlers.delete(messageID);
                    global.tiktokDownloads.delete(messageID);
                }
            }, 180000);

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

// Button Response Handlers - Each with specific pattern
cmd({
    pattern: "ttvidhd_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttvidhd_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) {
        console.log(`[TIKTOK HANDLER] No data found for: ${body}`);
        return;
    }

    console.log(`[TIKTOK HANDLER] Found data, processing...`);
    await handleTikTokDownload(conn, mek, from, reply, downloadData);
    global.tiktokDownloads.delete(body);
});

cmd({
    pattern: "ttvidhddoc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttvidhddoc_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) return;

    await handleTikTokDownload(conn, mek, from, reply, downloadData);
    global.tiktokDownloads.delete(body);
});

cmd({
    pattern: "ttvidwm_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttvidwm_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) return;

    await handleTikTokDownload(conn, mek, from, reply, downloadData);
    global.tiktokDownloads.delete(body);
});

cmd({
    pattern: "ttvidwmdoc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttvidwmdoc_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) return;

    await handleTikTokDownload(conn, mek, from, reply, downloadData);
    global.tiktokDownloads.delete(body);
});

cmd({
    pattern: "ttaud_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttaud_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) return;

    await handleTikTokDownload(conn, mek, from, reply, downloadData);
    global.tiktokDownloads.delete(body);
});

cmd({
    pattern: "ttauddoc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[TIKTOK HANDLER ttauddoc_] Called with body: ${body}`);
    if (!body || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) return;

    await handleTikTokDownload(conn, mek, from, reply, downloadData);
    global.tiktokDownloads.delete(body);
});
