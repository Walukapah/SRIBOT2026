// ============================================
// NEWSLETTER AUTO REACT PLUGIN
// React to all messages in configured newsletter channel
// ============================================

const { getContentType } = require('@whiskeysockets/baileys');

const NEWSLETTER_REACT_EMOJIS = ['❤️', '💛', '💚', '🩵', '💙', '💜', '🧡', '💖', '💗', '💝'];

function getRandomReact() {
    return NEWSLETTER_REACT_EMOJIS[Math.floor(Math.random() * NEWSLETTER_REACT_EMOJIS.length)];
}

module.exports = (conn) => {
    
    conn.ev.on('messages.upsert', async (mek) => {
        try {
            const msg = mek.messages[0];
            if (!msg.message) return;

            // Skip if it's a reaction message (to avoid infinite loop)
            if (msg.message?.reactionMessage) return;
            
            // Skip bot's own messages
            if (msg.key.fromMe) return;

            // Get current config for this bot number
            const config = require('../config');
            const currentNumber = global.currentBotNumber || '';
            const currentConfig = config.getConfigSync ? config.getConfigSync(currentNumber) : config;
            
            const newsletterId = currentConfig.NEWS_LETTER;
            
            // Skip if no newsletter configured or it's the default
            if (!newsletterId || newsletterId === '120363165918432989@newsletter') {
                return;
            }

            // Check if message is from the configured newsletter
            const remoteJid = msg.key.remoteJid;
            
            // Newsletter messages: remoteJid ends with @newsletter
            // AND matches the configured newsletter ID
            const isNewsletterMessage = remoteJid && remoteJid.endsWith('@newsletter');
            
            if (!isNewsletterMessage) return;
            
            // Check if this is the configured newsletter
            if (remoteJid !== newsletterId) {
                return;
            }

            // Get random emoji
            const emoji = getRandomReact();
            
            // React to the message
            await conn.sendMessage(
                remoteJid,
                {
                    react: {
                        text: emoji,
                        key: msg.key
                    }
                }
            );
            
            console.log(`[NEWSLETTER_REACT] ✅ Reacted with ${emoji} to message ${msg.key.id} in ${newsletterId}`);

        } catch (error) {
            console.error('[NEWSLETTER_REACT] Error:', error.message);
        }
    });
    
    console.log('[PLUGIN] Newsletter Auto React loaded ✅');
};
