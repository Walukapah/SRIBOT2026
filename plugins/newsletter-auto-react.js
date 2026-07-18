// =======================================
// NEWSLETTER AUTO REACT - FIXED VERSION
// Uses channel link + server_id format like .chr plugin
// =======================================

const NEWSLETTER_REACT_EMOJIS = ['❤️', '💛', '💚', '🩵', '💙', '💜', '🧡', '💖', '💗', '💝'];

// Store channel links mapped to newsletter IDs
const channelLinkMap = new Map();

// Parse channel link to get ID
function getChannelIdFromLink(link) {
    if (!link) return null;
    const match = link.match(/whatsapp\.com\/channel\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

// Build full message link
function buildMessageLink(channelLink, serverId) {
    if (!channelLink || !serverId) return null;
    const baseLink = channelLink.replace(/\/$/, ''); // Remove trailing slash
    return `${baseLink}/${serverId}`;
}

module.exports = (conn) => {
    
    // Auto-join channel on startup if configured
    conn.ev.on('connection.open', async () => {
        try {
            const config = require('../config');
            const currentNumber = global.currentBotNumber || '';
            const currentConfig = config.getConfigSync ? config.getConfigSync(currentNumber) : config;
            
            const channelLink = currentConfig.NEWS_LETTER_LINK;
            if (channelLink && typeof conn.newsletterFollow === 'function') {
                const channelId = getChannelIdFromLink(channelLink);
                if (channelId) {
                    try {
                        const channelMeta = await conn.newsletterMetadata("invite", channelId);
                        if (channelMeta && channelMeta.id) {
                            await conn.newsletterFollow(channelMeta.id);
                            channelLinkMap.set(channelMeta.id, channelLink);
                            console.log(`[NEWSLETTER_AUTO] ✅ Joined channel: ${channelMeta.name || channelId}`);
                        }
                    } catch (e) {
                        console.log(`[NEWSLETTER_AUTO] Join error: ${e.message}`);
                    }
                }
            }
        } catch (e) {
            console.error('[NEWSLETTER_AUTO] Startup error:', e.message);
        }
    });
    
    conn.ev.on('messages.upsert', async (mek) => {
        try {
            const msg = mek.messages[0];
            if (!msg.message) return;
            if (msg.message?.reactionMessage) return;
            if (msg.key.fromMe) return;

            const config = require('../config');
            const currentNumber = global.currentBotNumber || '';
            const currentConfig = config.getConfigSync ? config.getConfigSync(currentNumber) : config;
            
            const channelLink = currentConfig.NEWS_LETTER_LINK;
            if (!channelLink) return;

            const from = msg.key.remoteJid;
            if (!from || !from.endsWith('@newsletter')) return;

            // Get server_id from message
            const serverId = msg.key.server_id;
            if (!serverId) {
                console.log(`[NEWSLETTER_AUTO] No server_id found for message ${msg.key.id}`);
                return;
            }

            // Get channel ID from link
            const channelId = getChannelIdFromLink(channelLink);
            if (!channelId) {
                console.log(`[NEWSLETTER_AUTO] Invalid channel link: ${channelLink}`);
                return;
            }

            // Get channel metadata to verify
            let targetJid = from;
            let actualChannelId = channelId;
            
            try {
                const channelMeta = await conn.newsletterMetadata("invite", channelId);
                if (channelMeta && channelMeta.id) {
                    targetJid = channelMeta.id;
                    actualChannelId = getChannelIdFromLink(channelLink);
                    channelLinkMap.set(targetJid, channelLink);
                }
            } catch (e) {
                console.log(`[NEWSLETTER_AUTO] Metadata error: ${e.message}`);
            }

            // Check if this is our configured channel
            if (from !== targetJid) {
                console.log(`[NEWSLETTER_AUTO] Channel mismatch: from=${from}, target=${targetJid}`);
                return;
            }

            // Build full message link like .chr plugin
            const messageLink = buildMessageLink(channelLink, serverId);
            if (!messageLink) {
                console.log(`[NEWSLETTER_AUTO] Could not build message link`);
                return;
            }

            console.log(`[NEWSLETTER_AUTO] Message link: ${messageLink}`);

            // Get random emoji
            const emoji = NEWSLETTER_REACT_EMOJIS[Math.floor(Math.random() * NEWSLETTER_REACT_EMOJIS.length)];

            // React using same method as .chr plugin
            if (typeof conn.newsletterReactMessage === 'function') {
                // Parse link like .chr plugin does
                const linkParts = messageLink.split('/');
                const msgChannelId = linkParts[4]; // Channel ID from link
                const msgId = linkParts[5] || serverId; // Message ID or server_id

                console.log(`[NEWSLETTER_AUTO] Reacting: channelId=${msgChannelId}, msgId=${msgId}, emoji=${emoji}`);

                try {
                    // Get metadata first (like .chr plugin)
                    const meta = await conn.newsletterMetadata("invite", msgChannelId);
                    if (meta && meta.id) {
                        await conn.newsletterReactMessage(meta.id, msgId, emoji);
                        console.log(`[NEWSLETTER_REACT] ✅ Reacted with ${emoji} to message ${msgId} in ${meta.id}`);
                    }
                } catch (reactErr) {
                    console.error(`[NEWSLETTER_REACT] React error: ${reactErr.message}`);
                    
                    // Fallback: try direct react
                    try {
                        await conn.newsletterReactMessage(from, msgId, emoji);
                        console.log(`[NEWSLETTER_REACT] ✅ Fallback react with ${emoji}`);
                    } catch (fallbackErr) {
                        console.error(`[NEWSLETTER_REACT] Fallback error: ${fallbackErr.message}`);
                    }
                }
            } else {
                console.log('[NEWSLETTER_REACT] ❌ newsletterReactMessage not available');
            }

        } catch (error) {
            console.error('[NEWSLETTER_AUTO] Error:', error.message);
        }
    });
    
    console.log('[PLUGIN] Newsletter Auto React (Link-based) loaded ✅');
};
