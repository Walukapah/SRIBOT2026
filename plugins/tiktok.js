const config = require('../config');
const { cmd, commands } = require('../command');
const axios = require('axios');

cmd({
    pattern: "tiktok",
    desc: "Download TikTok videos via API (no watermark)",
    category: "download",
    filename: __filename
},
async(conn, mek, m, { from, reply }) => {
    try {
        const text = m?.message?.conversation || m?.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim();
        
        if (!url) return reply("Please provide a TikTok URL\nExample: .tiktok https://vm.tiktok.com/xyz");

        // Validate TikTok URL
        if (!/https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\//.test(url)) {
            return reply("Invalid TikTok URL. Please provide a valid link");
        }

        await conn.sendMessage(from, { react: { text: '🔄', key: mek.key } });

        const apiUrl = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`;
        const { data } = await axios.get(apiUrl);

        // Check if response is valid and contains video URL
        if (!data || !data.video || !data.video.noWatermark) {
            return reply("Failed to get video URL from API response");
        }

        const videoUrl = data.video.noWatermark;
        const title = data.title || "No title";
        const author = data.author?.name || "Unknown author";
        const likes = data.stats?.likeCount || "N/A";
        const comments = data.stats?.commentCount || "N/A";
        const shares = data.stats?.shareCount || "N/A";
        const duration = data.video?.durationFormatted || "N/A";
        
        // Create detailed caption
        const caption = `
🎬 *Title:* ${title}
👤 *Author:* @${author}
❤️ *Likes:* ${likes}
💬 *Comments:* ${comments}
↩️ *Shares:* ${shares}
⏱️ *Duration:* ${duration}

> Downloaded by Sri-Bot`;

        // Send video with metadata and contextInfo
        await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: "video/mp4",
            caption: caption,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.NEWS_LETTER,
                    newsletterName: config.BOT_NAME,
                    serverMessageId: -1
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error('TikTok download error:', error);
        reply("Failed to download. Please try another link or try again later");
    }
});
