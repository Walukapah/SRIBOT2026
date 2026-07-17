const { cmd } = require('../command');
const { Button } = require('../lib/button');
const config = require('../config');
const { fetchJson, getBuffer } = require('../lib/functions');

// Store PHS search results globally
if (!global.phsSearches) global.phsSearches = new Map();
if (!global.phsReplyHandlers) global.phsReplyHandlers = new Map();

// Helper function to format duration
function formatDuration(duration) {
    if (!duration) return 'Unknown';
    return duration;
}

// Helper function to format views
function formatViews(views) {
    if (!views) return 'Unknown';
    return views;
}

// Check if URL is valid and accessible
async function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('http')) return false;
    try {
        const axios = require('axios');
        const response = await axios.head(url, { timeout: 5000 });
        const contentType = response.headers['content-type'] || '';
        return contentType.startsWith('image/');
    } catch (e) {
        return false;
    }
}

// Helper function to send video info with download
async function sendVideoInfo(conn, mek, from, reply, videoData, index, searchId) {
    try {
        const { title, url, thumb, channel, views, duration, vkey } = videoData;
        
        const infoText = `🎬 *${title}*\n\n` +
            `👤 *Channel:* ${channel || 'Unknown'}\n` +
            `👁️ *Views:* ${formatViews(views)}\n` +
            `⏱️ *Duration:* ${formatDuration(duration)}\n\n` +
            `🔗 *Link:* ${url}`;

        // Check if thumbnail is valid
        const thumbValid = await isValidImageUrl(thumb);

        if (thumbValid) {
            try {
                // Send thumbnail with info
                await conn.sendMessage(from, {
                    image: { url: thumb },
                    caption: infoText,
                    contextInfo: {
                        externalAdReply: {
                            title: title,
                            body: `${channel} • ${views} views`,
                            thumbnailUrl: thumb,
                            sourceUrl: url,
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: mek });
                return true;
            } catch (imgError) {
                console.log(`[PHS] Thumbnail send failed, sending text only: ${imgError.message}`);
                // Fall through to text-only send
            }
        }

        // Send text-only message if thumbnail fails or invalid
        await conn.sendMessage(from, {
            text: infoText,
            contextInfo: {
                externalAdReply: {
                    title: title,
                    body: `${channel} • ${views} views`,
                    sourceUrl: url,
                    mediaType: 1,
                    renderLargerThumbnail: false
                }
            }
        }, { quoted: mek });

        return true;
    } catch (error) {
        console.error('[PHS] Error sending video info:', error);
        await reply(`❌ *Error displaying video info!*\n\n${error.message}`);
        return false;
    }
}

// Create reply handler for a specific message
function createReplyHandler(conn, messageID, from, mek, searchResults) {
    return async function replyHandler(messageUpdate) {
        try {
            const mekInfo = messageUpdate?.messages[0];
            if (!mekInfo?.message) return;

            const msgText = mekInfo?.message?.conversation || mekInfo?.message?.extendedTextMessage?.text;
            const isReplyToSentMsg = mekInfo?.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (!isReplyToSentMsg || !msgText) return;

            const userReply = msgText.trim();
            const num = parseInt(userReply);

            // Check if valid number selection
            if (isNaN(num) || num < 1 || num > searchResults.length) return;

            console.log(`[PHS] User selected video #${num} for message: ${messageID}`);
            
            const selectedVideo = searchResults[num - 1];
            await sendVideoInfo(
                conn, 
                mekInfo, 
                from, 
                (text) => conn.sendMessage(from, { text }, { quoted: mekInfo }), 
                selectedVideo, 
                num, 
                messageID
            );

        } catch (error) {
            console.error('[PHS REPLY ERROR]', error);
        }
    };
}

// Main PHS Command
cmd({
    pattern: "phs",
    alias: ["phsearch", "ph", "psearch"],
    desc: "Search videos from PHS",
    category: "search",
    react: "🔍",
    filename: __filename
}, async (conn, mek, m, { from, reply, args, q, pushname }) => {
    try {
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME;
        const messageType = config.MESSAGE_TYPE || 'button';

        if (!q) {
            return reply(`❌ *Please provide a search query!*\n\n*Usage:* ${prefix}phs <search-query>\n\n*Example:* ${prefix}phs sri lanka`);
        }

        const searchQuery = q.trim();
        await reply(`🔍 *Searching for:* "${searchQuery}"\n\n⏳ Please wait...`);

        // Use the API endpoint
        const apiUrl = `https://sriapi.koyeb.app/search/phs?q=${encodeURIComponent(searchQuery)}`;
        
        console.log(`[PHS] Fetching: ${apiUrl}`);
        
        let response;
        try {
            response = await fetchJson(apiUrl);
        } catch (apiError) {
            console.error('[PHS] API Error:', apiError);
            return reply(`❌ *API Error!*\n\nFailed to fetch search results. Please try again later.`);
        }

        // Parse response
        let results = [];
        
        if (response && response.status === true && response.result) {
            if (response.result.data && response.result.data.results) {
                results = response.result.data.results;
            } else if (response.result.results) {
                results = response.result.results;
            } else if (Array.isArray(response.result)) {
                results = response.result;
            }
        } else if (response && Array.isArray(response)) {
            results = response;
        }

        if (!results || results.length === 0) {
            return reply(`❌ *No results found!*\n\nNo videos found for "${searchQuery}". Try a different query.`);
        }

        console.log(`[PHS] Found ${results.length} results`);

        // Limit to top 10 results for buttons, 20 for text
        const maxResults = messageType === 'button' ? 10 : 20;
        const displayResults = results.slice(0, maxResults);
        const totalResults = response.result?.data?.count || results.length;

        // Build info text
        let infoText = `🔍 *PHS Search Results*\n\n`;
        infoText += `📌 *Query:* ${searchQuery}\n`;
        infoText += `📊 *Total Found:* ${totalResults}\n`;
        infoText += `📋 *Showing:* Top ${displayResults.length} results\n\n`;
        infoText += `━━━━━━━━━━━━━━━━━━\n\n`;

        if (messageType === 'text') {
            // TEXT MODE
            displayResults.forEach((video, index) => {
                const num = index + 1;
                infoText += `${num}. *${video.title || 'No Title'}*\n`;
                infoText += `   👤 ${video.channel || 'Unknown'} • 👁️ ${formatViews(video.views)} • ⏱️ ${formatDuration(video.duration)}\n`;
                infoText += `   🔗 ${video.url || 'N/A'}\n\n`;
            });

            infoText += `━━━━━━━━━━━━━━━━━━\n\n`;
            infoText += `📥 *Reply with the number* to get video details!\n`;
            infoText += `⏳ *Active for 3 minutes*\n`;
            infoText += `${config.FOOTER || "POWERED BY SRI-BOT 🇱🇰"}`;

            // Use first video's thumbnail as main image, or send text only
            const mainThumb = displayResults[0]?.thumb || displayResults[0]?.preview || '';
            const thumbValid = await isValidImageUrl(mainThumb);

            let sentMsg;
            if (thumbValid) {
                try {
                    sentMsg = await conn.sendMessage(from, { 
                        image: { url: mainThumb },
                        caption: infoText
                    }, { quoted: mek });
                } catch (imgError) {
                    console.log(`[PHS] Main thumbnail failed, sending text only: ${imgError.message}`);
                    sentMsg = await conn.sendMessage(from, { text: infoText }, { quoted: mek });
                }
            } else {
                sentMsg = await conn.sendMessage(from, { text: infoText }, { quoted: mek });
            }

            const messageID = sentMsg.key.id;
            
            // Store search results for reply handler
            global.phsSearches.set(messageID, displayResults);

            const replyHandler = createReplyHandler(conn, messageID, from, mek, displayResults);
            global.phsReplyHandlers.set(messageID, replyHandler);
            conn.ev.on('messages.upsert', replyHandler);

            // Timeout - remove handler after 3 minutes
            setTimeout(() => {
                if (global.phsReplyHandlers.has(messageID)) {
                    const handler = global.phsReplyHandlers.get(messageID);
                    conn.ev.off('messages.upsert', handler);
                    global.phsReplyHandlers.delete(messageID);
                    global.phsSearches.delete(messageID);
                }
            }, 180000);

        } else {
            // BUTTON MODE
            const btn = new Button();
            
            // Set thumbnail image from first result (only if valid)
            const mainThumb = displayResults[0]?.thumb || displayResults[0]?.preview || '';
            const thumbValid = await isValidImageUrl(mainThumb);
            
            if (thumbValid) {
                try {
                    await btn.setImage(mainThumb);
                } catch (e) {
                    console.log(`[PHS] Button image set failed, continuing without image: ${e.message}`);
                }
            }
            
            btn.setTitle("🔍 PHS Search Results");
            btn.setBody(infoText + `Click on a video below to get details!`);
            btn.setFooter(`Powered by ${botName} 🇱🇰`);

            btn.addSelection("📋 Select a Video");
            btn.makeSection("🎬 Search Results", `Query: ${searchQuery}`);

            const baseId = Date.now().toString();

            displayResults.forEach((video, index) => {
                const num = index + 1;
                const rowId = `phs_${baseId}_${num}`;
                
                // Store each video data with unique ID
                global.phsSearches.set(rowId, video);

                const title = video.title || 'No Title';
                const description = `${video.channel || 'Unknown'} • ${formatViews(video.views)} • ${formatDuration(video.duration)}`;
                
                // Truncate title if too long
                const displayTitle = title.length > 25 ? title.substring(0, 22) + '...' : title;
                
                btn.makeRow(
                    `${num}.`, 
                    displayTitle, 
                    description, 
                    rowId
                );
            });

            btn.addUrl("🔗 Open Search", `https://sriapi.koyeb.app/search/phs?q=${encodeURIComponent(searchQuery)}`);
            
            await btn.send(from, conn, mek);
        }

    } catch (error) {
        console.error("[PHS] Error:", error);
        reply(`❌ *Error!*\n\n${error.message}`);
    }
});

// Button handler for PHS video selection
cmd({
    pattern: "phs_",
    on: "body",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, reply, body }) => {
    if (!body || !global.phsSearches || !body.startsWith('phs_')) return;
    
    const videoData = global.phsSearches.get(body);
    if (!videoData) return;
    
    console.log(`[PHS] Button clicked: ${body}`);
    
    await sendVideoInfo(conn, mek, from, reply, videoData, 0, body);
});
