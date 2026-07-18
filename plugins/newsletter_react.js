const { getContentType } = require('@whiskeysockets/baileys');

// ============================================
// NEWSLETTER AUTO REACT PLUGIN
// React to all messages in configured newsletter channel
// ============================================

const NEWSLETTER_REACT_EMOJIS = ['❤️', '💛', '💚', '🩵', '💙', '💜', '🧡', '💖', '💗', '💝'];

function getRandomReact() {
    return NEWSLETTER_REACT_EMOJIS[Math.floor(Math.random() * NEWSLETTER_REACT_EMOJIS.length)];
}

module.exports = (conn) => {
    
    conn.ev.on('messages.upsert', async (mek) => {
        try {
            const msg = mek.messages[0];
            if (!msg.message) return;

            // Get current config for this bot number
            const config = require('../config');
            const currentNumber = global.currentBotNumber || '';
            const currentConfig = config.getConfigSync ? config.getConfigSync(currentNumber) : config;
            
            const newsletterId = currentConfig.NEWS_LETTER;
            
            // Skip if no newsletter configured
            if (!newsletterId || newsletterId === '120363165918432989@newsletter') {
                return;
            }

            // Check if message is from the configured newsletter
            const remoteJid = msg.key.remoteJid;
            const participant = msg.key.participant;
            
            // Newsletter messages come with remoteJid as the newsletter ID
            // or participant containing the newsletter ID
            const isNewsletterMessage = 
                remoteJid === newsletterId || 
                remoteJid === 'status@broadcast' && participant === newsletterId ||
                remoteJid?.includes('newsletter');

            if (!isNewsletterMessage) return;

            // Skip if it's a reaction message (to avoid infinite loop)
            if (msg.message?.reactionMessage) return;
            
            // Skip bot's own reactions
            if (msg.key.fromMe) return;

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
            
            console.log(`[NEWSLETTER_REACT] Reacted with ${emoji} to message in ${newsletterId}`);

        } catch (error) {
            console.error('[NEWSLETTER_REACT] Error:', error.message);
        }
    });
    
    console.log('[PLUGIN] Newsletter Auto React loaded ✅');
};
