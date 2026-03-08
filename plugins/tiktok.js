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
                caption: infoMsg 
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
                                caption: `🎬 *TikTok Video (HD - No Watermark)*\n\n👤 ${author.nickname}\n📝 ${videoInfo.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`,
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
                                caption: `🎬 *TikTok Video (With Watermark)*\n\n👤 ${author.nickname}\n📝 ${videoInfo.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`,
                                contextInfo: {
                                    externalAdReply: {
                                        title: "TikTok Video (WM)",
                                        body: author.nickname,
                                        thumbnailUrl: videoInfo.cover_image,
                                        mediaType: 1
                                    }
                                }
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

            const videoHDId = `ttvidhd_${Date.now()}`;
            const videoHDDocumentId = `ttvidhddoc_${Date.now()}`;
            const videoWMId = `ttvidwm_${Date.now()}`;
            const videoWMDocumentId = `ttvidwmdoc_${Date.now()}`;
            const audioId = `ttaud_${Date.now()}`;
            const audioDocumentId = `ttauddoc_${Date.now()}`;

            btn.makeRow("🎬", "No WM Video HD", "High quality no watermark", videoHDId);
            btn.makeRow("📄", "No WM Video HD (Doc)", "HD video as document", videoHDDocumentId);
            btn.makeRow("🎬", "With Watermark Video", "Video with watermark", videoWMId);
            btn.makeRow("📄", "With Watermark (Doc)", "WM video as document", videoWMDocumentId);
            btn.makeRow("🎵", "Audio", "Original audio file", audioId);
            btn.makeRow("📄", "Audio (Document)", "Audio as document file", audioDocumentId);

            // Add URL button to view original
            btn.addUrl("🔗 View on TikTok", tiktokUrl);

            const sentMsg = await btn.send(from, conn, mek);

            // Store download data for button response handling
            const messageId = sentMsg?.key?.id || mek.key.id;

            global.tiktokDownloads.set(videoHDId, {
                type: 'video',
                quality: 'HD',
                mode: 'normal',
                url: downloadLinks.no_watermark.hd,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                caption: videoInfo.caption,
                username: author.username,
                parentMsgId: messageId
            });

            global.tiktokDownloads.set(videoHDDocumentId, {
                type: 'video',
                quality: 'HD',
                mode: 'document',
                url: downloadLinks.no_watermark.hd,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                caption: videoInfo.caption,
                username: author.username,
                parentMsgId: messageId
            });

            global.tiktokDownloads.set(videoWMId, {
                type: 'video',
                quality: 'WM',
                mode: 'normal',
                url: downloadLinks.with_watermark.url,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                caption: videoInfo.caption,
                username: author.username,
                parentMsgId: messageId
            });

            global.tiktokDownloads.set(videoWMDocumentId, {
                type: 'video',
                quality: 'WM',
                mode: 'document',
                url: downloadLinks.with_watermark.url,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                caption: videoInfo.caption,
                username: author.username,
                parentMsgId: messageId
            });

            global.tiktokDownloads.set(audioId, {
                type: 'audio',
                mode: 'normal',
                url: music.play_url,
                coverImage: videoInfo.cover_image,
                author: author.nickname,
                title: music.title,
                musicAuthor: music.author,
                parentMsgId: messageId
            });

            global.tiktokDownloads.set(audioDocumentId, {
                type: 'audio',
                mode: 'document',
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

// Handle Button Mode Responses - No Watermark HD Video
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

        await conn.sendMessage(from, {
            video: { url: downloadData.url },
            caption: `🎬 *TikTok Video (${downloadData.quality} - No Watermark)*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`,
            contextInfo: {
                externalAdReply: {
                    title: `TikTok Video ${downloadData.quality}`,
                    body: downloadData.author,
                    thumbnailUrl: downloadData.coverImage,
                    mediaType: 1
                }
            }
        }, { quoted: mek });

        setTimeout(() => {
            global.tiktokDownloads.delete(body);
        }, 300000);

    } catch (error) {
        console.error("Video download error:", error);
        reply(`❌ *Failed to download video!*\n\n${error.message}`);
    }
});

