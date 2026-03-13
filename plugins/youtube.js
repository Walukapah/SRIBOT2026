const { cmd } = require('../command');
const { Button } = require('../lib/button');
const config = require('../config');
const { fetchJson } = require('../lib/functions');

// Store YouTube downloads globally
if (!global.youtubeDownloads) global.youtubeDownloads = new Map();
if (!global.youtubeReplyHandlers) global.youtubeReplyHandlers = new Map();

// Helper function to process download URL with status checking
async function processDownloadUrl(processUrl, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            console.log(`[YOUTUBE] Checking status attempt ${i + 1}/${maxAttempts}`);
            
            const response = await fetchJson(processUrl);
            console.log(`[YOUTUBE] Status: ${response?.status}, Progress: ${response?.progress}`);
            
            // If completed, return immediately
            if (response && response.status === 'completed' && response.fileUrl && response.fileUrl !== 'Waiting...') {
                console.log(`[YOUTUBE] Download ready: ${response.fileUrl.substring(0, 50)}...`);
                return response;
            }
            
            // If still processing or queued, wait and retry
            if (response && (response.status === 'processing' || response.status === 'queued')) {
                const percent = response.percent || response.progress || '0%';
                console.log(`[YOUTUBE] Still ${response.status}... ${percent}`);
                
                // Wait 3 seconds between checks
                await new Promise(resolve => setTimeout(resolve, 3000));
                continue;
            }
            
            // If error status
            if (response && response.status === 'error') {
                console.error(`[YOUTUBE] Processing error:`, response);
                return null;
            }
            
        } catch (error) {
            console.error(`[YOUTUBE] Status check attempt ${i + 1} failed:`, error.message);
            if (i < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    
    console.error(`[YOUTUBE] Max attempts reached, download not ready`);
    return null;
}

// Helper function to handle YouTube downloads
async function handleYouTubeDownload(conn, mek, from, reply, downloadData) {
    try {
        // Check file size limit (100MB)
        const fileSizeMB = parseFloat(downloadData.fileSize?.replace(/[^0-9.]/g, '') || 0);
        if (fileSizeMB > 100) {
            return reply(`❌ *File too large!*\n\nThis video is ${downloadData.fileSize} which exceeds the 100MB limit.\nPlease try a lower quality or a shorter video.`);
        }

        await reply(`⏳ *Processing ${downloadData.type} download...*\n\n📊 Quality: ${downloadData.quality}\n📊 Size: ${downloadData.fileSize}\n⏱️ This may take 10-30 seconds...`);
        
        // Process the download URL with status polling
        const processResponse = await processDownloadUrl(downloadData.processUrl, 30);
        
        if (!processResponse || !processResponse.fileUrl || processResponse.fileUrl === 'Waiting...') {
            return reply(`❌ *Failed to process download!*\n\nThe server is taking too long or the file is unavailable. Please try again later.`);
        }

        const fileUrl = processResponse.fileUrl;
        const finalSize = processResponse.fileSize || processResponse.estimatedFileSize || downloadData.fileSize || 'Unknown';
        
        console.log(`[YOUTUBE] Sending file: ${fileUrl.substring(0, 60)}...`);
        
        if (downloadData.type === 'video') {
            if (downloadData.mode === 'document') {
                await conn.sendMessage(from, {
                    document: { url: fileUrl },
                    mimetype: 'video/mp4',
                    fileName: `YouTube_${downloadData.videoId}_${downloadData.quality}_${Date.now()}.mp4`,
                    caption: `🎬 *YouTube Video (${downloadData.quality} - Document)*\n\n📌 *Title:* ${downloadData.title}\n👤 *Channel:* ${downloadData.channel}\n📊 *Size:* ${finalSize}\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, {
                    video: { url: fileUrl },
                    caption: `🎬 *YouTube Video (${downloadData.quality})*\n\n📌 *Title:* ${downloadData.title}\n👤 *Channel:* ${downloadData.channel}\n📊 *Size:* ${finalSize}\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            }
        } else if (downloadData.type === 'audio') {
            if (downloadData.mode === 'document') {
                await conn.sendMessage(from, {
                    document: { url: fileUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `YouTube_${downloadData.videoId}_MP3_${Date.now()}.mp3`,
                    caption: `🎵 *YouTube MP3 Audio (Document)*\n\n📌 *Title:* ${downloadData.title}\n👤 *Channel:* ${downloadData.channel}\n📊 *Size:* ${finalSize}\n📊 *Format:* MP3\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            } else {
                // Send as audio message with MP3 mimetype
                await conn.sendMessage(from, {
                    audio: { url: fileUrl },
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    fileName: `YouTube_${downloadData.videoId}_MP3_${Date.now()}.mp3`
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

        // Use the new API endpoint
        const apiUrl = `https://sri-api.vercel.app/download/youtubedl2?url=${encodeURIComponent(youtubeUrl)}`;
        
        console.log(`[YOUTUBE] Fetching: ${apiUrl}`);
        
        let response;
        try {
            response = await fetchJson(apiUrl);
        } catch (apiError) {
            console.error('[YOUTUBE] API Error:', apiError);
            return reply(`❌ *API Error!*\n\nFailed to fetch video information.`);
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

        // Find 360p video specifically
        let selectedVideo = videoFormats.find(v => 
            v.mediaQuality === '360p' || v.mediaRes?.includes('360')
        );
        
        let selectedVideoQuality = '360p';
        
        // If no 360p, find next best quality under 100MB
        if (!selectedVideo) {
            // Sort by file size and pick smallest
            const sortedVideos = [...videoFormats].sort((a, b) => {
                const sizeA = parseFloat(a.mediaFileSize?.replace(/[^0-9.]/g, '') || 999);
                const sizeB = parseFloat(b.mediaFileSize?.replace(/[^0-9.]/g, '') || 999);
                return sizeA - sizeB;
            });
            
            // Find first video under 100MB
            selectedVideo = sortedVideos.find(v => {
                const size = parseFloat(v.mediaFileSize?.replace(/[^0-9.]/g, '') || 0);
                return size <= 100;
            });
            
            // If none under 100MB, take smallest anyway (will show warning)
            if (!selectedVideo && sortedVideos.length > 0) {
                selectedVideo = sortedVideos[0];
            }
            
            selectedVideoQuality = selectedVideo?.mediaQuality || 'Unknown';
        }

        // Audio selection - prefer MP3 format (Media #009)
        // Look for MP3 extension specifically
        let selectedAudio = audioFormats.find(a => 
            a.mediaExtension?.toLowerCase() === 'mp3' || 
            a.name?.includes('MP3')
        );
        let selectedAudioQuality = 'MP3';
        
        // If no MP3, fallback to 128k M4A
        if (!selectedAudio) {
            selectedAudio = audioFormats.find(a => 
                a.mediaQuality?.toLowerCase() === '128k' && 
                a.mediaExtension?.toLowerCase() === 'm4a'
            );
            selectedAudioQuality = '128k';
        }
        
        // If still no audio, fallback to 48k
        if (!selectedAudio) {
            selectedAudio = audioFormats.find(a => 
                a.mediaQuality?.toLowerCase() === '48k'
            );
            selectedAudioQuality = '48k';
        }
        
        // Last resort - first audio
        if (!selectedAudio && audioFormats.length > 0) {
            selectedAudio = audioFormats[0];
            selectedAudioQuality = selectedAudio.mediaExtension === 'MP3' ? 'MP3' : (selectedAudio.mediaQuality || 'Unknown');
        }

        if (!selectedVideo && !selectedAudio) {
            return reply(`❌ *No downloadable formats found!*`);
        }

        // Check video size warning
        const videoSizeMB = parseFloat(selectedVideo?.mediaFileSize?.replace(/[^0-9.]/g, '') || 0);
        const sizeWarning = videoSizeMB > 100 ? `\n\n⚠️ *Warning:* Video is ${selectedVideo.mediaFileSize} (100MB+ limit). Download may fail!` : '';

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
            `📝 *Description:*\n${api.description ? api.description.substring(0, 150) + '...' : 'No description'}` +
            sizeWarning;

        // Store data
        const downloadData = {
            videoUrl: selectedVideo?.mediaUrl || null,
            videoQuality: selectedVideoQuality,
            videoFileSize: selectedVideo?.mediaFileSize || 'Unknown',
            audioUrl: selectedAudio?.mediaUrl || null,
            audioQuality: selectedAudioQuality,
            audioFileSize: selectedAudio?.mediaFileSize || 'Unknown',
            audioExtension: selectedAudio?.mediaExtension || 'mp3',
            videoId: videoId,
            title: title,
            channel: channelName,
            thumbnail: thumbnail
        };

        console.log(`[YOUTUBE] Ready: Video=${selectedVideoQuality}(${selectedVideo?.mediaFileSize}), Audio=${selectedAudioQuality}(${selectedAudio?.mediaExtension})`);

        if (messageType === 'text') {
            let optionsText = `\n\n📥 *Reply with your choice:*\n`;
            
            if (selectedVideo) {
                const sizeText = videoSizeMB > 100 ? ' ⚠️ >100MB' : '';
                optionsText += `\n🎬 *Video (${selectedVideoQuality} | ${selectedVideo.mediaFileSize}${sizeText}):*\n`;
                optionsText += `🎬 *1.1* - Video ${selectedVideoQuality}\n`;
                optionsText += `📄 *1.2* - Video ${selectedVideoQuality} (Doc)\n`;
            }
            
            if (selectedAudio) {
                const formatLabel = selectedAudioQuality === 'MP3' ? ' 🎵 MP3' : ` (${selectedAudioQuality})`;
                optionsText += `\n🎵 *Audio${formatLabel} | ${selectedAudio.mediaFileSize}):*\n`;
                optionsText += `🎵 *2.1* - Audio MP3\n`;
                optionsText += `📄 *2.2* - Audio MP3 (Doc)\n`;
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
                
                const sizeLabel = videoSizeMB > 100 ? ' ⚠️ Large' : '';
                btn.makeRow("🎬", `Video ${selectedVideoQuality}`, `${selectedVideo.mediaFileSize}${sizeLabel}`, vidNormal);
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
                
                const isMP3 = selectedAudioQuality === 'MP3';
                const audioLabel = isMP3 ? '🎵 MP3 Audio' : `🎵 Audio ${selectedAudioQuality}`;
                
                btn.makeRow("🎵", isMP3 ? "MP3 Audio" : `Audio ${selectedAudioQuality}`, `${selectedAudio.mediaFileSize}`, audNormal);
                btn.makeRow("📄", isMP3 ? "MP3 Audio (Doc)" : `Audio ${selectedAudioQuality} (Doc)`, "Document format", audDoc);
                
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
