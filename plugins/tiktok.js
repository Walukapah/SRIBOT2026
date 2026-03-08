const { cmd } = require('../command');
const { Button } = require('../lib/button');
const config = require('../config');
const { getBuffer, fetchJson } = require('../lib/functions');

// Store TikTok downloads globally with message ID mapping
if (!global.tiktokDownloads) global.tiktokDownloads = new Map();
if (!global.tiktokReplyHandlers) global.tiktokReplyHandlers = new Map();

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
        if (!q || (!q.includes('tiktok.com') && !q.includes('vt.tiktok'))) {
            return reply(`❌ *Please provide a valid TikTok URL!*\n\n*Usage:* ${prefix}tiktok <video-url>\n\n*Example:*\n${prefix}tiktok https://vt.tiktok.com/ZSuYLQkMm/`);
        }

        // Validate URL format
        const tiktokUrl = q.trim();
        const urlRegex = /(https?:\/\/)?(www\.)?(tiktok\.com|vt\.tiktok\.com)\/[^\s]+/;

        if (!urlRegex.test(tiktokUrl)) {
            return reply(`❌ *Invalid TikTok URL!*\n\nPlease provide a valid TikTok video link.`);
        }

        // Send processing message
        await reply(`⏳ *Downloading TikTok video...*\n\n🔄 Please wait while I fetch the video...`);

        // Call API
        const apiUrl = `https://sri-api.vercel.app/download/tiktokdl?url=${encodeURIComponent(tiktokUrl)}`;
        const response = await fetchJson(apiUrl);

        // Check API response
        if (!response || !response.status || !response.result || !response.result.data) {
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

        // Check message type
        if (messageType === 'text') {
            // ========== TEXT MODE ==========
            // Send video info with cover image
            const infoMsg = `🎵 *TikTok Downloader* 🎵\n\n` +
                `📌 *Title:* ${videoInfo.caption || "No caption"}\n` +
                `⏳ *Duration:* ${videoInfo.duration_formatted || "Unknown"}\n` +
                `👀 *Views:* ${stats.plays_formatted || "Unknown"}\n` +
                `❤️ *Likes:* ${stats.likes_formatted || "Unknown"}\n` +
                `👤 *Author:* ${author?.nickname || "Unknown"} (@${author?.username || "Unknown"})\n` +
                `🔗 *Url:* ${videoInfo.original_url || tiktokUrl}\n\n` +
                `🔽 *Reply with your choice:*\n` +
                `🎬 *1.1* - Download Video (HD)\n` +
                `🎬 *1.2* - Download Video (SD)\n` +
                `🎵 *2.1* - Download Music (MP3)\n\n` +
                `${config.FOOTER || "POWERED BY SRI-BOT 🇱🇰"}`;

            const sentMsg = await conn.sendMessage(from, { 
                image: { url: videoInfo.cover_image }, 
                caption: infoMsg 
            }, { quoted: mek });

            const messageID = sentMsg.key.id;
            await conn.sendMessage(from, { react: { text: '🎵', key: sentMsg.key } });

            // Store download data
            global.tiktokDownloads.set(messageID, {
                videoUrlHD: downloadLinks.no_watermark.hd,
                videoUrlSD: downloadLinks.no_watermark.sd,
                musicUrl: music.play_url,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                caption: videoInfo.caption,
                title: music.title,
                musicAuthor: music.author
            });

            // Setup reply handler for this specific message
            const replyHandler = async (messageUpdate) => {
                try {
                    const mekInfo = messageUpdate?.messages[0];
                    if (!mekInfo?.message) return;

                    const messageType = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
                    const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                    if (!isReplyToSentMsg) return;

                    let userReply = messageType.trim();
                    let msg;

                    // Remove handler after first valid reply
                    conn.ev.off('messages.upsert', replyHandler);
                    global.tiktokReplyHandlers.delete(messageID);

                    switch(userReply) {
                        case "1.1":
                            // HD Video
                            msg = await conn.sendMessage(from, { text: "⏳ Downloading HD Video..." }, { quoted: mekInfo });
                            await conn.sendMessage(from, {
                                video: { url: downloadLinks.no_watermark.hd },
                                caption: `🎬 *TikTok Video (HD)*\n\n👤 ${author.nickname}\n📝 ${videoInfo.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`,
                                contextInfo: {
                                    externalAdReply: {
                                        title: "TikTok Video HD",
                                        body: author.nickname,
                                        thumbnailUrl: videoInfo.cover_image,
                                        mediaType: 1
                                    }
                                }
                            }, { quoted: mekInfo });
                            await conn.sendMessage(from, { text: '✅ HD Video Downloaded ✅', edit: msg.key });
                            return;

                        case "1.2":
                            // SD Video
                            msg = await conn.sendMessage(from, { text: "⏳ Downloading SD Video..." }, { quoted: mekInfo });
                            await conn.sendMessage(from, {
                                video: { url: downloadLinks.no_watermark.sd },
                                caption: `🎬 *TikTok Video (SD)*\n\n👤 ${author.nickname}\n📝 ${videoInfo.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`,
                                contextInfo: {
                                    externalAdReply: {
                                        title: "TikTok Video SD",
                                        body: author.nickname,
                                        thumbnailUrl: videoInfo.cover_image,
                                        mediaType: 1
                                    }
                                }
                            }, { quoted: mekInfo });
                            await conn.sendMessage(from, { text: '✅ SD Video Downloaded ✅', edit: msg.key });
                            return;

                        case "2.1":
                            // Music/Audio
                            msg = await conn.sendMessage(from, { text: "⏳ Downloading Music..." }, { quoted: mekInfo });

                            // Send as audio
                            await conn.sendMessage(from, {
                                audio: { url: music.play_url },
                                mimetype: 'audio/mpeg',
                                ptt: false
                            }, { quoted: mekInfo });

                            // Send as document
                            await conn.sendMessage(from, {
                                document: { url: music.play_url },
                                mimetype: 'audio/mpeg',
                                fileName: `TikTok_${music.title || 'Music'}_${Date.now()}.mp3`,
                                caption: `🎵 *TikTok Music*\n\n🎶 ${music.title || 'Unknown'}\n👤 ${music.author || 'Unknown'}\n\n📥 Downloaded via ${config.BOT_NAME}`
                            }, { quoted: mekInfo });

                            await conn.sendMessage(from, { text: '✅ Music Downloaded ✅', edit: msg.key });
                            return;

                        default:
                            return await conn.sendMessage(from, { 
                                text: "❌ Invalid choice! Please reply with one of the provided options (1.1, 1.2, or 2.1)." 
                            }, { quoted: mekInfo });
                    }

                } catch (error) {
                    console.error('[TIKTOK REPLY ERROR]', error);
                    await conn.sendMessage(from, { 
                        text: `❌ *An error occurred while processing:* ${error.message || "Error!"}` 
                    }, { quoted: mekInfo });
                }
            };

            // Store and register handler
            global.tiktokReplyHandlers.set(messageID, replyHandler);
            conn.ev.on('messages.upsert', replyHandler);

            // Auto-remove handler after 2 minutes
            setTimeout(() => {
                if (global.tiktokReplyHandlers.has(messageID)) {
                    conn.ev.off('messages.upsert', replyHandler);
                    global.tiktokReplyHandlers.delete(messageID);
                    global.tiktokDownloads.delete(messageID);
                }
            }, 120000);

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

            const videoHDId = `ttvidhd_${Date.now()}`;
            const videoSDId = `ttvidsd_${Date.now()}`;
            const musicId = `ttmus_${Date.now()}`;

            btn.makeRow("🎬", "Download Video HD", "High quality video", videoHDId);
            btn.makeRow("🎬", "Download Video SD", "Standard quality video", videoSDId);
            btn.makeRow("🎵", "Download Music", "Original audio/MP3", musicId);

            // Add URL button to view original
            btn.addUrl("🔗 View on TikTok", tiktokUrl);

            const sentMsg = await btn.send(from, conn, mek);

            // Store download data for button response handling
            const messageId = sentMsg?.key?.id || mek.key.id;

            global.tiktokDownloads.set(videoHDId, {
                type: 'video',
                quality: 'HD',
                url: downloadLinks.no_watermark.hd,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                caption: videoInfo.caption,
                parentMsgId: messageId
            });

            global.tiktokDownloads.set(videoSDId, {
                type: 'video',
                quality: 'SD',
                url: downloadLinks.no_watermark.sd,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                caption: videoInfo.caption,
                parentMsgId: messageId
            });

            global.tiktokDownloads.set(musicId, {
                type: 'music',
                url: music.play_url,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                title: music.title,
                musicAuthor: music.author,
                parentMsgId: messageId
            });
        }

    } catch (error) {
        console.error("TikTok download error:", error);
        reply(`❌ *Error downloading video!*\n\n${error.message}`);
    }
});

