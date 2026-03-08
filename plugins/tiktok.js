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
            await conn.sendMessage(from, { react: { text: '🎵', key: sentMsg.key } });

            // Store download data
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
                            // No Watermark HD Video
                            msg = await conn.sendMessage(from, { text: "⏳ Downloading HD Video (No Watermark)..." }, { quoted: mekInfo });
                            await conn.sendMessage(from, {
                                video: { url: downloadLinks.no_watermark.hd },
                                caption: `🎬 *TikTok Video (HD - No Watermark)*\n\n👤 ${author.nickname}\n📝 ${videoInfo.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`
                            }, { quoted: mekInfo });
                            await conn.sendMessage(from, { text: '✅ HD Video Downloaded ✅', edit: msg.key });
                            return;

                        case "1.2":
                            // No Watermark HD Video as Document
                            msg = await conn.sendMessage(from, { text: "⏳ Downloading HD Video as Document..." }, { quoted: mekInfo });
                            await conn.sendMessage(from, {
                                document: { url: downloadLinks.no_watermark.hd },
                                mimetype: 'video/mp4',
                                fileName: `TikTok_${author.username}_${Date.now()}_HD_NoWM.mp4`,
                                caption: `🎬 *TikTok Video (HD - No Watermark - Document)*\n\n👤 ${author.nickname}\n📝 ${videoInfo.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`
                            }, { quoted: mekInfo });
                            await conn.sendMessage(from, { text: '✅ HD Video (Document) Downloaded ✅', edit: msg.key });
                            return;

                        case "1.3":
                            // With Watermark Video
                            msg = await conn.sendMessage(from, { text: "⏳ Downloading Video (With Watermark)..." }, { quoted: mekInfo });
                            await conn.sendMessage(from, {
                                video: { url: downloadLinks.with_watermark.url },
                                caption: `🎬 *TikTok Video (With Watermark)*\n\n👤 ${author.nickname}\n📝 ${videoInfo.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`
                            }, { quoted: mekInfo });
                            await conn.sendMessage(from, { text: '✅ Video (With Watermark) Downloaded ✅', edit: msg.key });
                            return;

                        case "1.4":
                            // With Watermark Video as Document
                            msg = await conn.sendMessage(from, { text: "⏳ Downloading Video as Document (With Watermark)..." }, { quoted: mekInfo });
                            await conn.sendMessage(from, {
                                document: { url: downloadLinks.with_watermark.url },
                                mimetype: 'video/mp4',
                                fileName: `TikTok_${author.username}_${Date.now()}_WM.mp4`,
                                caption: `🎬 *TikTok Video (With Watermark - Document)*\n\n👤 ${author.nickname}\n📝 ${videoInfo.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`
                            }, { quoted: mekInfo });
                            await conn.sendMessage(from, { text: '✅ Video Document (With Watermark) Downloaded ✅', edit: msg.key });
                            return;

                        case "2.1":
                            // Audio
                            msg = await conn.sendMessage(from, { text: "⏳ Downloading Audio..." }, { quoted: mekInfo });
                            await conn.sendMessage(from, {
                                audio: { url: music.play_url },
                                mimetype: 'audio/mpeg',
                                ptt: false
                            }, { quoted: mekInfo });
                            await conn.sendMessage(from, { text: '✅ Audio Downloaded ✅', edit: msg.key });
                            return;

                        case "2.2":
                            // Audio as Document
                            msg = await conn.sendMessage(from, { text: "⏳ Downloading Audio as Document..." }, { quoted: mekInfo });
                            await conn.sendMessage(from, {
                                document: { url: music.play_url },
                                mimetype: 'audio/mpeg',
                                fileName: `TikTok_${music.title || 'Audio'}_${Date.now()}.mp3`,
                                caption: `🎵 *TikTok Music*\n\n🎶 ${music.title || 'Unknown'}\n👤 ${music.author || 'Unknown'}\n\n📥 Downloaded via ${config.BOT_NAME}`
                            }, { quoted: mekInfo });
                            await conn.sendMessage(from, { text: '✅ Audio Document Downloaded ✅', edit: msg.key });
                            return;

                        default:
                            return await conn.sendMessage(from, { 
                                text: "❌ Invalid choice! Please reply with one of the provided options (1.1, 1.2, 1.3, 1.4, 2.1, or 2.2)." 
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

            // Auto-remove handler after 3 minutes
            setTimeout(() => {
                if (global.tiktokReplyHandlers.has(messageID)) {
                    conn.ev.off('messages.upsert', replyHandler);
                    global.tiktokReplyHandlers.delete(messageID);
                    global.tiktokDownloads.delete(messageID);
                }
            }, 180000);

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

            // Generate unique IDs with timestamp and random number
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000);

            const videoHDId = `ttvidhd_${timestamp}_${random}`;
            const videoHDDocumentId = `ttvidhddoc_${timestamp}_${random}`;
            const videoWMId = `ttvidwm_${timestamp}_${random}`;
            const videoWMDocumentId = `ttvidwmdoc_${timestamp}_${random}`;
            const audioId = `ttaud_${timestamp}_${random}`;
            const audioDocumentId = `ttauddoc_${timestamp}_${random}`;

            btn.makeRow("🎬", "No WM Video HD", "High quality no watermark", videoHDId);
            btn.makeRow("📄", "No WM Video HD (Doc)", "HD video as document", videoHDDocumentId);
            btn.makeRow("🎬", "With Watermark Video", "Video with watermark", videoWMId);
            btn.makeRow("📄", "With Watermark (Doc)", "WM video as document", videoWMDocumentId);
            btn.makeRow("🎵", "Audio", "Original audio file", audioId);
            btn.makeRow("📄", "Audio (Document)", "Audio as document file", audioDocumentId);

            // Add URL button to view original
            btn.addUrl("🔗 View on TikTok", tiktokUrl);

            const sentMsg = await btn.send(from, conn, mek);

            console.log(`[TIKTOK] Button message sent with ID: ${sentMsg?.key?.id}`);
            console.log(`[TIKTOK] Video HD ID: ${videoHDId}`);
            console.log(`[TIKTOK] Audio ID: ${audioId}`);

            // Store download data for button response handling
            const messageId = sentMsg?.key?.id || mek.key.id;

            const downloadData = {
                videoHD: {
                    type: 'video',
                    quality: 'HD',
                    mode: 'normal',
                    url: downloadLinks.no_watermark.hd,
                    coverImage: videoInfo.cover_image,
                    author: author.nickname,
                    caption: videoInfo.caption,
                    username: author.username,
                    parentMsgId: messageId
                },
                videoHDDocument: {
                    type: 'video',
                    quality: 'HD',
                    mode: 'document',
                    url: downloadLinks.no_watermark.hd,
                    coverImage: videoInfo.cover_image,
                    author: author.nickname,
                    caption: videoInfo.caption,
                    username: author.username,
                    parentMsgId: messageId
                },
                videoWM: {
                    type: 'video',
                    quality: 'WM',
                    mode: 'normal',
                    url: downloadLinks.with_watermark.url,
                    coverImage: videoInfo.cover_image,
                    author: author.nickname,
                    caption: videoInfo.caption,
                    username: author.username,
                    parentMsgId: messageId
                },
                videoWMDocument: {
                    type: 'video',
                    quality: 'WM',
                    mode: 'document',
                    url: downloadLinks.with_watermark.url,
                    coverImage: videoInfo.cover_image,
                    author: author.nickname,
                    caption: videoInfo.caption,
                    username: author.username,
                    parentMsgId: messageId
                },
                audio: {
                    type: 'audio',
                    mode: 'normal',
                    url: music.play_url,
                    coverImage: videoInfo.cover_image,
                    author: author.nickname,
                    title: music.title,
                    musicAuthor: music.author,
                    parentMsgId: messageId
                },
                audioDocument: {
                    type: 'audio',
                    mode: 'document',
                    url: music.play_url,
                    coverImage: videoInfo.cover_image,
                    author: author.nickname,
                    title: music.title,
                    musicAuthor: music.author,
                    parentMsgId: messageId
                }
            };

            // Store all data with their IDs
            global.tiktokDownloads.set(videoHDId, downloadData.videoHD);
            global.tiktokDownloads.set(videoHDDocumentId, downloadData.videoHDDocument);
            global.tiktokDownloads.set(videoWMId, downloadData.videoWM);
            global.tiktokDownloads.set(videoWMDocumentId, downloadData.videoWMDocument);
            global.tiktokDownloads.set(audioId, downloadData.audio);
            global.tiktokDownloads.set(audioDocumentId, downloadData.audioDocument);

            // Also store reference to all IDs for this message
            global.tiktokDownloads.set(`msg_${messageId}`, {
                ids: [videoHDId, videoHDDocumentId, videoWMId, videoWMDocumentId, audioId, audioDocumentId],
                timestamp: Date.now()
            });
        }

    } catch (error) {
        console.error("TikTok download error:", error);
        reply(`❌ *Error downloading video!*\n\n${error.message}`);
    }
});

