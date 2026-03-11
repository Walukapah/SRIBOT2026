const { cmd } = require('../command');
const { Button } = require('../lib/button');
const config = require('../config');
const { getBuffer, fetchJson } = require('../lib/functions');

// Store YouTube downloads globally
if (!global.youtubeDownloads) global.youtubeDownloads = new Map();
if (!global.youtubeReplyHandlers) global.youtubeReplyHandlers = new Map();

// Helper function to handle YouTube downloads
async function handleYouTubeDownload(conn, mek, from, reply, downloadData) {
    try {
        // First, fetch the actual download URL from the processing URL
        await reply(`⏳ *Processing ${downloadData.type} download...*\n\n⏱️ This may take a few seconds...`);
        
        const processResponse = await fetchJson(downloadData.processUrl);
        
        if (!processResponse || processResponse.status !== 'completed' || !processResponse.fileUrl) {
            return reply(`❌ *Failed to process download!*\n\nThe file might be too large or the server is busy.`);
        }

        const fileUrl = processResponse.fileUrl;
        const fileSize = processResponse.fileSize || 'Unknown';
        
        if (downloadData.type === 'video') {
            if (downloadData.mode === 'document') {
                await conn.sendMessage(from, {
                    document: { url: fileUrl },
                    mimetype: 'video/mp4',
                    fileName: `YouTube_${downloadData.videoId}_${downloadData.quality}_${Date.now()}.mp4`,
                    caption: `🎬 *YouTube Video (${downloadData.quality} - Document)*\n\n📌 *Title:* ${downloadData.title}\n👤 *Channel:* ${downloadData.channel}\n📊 *Size:* ${fileSize}\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    video: { url: fileUrl },
                    caption: `🎬 *YouTube Video (${downloadData.quality})*\n\n📌 *Title:* ${downloadData.title}\n👤 *Channel:* ${downloadData.channel}\n📊 *Size:* ${fileSize}\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            }
        } else if (downloadData.type === 'audio') {
            if (downloadData.mode === 'document') {
                await conn.sendMessage(from, {
                    document: { url: fileUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `YouTube_${downloadData.videoId}_Audio_${Date.now()}.mp3`,
                    caption: `🎵 *YouTube Audio (Document)*\n\n📌 *Title:* ${downloadData.title}\n👤 *Channel:* ${downloadData.channel}\n📊 *Size:* ${fileSize}\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    audio: { url: fileUrl },
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: mek });
            }
        }
        return true;
    } catch (error) {
        console.error('[YOUTUBE DOWNLOAD ERROR]', error);
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
            const downloadData = global.youtubeDownloads.get(messageID);
            
            if (!downloadData) {
                console.log(`[YOUTUBE] No download data found for message: ${messageID}`);
                return;
            }

            let selectedDownload = null;

            switch(userReply) {
                case "1.1":
                    selectedDownload = { 
                        type: 'video', 
                        quality: '360p', 
                        mode: 'normal', 
                        processUrl: downloadData.video360pUrl,
                        videoId: downloadData.videoId,
                        title: downloadData.title,
                        channel: downloadData.channel
                    };
                    break;
                case "1.2":
                    selectedDownload = { 
                        type: 'video', 
                        quality: '360p', 
                        mode: 'document', 
                        processUrl: downloadData.video360pUrl,
                        videoId: downloadData.videoId,
                        title: downloadData.title,
                        channel: downloadData.channel
                    };
                    break;
                case "2.1":
                    selectedDownload = { 
                        type: 'audio', 
                        quality: '48k', 
                        mode: 'normal', 
                        processUrl: downloadData.audio48kUrl,
                        videoId: downloadData.videoId,
                        title: downloadData.title,
                        channel: downloadData.channel
                    };
                    break;
                case "2.2":
                    selectedDownload = { 
                        type: 'audio', 
                        quality: '48k', 
                        mode: 'document', 
                        processUrl: downloadData.audio48kUrl,
                        videoId: downloadData.videoId,
                        title: downloadData.title,
                        channel: downloadData.channel
                    };
                    break;
                default:
                    // Invalid reply - ignore
                    return;
            }

            if (selectedDownload) {
                console.log(`[YOUTUBE] Processing reply: ${userReply} for message: ${messageID}`);
                await handleYouTubeDownload(
                    conn, 
                    mekInfo, 
                    from, 
                    (text) => conn.sendMessage(from, { text }, { quoted: mekInfo }), 
                    selectedDownload
                );
                // DO NOT remove handler - allow multiple replies
            }

        } catch (error) {
            console.error('[YOUTUBE REPLY ERROR]', error);
        }
    };
}

// Main YouTube Command
cmd({
    pattern: "youtube",
    alias: ["yt", "ytdl", "youtubedl", "ytmp4", "ytmp3"],
    desc: "Download YouTube videos and audio",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, reply, args, q, pushname }) => {
    try {
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        const messageType = config.MESSAGE_TYPE || 'button';

        if (!q || (!q.includes('youtube.com') && !q.includes('youtu.be'))) {
            return reply(`❌ *Please provide a valid YouTube URL!*\n\n*Usage:* ${prefix}youtube <video-url>\n\n*Examples:*\n• ${prefix}yt https://youtu.be/xxxxx\n• ${prefix}youtube https://www.youtube.com/watch?v=xxxxx`);
        }

        const youtubeUrl = q.trim();
        await reply(`⏳ *Fetching YouTube video info...*\n\n🔄 Please wait...`);

        const apiUrl = `https://sri-api.vercel.app/download/youtubedl?url=${encodeURIComponent(youtubeUrl)}`;
        
        console.log(`[YOUTUBE] Fetching: ${apiUrl}`);
        
        let response;
        try {
            response = await fetchJson(apiUrl);
        } catch (apiError) {
            console.error('[YOUTUBE] API Error:', apiError);
            return reply(`❌ *API Error!*\n\nFailed to fetch video information. Please try again later.`);
        }

        console.log(`[YOUTUBE] API Response:`, JSON.stringify(response, null, 2));

        // Check response structure - handle both possible formats
        let data, api, mediaItems;
        
        if (response && response.status === true && response.result) {
            // Format 1: { status: true, result: { ... } }
            if (response.result.result) {
                data = response.result.result;
            } else {
                data = response.result;
            }
        } else if (response && response.status === "completed") {
            // Direct response format
            data = response;
        } else {
            console.error('[YOUTUBE] Invalid response:', response);
            return reply(`❌ *Failed to fetch video!*\n\nInvalid API response. The video might be private, deleted, or unavailable.`);
        }

        // Extract data safely
        api = data.api || data;
        mediaItems = data.mediaItems || (api.mediaItems || []);

        if (!api || !mediaItems || !Array.isArray(mediaItems)) {
            console.error('[YOUTUBE] Missing data:', { api: !!api, mediaItems: !!mediaItems });
            return reply(`❌ *Failed to parse video data!*\n\nThe API response format has changed or the video is unavailable.`);
        }

        // Find 360p video (lowest quality for video)
        const video360p = mediaItems.find(item => 
            item && item.type === 'Video' && item.mediaQuality === '360p'
        );
        
        // Find 48k audio (lowest quality for audio - smallest size)
        const audio48k = mediaItems.find(item => 
            item && item.type === 'Audio' && item.mediaQuality === '48K'
        );

        console.log(`[YOUTUBE] Found formats:`, {
            video360p: !!video360p,
            audio48k: !!audio48k,
            totalItems: mediaItems.length
        });

        if (!video360p && !audio48k) {
            return reply(`❌ *No downloadable formats found!*\n\nThe video might be restricted, age-restricted, or unavailable.`);
        }

        // Safely extract info with fallbacks
        const title = api.title || 'Unknown Title';
        const channelName = api.userInfo?.name || api.channel || 'Unknown Channel';
        const videoId = api.id || 'unknown';
        const thumbnail = api.imagePreviewUrl || api.thumbnail || 'https://i.ytimg.com/vi/default.jpg';
        const duration = video360p?.mediaDuration || audio48k?.mediaDuration || 'Unknown';
        const views = api.mediaStats?.viewsCount || api.views || 'Unknown';
        const dateJoined = api.userInfo?.dateJoined || 'Unknown';
        const description = api.description ? api.description.substring(0, 200) + '...' : 'No description';

        const infoText = `🎬 *YouTube Video Info*\n\n` +
            `📌 *Title:* ${title}\n` +
            `👤 *Channel:* ${channelName}\n` +
            `⏱️ *Duration:* ${duration}\n` +
            `👁️ *Views:* ${views}\n` +
            `📅 *Posted:* ${dateJoined}\n\n` +
            `📝 *Description:*\n${description}`;

        // Store download URLs safely
        const downloadData = {
            video360pUrl: video360p?.mediaUrl || null,
            audio48kUrl: audio48k?.mediaUrl || null,
            videoId: videoId,
            title: title,
            channel: channelName,
            thumbnail: thumbnail
        };

        if (messageType === 'text') {
            // TEXT MODE - Multi Reply Support
            let optionsText = `\n\n📥 *Reply with your choice:*\n`;
            
            if (video360p) {
                optionsText += `\n🎬 *Video Options:*\n`;
                optionsText += `🎬 *1.1* - Video 360p (Normal)\n`;
                optionsText += `📄 *1.2* - Video 360p (Document)\n`;
            }
            
            if (audio48k) {
                optionsText += `\n🎵 *Audio Options:*\n`;
                optionsText += `🎵 *2.1* - Audio 48k (Normal)\n`;
                optionsText += `📄 *2.2* - Audio 48k (Document)\n`;
            }
            
            optionsText += `\n⏳ *Active for 3 minutes - You can reply multiple times!*\n`;
            optionsText += `${config.FOOTER || "POWERED BY SRI-BOT 🇱🇰"}`;

            const sentMsg = await conn.sendMessage(from, { 
                image: { url: thumbnail }, 
                caption: infoText + optionsText,
                contextInfo: {
                    externalAdReply: {
                        title: "YouTube Downloader",
                        body: title,
                        thumbnailUrl: thumbnail,
                        sourceUrl: youtubeUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: mek });

            const messageID = sentMsg.key.id;
            
            // Store all download data
            global.youtubeDownloads.set(messageID, downloadData);

            // Create and register reply handler
            const replyHandler = createReplyHandler(conn, messageID, from, mek);
            global.youtubeReplyHandlers.set(messageID, replyHandler);
            conn.ev.on('messages.upsert', replyHandler);

            console.log(`[YOUTUBE] Text mode handler registered for message: ${messageID}`);

            // Set timeout to remove handler after 3 minutes
            setTimeout(() => {
                if (global.youtubeReplyHandlers.has(messageID)) {
                    const handler = global.youtubeReplyHandlers.get(messageID);
                    conn.ev.off('messages.upsert', handler);
                    global.youtubeReplyHandlers.delete(messageID);
                    global.youtubeDownloads.delete(messageID);
                    console.log(`[YOUTUBE] Handler expired for message: ${messageID}`);
                }
            }, 180000); // 3 minutes

        } else {
            // BUTTON MODE
            const btn = new Button();
            await btn.setImage(thumbnail);
            btn.setTitle("🎬 YouTube Downloader");
            btn.setBody(infoText);
            btn.setFooter(`Powered by ${botName} 🇱🇰`);

            btn.addSelection("📥 Select Download Option");
            btn.makeSection("⬇️ Download Options", "Choose format and quality");

            const baseId = Date.now().toString();

            // Video buttons
            if (video360p) {
                const videoNormalId = `ytvid360_${baseId}`;
                const videoDocId = `ytvid360doc_${baseId}`;
                
                btn.makeRow("🎬", "Video 360p", "Low quality video (Small size)", videoNormalId);
                btn.makeRow("📄", "Video 360p (Doc)", "Video as document file", videoDocId);
                
                global.youtubeDownloads.set(videoNormalId, {
                    type: 'video',
                    quality: '360p',
                    mode: 'normal',
                    processUrl: video360p.mediaUrl,
                    videoId: videoId,
                    title: title,
                    channel: channelName
                });
                
                global.youtubeDownloads.set(videoDocId, {
                    type: 'video',
                    quality: '360p',
                    mode: 'document',
                    processUrl: video360p.mediaUrl,
                    videoId: videoId,
                    title: title,
                    channel: channelName
                });
            }

            // Audio buttons
            if (audio48k) {
                const audioNormalId = `ytaud48_${baseId}`;
                const audioDocId = `ytaud48doc_${baseId}`;
                
                btn.makeRow("🎵", "Audio 48k", "Low quality audio (Small size)", audioNormalId);
                btn.makeRow("📄", "Audio 48k (Doc)", "Audio as document file", audioDocId);
                
                global.youtubeDownloads.set(audioNormalId, {
                    type: 'audio',
                    quality: '48k',
                    mode: 'normal',
                    processUrl: audio48k.mediaUrl,
                    videoId: videoId,
                    title: title,
                    channel: channelName
                });
                
                global.youtubeDownloads.set(audioDocId, {
                    type: 'audio',
                    quality: '48k',
                    mode: 'document',
                    processUrl: audio48k.mediaUrl,
                    videoId: videoId,
                    title: title,
                    channel: channelName
                });
            }

            btn.addUrl("🔗 View on YouTube", youtubeUrl);

            const sentMsg = await btn.send(from, conn, mek);

            console.log(`[YOUTUBE] Button message sent. Base ID: ${baseId}`);
        }

    } catch (error) {
        console.error("[YOUTUBE] Fatal error:", error);
        reply(`❌ *Error downloading video!*\n\n${error.message}`);
    }
});

// ============================================
// BUTTON HANDLERS - Using prefix matching
// ============================================

// Handler for 360p video normal
cmd({
    pattern: "ytvid360_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[YOUTUBE HANDLER ytvid360_] Called with body: ${body}`);
    if (!body || !global.youtubeDownloads) return;

    if (!body.startsWith('ytvid360_')) return;

    const downloadData = global.youtubeDownloads.get(body);
    if (!downloadData) {
        console.log(`[YOUTUBE HANDLER] No data found for: ${body}`);
        return;
    }

    await handleYouTubeDownload(conn, mek, from, reply, downloadData);
});

// Handler for 360p video document
cmd({
    pattern: "ytvid360doc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[YOUTUBE HANDLER ytvid360doc_] Called with body: ${body}`);
    if (!body || !global.youtubeDownloads) return;

    if (!body.startsWith('ytvid360doc_')) return;

    const downloadData = global.youtubeDownloads.get(body);
    if (!downloadData) return;

    await handleYouTubeDownload(conn, mek, from, reply, downloadData);
});

// Handler for 48k audio normal
cmd({
    pattern: "ytaud48_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[YOUTUBE HANDLER ytaud48_] Called with body: ${body}`);
    if (!body || !global.youtubeDownloads) return;

    if (!body.startsWith('ytaud48_')) return;

    const downloadData = global.youtubeDownloads.get(body);
    if (!downloadData) return;

    await handleYouTubeDownload(conn, mek, from, reply, downloadData);
});

// Handler for 48k audio document
cmd({
    pattern: "ytaud48doc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[YOUTUBE HANDLER ytaud48doc_] Called with body: ${body}`);
    if (!body || !global.youtubeDownloads) return;

    if (!body.startsWith('ytaud48doc_')) return;

    const downloadData = global.youtubeDownloads.get(body);
    if (!downloadData) return;

    await handleYouTubeDownload(conn, mek, from, reply, downloadData);
});
