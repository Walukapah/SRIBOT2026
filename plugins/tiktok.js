const { cmd } = require('../command');
const { Button } = require('../lib/button');
const config = require('../config');
const { getBuffer, fetchJson } = require('../lib/functions');

// TikTok Download Command
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
        
        // Check if URL is provided
        if (!q || !q.includes('tiktok.com') && !q.includes('vt.tiktok')) {
            return reply(`❌ *Please provide a valid TikTok URL!*\n\n*Usage:* ${prefix}tiktok <video-url>\n\n*Example:*\n${prefix}tiktok https://vt.tiktok.com/ZSuYLQkMm/`);
        }

        // Validate URL format
        const tiktokUrl = q.trim();
        const urlRegex = /(https?:\/\/)?(www\.)?(tiktok\.com|vt\.tiktok\.com)\/[^\s]+/;
        
        if (!urlRegex.test(tiktokUrl)) {
            return reply(`❌ *Invalid TikTok URL!*\n\nPlease provide a valid TikTok video link.`);
        }

        // Send processing message
        const processingMsg = await reply(`⏳ *Downloading TikTok video...*\n\n🔄 Please wait while I fetch the video...`);

        // Call API
        const apiUrl = `https://sri-api.vercel.app/download/tiktokdl?url=${encodeURIComponent(tiktokUrl)}`;
        const response = await fetchJson(apiUrl);

        // Check API response
        if (!response || !response.status || !response.result || !response.result.data) {
            await conn.sendMessage(from, { delete: processingMsg.key });
            return reply(`❌ *Failed to fetch video!*\n\nThe video might be private, deleted, or the API is temporarily unavailable.`);
        }

        const data = response.result.data;
        const videoInfo = data.video_info;
        const author = data.author;
        const stats = data.statistics;
        const downloadLinks = data.download_links;
        const music = data.music;

        // Prepare caption/info text
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

        // Delete processing message
        await conn.sendMessage(from, { delete: processingMsg.key });

        // Check message type
        if (messageType === 'text') {
            // ========== TEXT MODE ==========
            // Send video info with cover image
            const sentMsg = await conn.sendMessage(from, {
                image: { url: videoInfo.cover_image },
                caption: `${infoText}\n\n📥 *Reply with:*\n*[1]* - Download Video (No Watermark)\n*[2]* - Download Music/Audio`,
                contextInfo: {
                    externalAdReply: {
                        title: "TikTok Downloader",
                        body: `${author.nickname}'s video`,
                        thumbnailUrl: videoInfo.cover_image,
                        sourceUrl: tiktokUrl,
                        mediaType: 1
                    }
                }
            }, { quoted: mek });

            // Store download data for reply handling
            if (!global.tiktokDownloads) global.tiktokDownloads = new Map();
            global.tiktokDownloads.set(sentMsg.key.id, {
                videoUrl: downloadLinks.no_watermark.url,
                musicUrl: music.play_url,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                caption: videoInfo.caption
            });

        } else {
            // ========== BUTTON MODE ==========
            const btn = new Button();
            
            // Set cover image
            await btn.setImage(videoInfo.cover_image);
            btn.setTitle("🎵 TikTok Downloader");
            btn.setBody(infoText);
            btn.setFooter(`Powered by ${botName} 🇱🇰`);

            // Add selection for download options
            btn.addSelection("📥 Select Download Option");
            btn.makeSection("⬇️ Download Options", "Choose what to download");
            btn.makeRow("🎬", "Download Video", "No watermark HD video", `tt_video_${Date.now()}`);
            btn.makeRow("🎵", "Download Music", "Original audio/MP3", `tt_music_${Date.now()}`);
            
            // Add URL button to view original
            btn.addUrl("🔗 View on TikTok", tiktokUrl);

            const sentMsg = await btn.send(from, conn, mek);

            // Store download data for button response handling
            if (!global.tiktokDownloads) global.tiktokDownloads = new Map();
            
            // Extract button IDs from sent message (we'll use timestamp-based matching)
            const timestamp = Date.now();
            global.tiktokDownloads.set(`tt_video_${timestamp}`, {
                type: 'video',
                url: downloadLinks.no_watermark.url,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                caption: videoInfo.caption
            });
            
            global.tiktokDownloads.set(`tt_music_${timestamp}`, {
                type: 'music',
                url: music.play_url,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                title: music.title
            });
        }

    } catch (error) {
        console.error("TikTok download error:", error);
        reply(`❌ *Error downloading video!*\n\n${error.message}`);
    }
});