// Handle Button Mode Responses - Video HD
cmd({
    pattern: "ttvidhd_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !body.startsWith('ttvidhd_') || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData || downloadData.type !== 'video') return;

    try {
        await reply(`⏳ *Downloading ${downloadData.quality} video...*`);

        // Send video using URL directly (no buffer needed)
        await conn.sendMessage(from, {
            video: { url: downloadData.url },
            caption: `🎬 *TikTok Video (${downloadData.quality})*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`,
            contextInfo: {
                externalAdReply: {
                    title: `TikTok Video ${downloadData.quality}`,
                    body: downloadData.author,
                    thumbnailUrl: downloadData.coverImage,
                    mediaType: 1
                }
            }
        }, { quoted: mek });

        // Clean up after 5 minutes
        setTimeout(() => {
            global.tiktokDownloads.delete(body);
        }, 300000);

    } catch (error) {
        console.error("Video download error:", error);
        reply(`❌ *Failed to download video!*\n\n${error.message}`);
    }
});

// Handle Button Mode Responses - Video SD
cmd({
    pattern: "ttvidsd_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !body.startsWith('ttvidsd_') || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData || downloadData.type !== 'video') return;

    try {
        await reply(`⏳ *Downloading ${downloadData.quality} video...*`);

        // Send video using URL directly (no buffer needed)
        await conn.sendMessage(from, {
            video: { url: downloadData.url },
            caption: `🎬 *TikTok Video (${downloadData.quality})*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`,
            contextInfo: {
                externalAdReply: {
                    title: `TikTok Video ${downloadData.quality}`,
                    body: downloadData.author,
                    thumbnailUrl: downloadData.coverImage,
                    mediaType: 1
                }
            }
        }, { quoted: mek });

        // Clean up after 5 minutes
        setTimeout(() => {
            global.tiktokDownloads.delete(body);
        }, 300000);

    } catch (error) {
        console.error("Video download error:", error);
        reply(`❌ *Failed to download video!*\n\n${error.message}`);
    }
});

// Handle Button Mode Responses - Music
cmd({
    pattern: "ttmus_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !body.startsWith('ttmus_') || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData || downloadData.type !== 'music') return;

    try {
        await reply(`⏳ *Downloading music...*`);

        // Send as audio using URL directly
        await conn.sendMessage(from, {
            audio: { url: downloadData.url },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        // Send as document
        await conn.sendMessage(from, {
            document: { url: downloadData.url },
            mimetype: 'audio/mpeg',
            fileName: `TikTok_${downloadData.title || 'Music'}_${Date.now()}.mp3`,
            caption: `🎵 *TikTok Music*\n\n🎶 ${downloadData.title || 'Unknown'}\n👤 ${downloadData.musicAuthor || 'Unknown'}\n\n📥 Downloaded via ${config.BOT_NAME}`
        }, { quoted: mek });

        // Clean up after 5 minutes
        setTimeout(() => {
            global.tiktokDownloads.delete(body);
        }, 300000);

    } catch (error) {
        console.error("Music download error:", error);
        reply(`❌ *Failed to download music!*\n\n${error.message}`);
    }
});