// Handle Button Mode Responses - No Watermark HD Video Document
cmd({
    pattern: "ttvidhddoc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !body.startsWith('ttvidhddoc_') || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData || downloadData.type !== 'video' || downloadData.mode !== 'document') return;

    try {
        await reply(`⏳ *Downloading HD video as document...*`);

        await conn.sendMessage(from, {
            document: { url: downloadData.url },
            mimetype: 'video/mp4',
            fileName: `TikTok_${downloadData.username}_${Date.now()}_HD_NoWM.mp4`,
            caption: `🎬 *TikTok Video (HD - No Watermark - Document)*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`
        }, { quoted: mek });

        setTimeout(() => {
            global.tiktokDownloads.delete(body);
        }, 300000);

    } catch (error) {
        console.error("Video document download error:", error);
        reply(`❌ *Failed to download video document!*\n\n${error.message}`);
    }
});

// Handle Button Mode Responses - With Watermark Video
cmd({
    pattern: "ttvidwm_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !body.startsWith('ttvidwm_') || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData || downloadData.type !== 'video') return;

    try {
        await reply(`⏳ *Downloading video with watermark...*`);

        await conn.sendMessage(from, {
            video: { url: downloadData.url },
            caption: `🎬 *TikTok Video (With Watermark)*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`,
            contextInfo: {
                externalAdReply: {
                    title: "TikTok Video (WM)",
                    body: downloadData.author,
                    thumbnailUrl: downloadData.coverImage,
                    mediaType: 1
                }
            }
        }, { quoted: mek });

        setTimeout(() => {
            global.tiktokDownloads.delete(body);
        }, 300000);

    } catch (error) {
        console.error("Video WM download error:", error);
        reply(`❌ *Failed to download video!*\n\n${error.message}`);
    }
});

// Handle Button Mode Responses - With Watermark Video Document
cmd({
    pattern: "ttvidwmdoc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !body.startsWith('ttvidwmdoc_') || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData || downloadData.type !== 'video' || downloadData.mode !== 'document') return;

    try {
        await reply(`⏳ *Downloading WM video as document...*`);

        await conn.sendMessage(from, {
            document: { url: downloadData.url },
            mimetype: 'video/mp4',
            fileName: `TikTok_${downloadData.username}_${Date.now()}_WM.mp4`,
            caption: `🎬 *TikTok Video (With Watermark - Document)*\n\n👤 ${downloadData.author}\n📝 ${downloadData.caption || ''}\n\n📥 Downloaded via ${config.BOT_NAME}`
        }, { quoted: mek });

        setTimeout(() => {
            global.tiktokDownloads.delete(body);
        }, 300000);

    } catch (error) {
        console.error("Video WM document download error:", error);
        reply(`❌ *Failed to download video document!*\n\n${error.message}`);
    }
});

// Handle Button Mode Responses - Audio
cmd({
    pattern: "ttaud_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !body.startsWith('ttaud_') || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData || downloadData.type !== 'audio') return;

    try {
        await reply(`⏳ *Downloading audio...*`);

        await conn.sendMessage(from, {
            audio: { url: downloadData.url },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        setTimeout(() => {
            global.tiktokDownloads.delete(body);
        }, 300000);

    } catch (error) {
        console.error("Audio download error:", error);
        reply(`❌ *Failed to download audio!*\n\n${error.message}`);
    }
});

// Handle Button Mode Responses - Audio Document
cmd({
    pattern: "ttauddoc_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !body.startsWith('ttauddoc_') || !global.tiktokDownloads) return;

    const downloadData = global.tiktokDownloads.get(body);
    if (!downloadData || downloadData.type !== 'audio' || downloadData.mode !== 'document') return;

    try {
        await reply(`⏳ *Downloading audio as document...*`);

        await conn.sendMessage(from, {
            document: { url: downloadData.url },
            mimetype: 'audio/mpeg',
            fileName: `TikTok_${downloadData.title || 'Audio'}_${Date.now()}.mp3`,
            caption: `🎵 *TikTok Music*\n\n🎶 ${downloadData.title || 'Unknown'}\n👤 ${downloadData.musicAuthor || 'Unknown'}\n\n📥 Downloaded via ${config.BOT_NAME}`
        }, { quoted: mek });

        setTimeout(() => {
            global.tiktokDownloads.delete(body);
        }, 300000);

    } catch (error) {
        console.error("Audio document download error:", error);
        reply(`❌ *Failed to download audio document!*\n\n${error.message}`);
    }
});
