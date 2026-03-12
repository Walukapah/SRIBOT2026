const { cmd } = require('../command');
const { Button } = require('../lib/button');
const config = require('../config');
const { getBuffer, fetchJson } = require('../lib/functions');

// Store YouTube downloads globally
if (!global.youtubeDownloads) global.youtubeDownloads = new Map();
if (!global.youtubeReplyHandlers) global.youtubeReplyHandlers = new Map();

// Helper function to process download URL with retries
async function processDownloadUrl(processUrl, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[YOUTUBE] Processing attempt ${i + 1}/${retries}: ${processUrl}`);
            
            const response = await fetchJson(processUrl);
            
            if (response && response.status === 'completed' && response.fileUrl) {
                console.log(`[YOUTUBE] Process success: ${response.fileUrl.substring(0, 50)}...`);
                return response;
            }
            
            // If processing, wait and retry
            if (response && response.status === 'processing') {
                console.log(`[YOUTUBE] Still processing, waiting 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
            
            console.log(`[YOUTUBE] Process response:`, response);
            
        } catch (error) {
            console.error(`[YOUTUBE] Process attempt ${i + 1} failed:`, error.message);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    return null;
}

// Helper function to handle YouTube downloads
async function handleYouTubeDownload(conn, mek, from, reply, downloadData) {
    try {
        await reply(`⏳ *Processing ${downloadData.type} download...*\n\n⏱️ Quality: ${downloadData.quality}\n⏱️ This may take 5-10 seconds...`);
        
        // Process the download URL with retries
        const processResponse = await processDownloadUrl(downloadData.processUrl, 5);
        
        if (!processResponse || !processResponse.fileUrl) {
            return reply(`❌ *Failed to process download!*\n\nThe server is busy or the file is too large. Please try again in a few moments.`);
        }

        const fileUrl = processResponse.fileUrl;
        const fileSize = processResponse.fileSize || downloadData.fileSize || 'Unknown';
        
        console.log(`[YOUTUBE] Downloading from: ${fileUrl.substring(0, 60)}...`);
        
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
                        fileSize: downloadData.videoFileSize,
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
                        fileSize: downloadData.videoFileSize,
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
                        fileSize: downloadData.audioFileSize,
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
                        fileSize: downloadData.audioFileSize,
                        videoId: downloadData.videoId,
                        title: downloadData.title,
                        channel: downloadData.channel
                    };
                    break;
                default:
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
            return reply(`❌ *Please provide a valid YouTube URL!*\n\n*Usage:* ${prefix}youtube <video-url>`);
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
            return reply(`❌ *API Error!*\n\nFailed to fetch video information.`);
        }

        // Parse response
        let resultData;
        
        if (response && response.status === true && response.result) {
            if (response.result.result) {
                resultData = response.result.result;
            } else {
                resultData = response.result;
            }
        } else {
            console.error('[YOUTUBE] Invalid response:', response);
            return reply(`❌ *Failed to fetch video!*`);
        }

        const api = resultData.api || resultData;
        const mediaItems = resultData.mediaItems || api.mediaItems || [];

        if (!mediaItems || mediaItems.length === 0) {
            return reply(`❌ *No media formats found!*`);
        }

        // Separate formats
        const videoFormats = mediaItems.filter(item => item && item.type === 'Video');
        const audioFormats = mediaItems.filter(item => item && item.type === 'Audio');

        console.log(`[YOUTUBE] Videos: ${videoFormats.length}, Audios: ${audioFormats.length}`);

        // Quality priority (prefer smaller sizes)
        const videoQualityPriority = ['144p', '240p', '360p', '480p', '720p', 'HD', 'FHD', '1080p'];
        
        let selectedVideo = null;
        let selectedVideoQuality = '';
        
        for (const quality of videoQualityPriority) {
            const found = videoFormats.find(v => 
                v.mediaQuality?.toLowerCase() === quality.toLowerCase()
            );
            if (found) {
                selectedVideo = found;
                selectedVideoQuality = quality;
                console.log(`[YOUTUBE] Selected video: ${quality} - ${found.mediaFileSize}`);
                break;
            }
        }
        
        // Fallback to smallest video
        if (!selectedVideo && videoFormats.length > 0) {
            const sorted = [...videoFormats].sort((a, b) => {
                const sizeA = parseFloat(a.mediaFileSize?.replace(/[^0-9.]/g, '') || 999);
                const sizeB = parseFloat(b.mediaFileSize?.replace(/[^0-9.]/g, '') || 999);
                return sizeA - sizeB;
            });
            selectedVideo = sorted[0];
            selectedVideoQuality = selectedVideo.mediaQuality || 'Unknown';
        }

        // Audio selection
        let selectedAudio = audioFormats.find(a => 
            a.mediaQuality?.toLowerCase() === '48k'
        );
        let selectedAudioQuality = '48k';
        
        if (!selectedAudio) {
            selectedAudio = audioFormats.find(a => 
                a.mediaQuality?.toLowerCase() === '128k'
            );
            selectedAudioQuality = '128k';
        }
        
        if (!selectedAudio && audioFormats.length > 0) {
            selectedAudio = audioFormats[0];
            selectedAudioQuality = selectedAudio.mediaQuality || 'Unknown';
        }

        if (!selectedVideo && !selectedAudio) {
            return reply(`❌ *No downloadable formats found!*`);
        }

        // Build info
        const title = api.title || 'Unknown Title';
        const channelName = api.userInfo?.name || 'Unknown Channel';
        const videoId = api.id || 'unknown';
        const thumbnail = api.imagePreviewUrl || `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`;
        const duration = selectedVideo?.mediaDuration || selectedAudio?.mediaDuration || 'Unknown';
        const views = api.mediaStats?.viewsCount || 'Unknown';

        const infoText = `🎬 *YouTube Video Info*\n\n` +
            `📌 *Title:* ${title}\n` +
            `👤 *Channel:* ${channelName}\n` +
            `⏱️ *Duration:* ${duration}\n` +
            `👁️ *Views:* ${views}\n\n` +
            `📝 *Description:*\n${api.description ? api.description.substring(0, 150) + '...' : 'No description'}`;

        // Store data with file sizes
        const downloadData = {
            videoUrl: selectedVideo?.mediaUrl || null,
            videoQuality: selectedVideoQuality,
            videoFileSize: selectedVideo?.mediaFileSize || 'Unknown',
            audioUrl: selectedAudio?.mediaUrl || null,
            audioQuality: selectedAudioQuality,
            audioFileSize: selectedAudio?.mediaFileSize || 'Unknown',
            videoId: videoId,
            title: title,
            channel: channelName,
            thumbnail: thumbnail
        };

        console.log(`[YOUTUBE] Ready:`, {
            video: selectedVideoQuality,
            audio: selectedAudioQuality
        });

        if (messageType === 'text') {
            let optionsText = `\n\n📥 *Reply with your choice:*\n`;
            
            if (selectedVideo) {
                optionsText += `\n🎬 *Video (${selectedVideoQuality} | ${selectedVideo.mediaFileSize}):*\n`;
                optionsText += `🎬 *1.1* - Video ${selectedVideoQuality}\n`;
                optionsText += `📄 *1.2* - Video ${selectedVideoQuality} (Doc)\n`;
            }
            
            if (selectedAudio) {
                optionsText += `\n🎵 *Audio (${selectedAudioQuality} | ${selectedAudio.mediaFileSize}):*\n`;
                optionsText += `🎵 *2.1* - Audio ${selectedAudioQuality}\n`;
                optionsText += `📄 *2.2* - Audio ${selectedAudioQuality} (Doc)\n`;
            }
            
            optionsText += `\n⏳ *Active for 3 minutes*\n`;
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
            global.youtubeDownloads.set(messageID, downloadData);

            const replyHandler = createReplyHandler(conn, messageID, from, mek);
            global.youtubeReplyHandlers.set(messageID, replyHandler);
            conn.ev.on('messages.upsert', replyHandler);

            // Timeout
            setTimeout(() => {
                if (global.youtubeReplyHandlers.has(messageID)) {
                    const handler = global.youtubeReplyHandlers.get(messageID);
                    conn.ev.off('messages.upsert', handler);
                    global.youtubeReplyHandlers.delete(messageID);
                    global.youtubeDownloads.delete(messageID);
                }
            }, 180000);

        } else {
            // BUTTON MODE
            const btn = new Button();
            await btn.setImage(thumbnail);
            btn.setTitle("🎬 YouTube Downloader");
            btn.setBody(infoText);
            btn.setFooter(`Powered by ${botName} 🇱🇰`);

            btn.addSelection("📥 Select Download Option");
            btn.makeSection("⬇️ Download Options", "Available formats");

            const baseId = Date.now().toString();

            if (selectedVideo) {
                const vidNormal = `ytvid_${baseId}`;
                const vidDoc = `ytviddoc_${baseId}`;
                
                btn.makeRow("🎬", `Video ${selectedVideoQuality}`, `${selectedVideo.mediaFileSize}`, vidNormal);
                btn.makeRow("📄", `Video ${selectedVideoQuality} (Doc)`, "Document format", vidDoc);
                
                global.youtubeDownloads.set(vidNormal, {
                    type: 'video',
                    quality: selectedVideoQuality,
                    mode: 'normal',
                    processUrl: selectedVideo.mediaUrl,
                    fileSize: selectedVideo.mediaFileSize,
                    videoId: videoId,
                    title: title,
                    channel: channelName
                });
                
                global.youtubeDownloads.set(vidDoc, {
                    type: 'video',
                    quality: selectedVideoQuality,
                    mode: 'document',
                    processUrl: selectedVideo.mediaUrl,
                    fileSize: selectedVideo.mediaFileSize,
                    videoId: videoId,
                    title: title,
                    channel: channelName
                });
            }

            if (selectedAudio) {
                const audNormal = `ytaud_${baseId}`;
                const audDoc = `ytauddoc_${baseId}`;
                
                btn.makeRow("🎵", `Audio ${selectedAudioQuality}`, `${selectedAudio.mediaFileSize}`, audNormal);
                btn.makeRow("📄", `Audio ${selectedAudioQuality} (Doc)`, "Document format", audDoc);
                
                global.youtubeDownloads.set(audNormal, {
                    type: 'audio',
                    quality: selectedAudioQuality,
                    mode: 'normal',
                    processUrl: selectedAudio.mediaUrl,
                    fileSize: selectedAudio.mediaFileSize,
                    videoId: videoId,
                    title: title,
                    channel: channelName
                });
                
                global.youtubeDownloads.set(audDoc, {
                    type: 'audio',
                    quality: selectedAudioQuality,
                    mode: 'document',
                    processUrl: selectedAudio.mediaUrl,
                    fileSize: selectedAudio.mediaFileSize,
                    videoId: videoId,
                    title: title,
                    channel: channelName
                });
            }

            btn.addUrl("🔗 View on YouTube", youtubeUrl);
            await btn.send(from, conn, mek);
        }

    } catch (error) {
        console.error("[YOUTUBE] Error:", error);
        reply(`❌ *Error!*\n\n${error.message}`);
    }
});

// Button handlers
cmd({
    pattern: "ytvid_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !global.youtubeDownloads || !body.startsWith('ytvid_')) return;
    
    const data = global.youtubeDownloads.get(body);
    if (!data) return;
    
    await handleYouTubeDownload(conn, mek, from, reply, data);
});

cmd({
    pattern: "ytaud_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !global.youtubeDownloads || !body.startsWith('ytaud_')) return;
    
    const data = global.youtubeDownloads.get(body);
    if (!data) return;
    
    await handleYouTubeDownload(conn, mek, from, reply, data);
});
