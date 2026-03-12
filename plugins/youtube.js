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
                        quality: downloadData.videoQuality, 
                        mode: 'normal', 
                        processUrl: downloadData.videoUrl,
                        videoId: downloadData.videoId,
                        title: downloadData.title,
                        channel: downloadData.channel
                    };
                    break;
                case "1.2":
                    selectedDownload = { 
                        type: 'video', 
                        quality: downloadData.videoQuality, 
                        mode: 'document', 
                        processUrl: downloadData.videoUrl,
                        videoId: downloadData.videoId,
                        title: downloadData.title,
                        channel: downloadData.channel
                    };
                    break;
                case "2.1":
                    selectedDownload = { 
                        type: 'audio', 
                        quality: downloadData.audioQuality, 
                        mode: 'normal', 
                        processUrl: downloadData.audioUrl,
                        videoId: downloadData.videoId,
                        title: downloadData.title,
                        channel: downloadData.channel
                    };
                    break;
                case "2.2":
                    selectedDownload = { 
                        type: 'audio', 
                        quality: downloadData.audioQuality, 
                        mode: 'document', 
                        processUrl: downloadData.audioUrl,
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

        // Parse response - handle nested structure
        let resultData;
        
        if (response && response.status === true && response.result) {
            if (response.result.result) {
                resultData = response.result.result;
            } else {
                resultData = response.result;
            }
        } else {
            console.error('[YOUTUBE] Invalid response structure:', response);
            return reply(`❌ *Failed to fetch video!*\n\nInvalid API response.`);
        }

        // Extract api info and media items
        const api = resultData.api || resultData;
        const mediaItems = resultData.mediaItems || api.mediaItems || [];

        console.log(`[YOUTUBE] Media items count: ${mediaItems.length}`);

        if (!mediaItems || mediaItems.length === 0) {
            return reply(`❌ *No media formats found!*\n\nThe video might be restricted or unavailable.`);
        }

        // Separate video and audio formats
        const videoFormats = mediaItems.filter(item => item && item.type === 'Video');
        const audioFormats = mediaItems.filter(item => item && item.type === 'Audio');

        console.log(`[YOUTUBE] Video formats: ${videoFormats.length}, Audio formats: ${audioFormats.length}`);

        // Quality priority order for videos (prefer lower qualities for faster download)
        const videoQualityPriority = ['144p', '240p', '360p', '480p', '720p', 'HD', 'FHD', '1080p'];
        
        // Find best video format (prefer 360p or lower if available)
        let selectedVideo = null;
        let selectedVideoQuality = '';
        
        // First try to find 360p or lower
        for (const quality of videoQualityPriority) {
            const found = videoFormats.find(v => v.mediaQuality === quality || v.mediaQuality?.toLowerCase() === quality.toLowerCase());
            if (found) {
                selectedVideo = found;
                selectedVideoQuality = quality;
                console.log(`[YOUTUBE] Selected video quality: ${quality}`);
                break;
            }
        }
        
        // If no quality matched, take the first video (lowest quality usually)
        if (!selectedVideo && videoFormats.length > 0) {
            // Sort by file size to get smallest
            const sortedVideos = [...videoFormats].sort((a, b) => {
                const sizeA = parseFloat(a.mediaFileSize?.replace(' MB', '') || 0);
                const sizeB = parseFloat(b.mediaFileSize?.replace(' MB', '') || 0);
                return sizeA - sizeB;
            });
            selectedVideo = sortedVideos[0];
            selectedVideoQuality = selectedVideo.mediaQuality || 'Unknown';
            console.log(`[YOUTUBE] Selected lowest size video: ${selectedVideoQuality} (${selectedVideo.mediaFileSize})`);
        }

        // Quality priority for audio (prefer 48k, fallback to 128k)
        let selectedAudio = audioFormats.find(a => a.mediaQuality === '48K' || a.mediaQuality === '48k');
        let selectedAudioQuality = '48k';
        
        if (!selectedAudio) {
            selectedAudio = audioFormats.find(a => a.mediaQuality === '128K' || a.mediaQuality === '128k');
            selectedAudioQuality = '128k';
        }
        
        // Fallback to first audio if no quality matched
        if (!selectedAudio && audioFormats.length > 0) {
            selectedAudio = audioFormats[0];
            selectedAudioQuality = selectedAudio.mediaQuality || 'Unknown';
        }

        console.log(`[YOUTUBE] Selected:`, {
            video: selectedVideo ? { quality: selectedVideoQuality, size: selectedVideo.mediaFileSize } : null,
            audio: selectedAudio ? { quality: selectedAudioQuality, size: selectedAudio.mediaFileSize } : null
        });

        if (!selectedVideo && !selectedAudio) {
            return reply(`❌ *No downloadable formats found!*\n\nAvailable: ${mediaItems.map(m => `${m?.type}-${m?.mediaQuality}`).join(', ')}`);
        }

        // Extract info safely
        const title = api.title || 'Unknown Title';
        const channelName = api.userInfo?.name || api.userInfo?.username || api.channel || 'Unknown Channel';
        const videoId = api.id || 'unknown';
        const thumbnail = api.imagePreviewUrl || api.thumbnail || (videoId !== 'unknown' ? `https://i.ytimg.com/vi/${videoId}/sddefault.jpg` : 'https://i.ytimg.com/vi/default.jpg');
        const duration = selectedVideo?.mediaDuration || selectedAudio?.mediaDuration || api.duration || 'Unknown';
        const views = api.mediaStats?.viewsCount || api.views || 'Unknown';
        const dateJoined = api.userInfo?.dateJoined || 'Unknown';
        const description = api.description ? (api.description.length > 200 ? api.description.substring(0, 200) + '...' : api.description) : 'No description';

        const infoText = `🎬 *YouTube Video Info*\n\n` +
            `📌 *Title:* ${title}\n` +
            `👤 *Channel:* ${channelName}\n` +
            `⏱️ *Duration:* ${duration}\n` +
            `👁️ *Views:* ${views}\n` +
            `📅 *Posted:* ${dateJoined}\n\n` +
            `📝 *Description:*\n${description}`;

        // Store download URLs safely
        const downloadData = {
            videoUrl: selectedVideo?.mediaUrl || null,
            videoQuality: selectedVideoQuality,
            audioUrl: selectedAudio?.mediaUrl || null,
            audioQuality: selectedAudioQuality,
            videoId: videoId,
            title: title,
            channel: channelName,
            thumbnail: thumbnail
        };

        console.log(`[YOUTUBE] Stored URLs:`, {
            video: !!downloadData.videoUrl,
            audio: !!downloadData.audioUrl
        });

        if (messageType === 'text') {
            // TEXT MODE - Multi Reply Support
            let optionsText = `\n\n📥 *Reply with your choice:*\n`;
            
            if (selectedVideo) {
                optionsText += `\n🎬 *Video Options (${selectedVideoQuality} - ${selectedVideo.mediaFileSize || 'Unknown size'}):*\n`;
                optionsText += `🎬 *1.1* - Video ${selectedVideoQuality} (Normal)\n`;
                optionsText += `📄 *1.2* - Video ${selectedVideoQuality} (Document)\n`;
            }
            
            if (selectedAudio) {
                optionsText += `\n🎵 *Audio Options (${selectedAudioQuality} - ${selectedAudio.mediaFileSize || 'Unknown size'}):*\n`;
                optionsText += `🎵 *2.1* - Audio ${selectedAudioQuality} (Normal)\n`;
                optionsText += `📄 *2.2* - Audio ${selectedAudioQuality} (Document)\n`;
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
            if (selectedVideo) {
                const videoNormalId = `ytvid_${baseId}`;
                const videoDocId = `ytviddoc_${baseId}`;
                
                btn.makeRow("🎬", `Video ${selectedVideoQuality}`, `Size: ${selectedVideo.mediaFileSize || 'Unknown'}`, videoNormalId);
                btn.makeRow("📄", `Video ${selectedVideoQuality} (Doc)`, "As document file", videoDocId);
                
                global.youtubeDownloads.set(videoNormalId, {
                    type: 'video',
                    quality: selectedVideoQuality,
                    mode: 'normal',
                    processUrl: selectedVideo.mediaUrl,
                    videoId: videoId,
                    title: title,
                    channel: channelName
                });
                
                global.youtubeDownloads.set(videoDocId, {
                    type: 'video',
                    quality: selectedVideoQuality,
                    mode: 'document',
                    processUrl: selectedVideo.mediaUrl,
                    videoId: videoId,
                    title: title,
                    channel: channelName
                });
            }

            // Audio buttons
            if (selectedAudio) {
                const audioNormalId = `ytaud_${baseId}`;
                const audioDocId = `ytauddoc_${baseId}`;
                
                btn.makeRow("🎵", `Audio ${selectedAudioQuality}`, `Size: ${selectedAudio.mediaFileSize || 'Unknown'}`, audioNormalId);
                btn.makeRow("📄", `Audio ${selectedAudioQuality} (Doc)`, "As document file", audioDocId);
                
                global.youtubeDownloads.set(audioNormalId, {
                    type: 'audio',
                    quality: selectedAudioQuality,
                    mode: 'normal',
                    processUrl: selectedAudio.mediaUrl,
                    videoId: videoId,
                    title: title,
                    channel: channelName
                });
                
                global.youtubeDownloads.set(audioDocId, {
                    type: 'audio',
                    quality: selectedAudioQuality,
                    mode: 'document',
                    processUrl: selectedAudio.mediaUrl,
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

// Handler for video buttons
cmd({
    pattern: "ytvid_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[YOUTUBE HANDLER ytvid_] Called with body: ${body}`);
    if (!body || !global.youtubeDownloads) return;

    if (!body.startsWith('ytvid_')) return;

    const downloadData = global.youtubeDownloads.get(body);
    if (!downloadData) {
        console.log(`[YOUTUBE HANDLER] No data found for: ${body}`);
        return;
    }

    await handleYouTubeDownload(conn, mek, from, reply, downloadData);
});

// Handler for audio buttons
cmd({
    pattern: "ytaud_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    console.log(`[YOUTUBE HANDLER ytaud_] Called with body: ${body}`);
    if (!body || !global.youtubeDownloads) return;

    if (!body.startsWith('ytaud_')) return;

    const downloadData = global.youtubeDownloads.get(body);
    if (!downloadData) return;

    await handleYouTubeDownload(conn, mek, from, reply, downloadData);
});