// Universal Button Handler - handles all button responses
cmd({
    pattern: "tt",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    // Check if this is a TikTok button response
    if (!body || !global.tiktokDownloads) return;

    // Check if body starts with any of our TikTok button IDs
    const tiktokPatterns = ['ttvidhd_', 'ttvidhddoc_', 'ttvidwm_', 'ttvidwmdoc_', 'ttaud_', 'ttauddoc_'];
    const isTikTokButton = tiktokPatterns.some(pattern => body.startsWith(pattern));

    if (!isTikTokButton) return;

    console.log(`[TIKTOK BUTTON] Received button response: ${body}`);

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData) {
        console.log(`[TIKTOK BUTTON] No download data found for ID: ${body}`);
        return reply(`❌ Download data expired or not found. Please try the command again.`);
    }

    try {
        if (downloadData.type === 'video') {
            if (downloadData.mode === 'document') {
                // Video as Document
                await reply(`⏳ *Downloading ${downloadData.quality} video as document...*`);

                await conn.sendMessage(from, {
                    document: { url: downloadData.url },
                    mimetype: 'video/mp4',
                    fileName: `TikTok_${downloadData.username}_${Date.now()}_${downloadData.quality}_${downloadData.mode === 'document' ? 'NoWM' : 'WM'}.mp4`,
                    caption: `🎬 *TikTok Video (${downloadData.quality} - ${downloadData.mode === 'document' ? 'No Watermark' : 'With Watermark'} - Document)*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            } else {
                // Normal Video
                await reply(`⏳ *Downloading ${downloadData.quality} video...*`);

                await conn.sendMessage(from, {
                    video: { url: downloadData.url },
                    caption: `🎬 *TikTok Video (${downloadData.quality} - ${downloadData.quality === 'WM' ? 'With Watermark' : 'No Watermark'})*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            }
        } else if (downloadData.type === 'audio') {
            if (downloadData.mode === 'document') {
                // Audio as Document
                await reply(`⏳ *Downloading audio as document...*`);

                await conn.sendMessage(from, {
                    document: { url: downloadData.url },
                    mimetype: 'audio/mpeg',
                    fileName: `TikTok_${downloadData.title || 'Audio'}_${Date.now()}.mp3`,
                    caption: `🎵 *TikTok Music*\n\n🎶 ${downloadData.title || 'Unknown'}\n👤 ${downloadData.musicAuthor || 'Unknown'}\n\n📥 Downloaded via ${config.BOT_NAME}`
                }, { quoted: mek });
            } else {
                // Normal Audio
                await reply(`⏳ *Downloading audio...*`);

                await conn.sendMessage(from, {
                    audio: { url: downloadData.url },
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: mek });
            }
        }

        // Clean up after 5 minutes
        setTimeout(() => {
            global.tiktokDownloads.delete(body);
        }, 300000);

    } catch (error) {
        console.error("[TIKTOK BUTTON ERROR]", error);
        reply(`❌ *Failed to download!*\n\n${error.message}`);
    }
});