// Handle Text Mode Replies (1 or 2)
cmd({
    pattern: "1",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, quoted }) => {
    // Check if this is a reply to our TikTok message
    if (!quoted || !global.tiktokDownloads) return;
    
    const downloadData = global.tiktokDownloads.get(quoted.key.id);
    if (!downloadData) return;

    try {
        const processingMsg = await reply(`⏳ *Downloading video...*`);
        
        // Download and send video
        const videoBuffer = await getBuffer(downloadData.videoUrl);
        
        await conn.sendMessage(from, { delete: processingMsg.key });
        
        await conn.sendMessage(from, {
            video: videoBuffer,
            caption: `🎬 *TikTok Video*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`,
            contextInfo: {
                externalAdReply: {
                    title: "TikTok Video",
                    body: downloadData.author,
                    thumbnailUrl: downloadData.coverImage,
                    mediaType: 1
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error("Video download error:", error);
        reply(`❌ *Failed to download video!*\n\n${error.message}`);
    }
});

cmd({
    pattern: "2",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, quoted }) => {
    // Check if this is a reply to our TikTok message
    if (!quoted || !global.tiktokDownloads) return;
    
    const downloadData = global.tiktokDownloads.get(quoted.key.id);
    if (!downloadData) return;

    try {
        const processingMsg = await reply(`⏳ *Downloading music...*`);
        
        // Download and send music
        const musicBuffer = await getBuffer(downloadData.musicUrl);
        
        await conn.sendMessage(from, { delete: processingMsg.key });
        
        await conn.sendMessage(from, {
            audio: musicBuffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: "TikTok Music",
                    body: downloadData.author,
                    thumbnailUrl: downloadData.coverImage,
                    mediaType: 1
                }
            }
        }, { quoted: mek });

        // Also send as document for better quality
        await conn.sendMessage(from, {
            document: musicBuffer,
            mimetype: 'audio/mpeg',
            fileName: `TikTok_Music_${Date.now()}.mp3`,
            caption: `🎵 *TikTok Music*\n\n👤 ${downloadData.author}\n📥 Downloaded via ${config.BOT_NAME}`
        }, { quoted: mek });

    } catch (error) {
        console.error("Music download error:", error);
        reply(`❌ *Failed to download music!*\n\n${error.message}`);
    }
});

// Handle Button Mode Responses
cmd({
    pattern: "tt_video_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !body.startsWith('tt_video_') || !global.tiktokDownloads) return;
    
    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData || downloadData.type !== 'video') return;

    try {
        const processingMsg = await reply(`⏳ *Downloading video...*`);
        
        const videoBuffer = await getBuffer(downloadData.url);
        
        await conn.sendMessage(from, { delete: processingMsg.key });
        
        await conn.sendMessage(from, {
            video: videoBuffer,
            caption: `🎬 *TikTok Video*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`,
            contextInfo: {
                externalAdReply: {
                    title: "TikTok Video",
                    body: downloadData.author,
                    thumbnailUrl: downloadData.coverImage,
                    mediaType: 1
                }
            }
        }, { quoted: mek });

        // Clean up
        global.tiktokDownloads.delete(body);

    } catch (error) {
        console.error("Video download error:", error);
        reply(`❌ *Failed to download video!*\n\n${error.message}`);
    }
});

cmd({
    pattern: "tt_music_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !body.startsWith('tt_music_') || !global.tiktokDownloads) return;
    
    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData || downloadData.type !== 'music') return;

    try {
        const processingMsg = await reply(`⏳ *Downloading music...*`);
        
        const musicBuffer = await getBuffer(downloadData.url);
        
        await conn.sendMessage(from, { delete: processingMsg.key });
        
        // Send as audio
        await conn.sendMessage(from, {
            audio: musicBuffer,
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        // Send as document
        await conn.sendMessage(from, {
            document: musicBuffer,
            mimetype: 'audio/mpeg',
            fileName: `TikTok_Music_${downloadData.title || Date.now()}.mp3`,
            caption: `🎵 *TikTok Music*\n\n🎶 ${downloadData.title || 'Unknown'}\n👤 ${downloadData.author}\n\n📥 Downloaded via ${config.BOT_NAME}`
        }, { quoted: mek });

        // Clean up
        global.tiktokDownloads.delete(body);

    } catch (error) {
        console.error("Music download error:", error);
        reply(`❌ *Failed to download music!*\n\n${error.message}`);
    }
});
