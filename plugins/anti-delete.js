const config = require('../config');
const { cmd } = require('../command');

cmd({
  on: "body"
},    
async (conn, mek, m, { from, isGroup }) => {       

    try {
        if (config.ANTI_DELETE !== 'true') return;

        if (!mek.message?.protocolMessage) return;

        const prot = mek.message.protocolMessage;
        if (prot.type !== 0) return; // 0 = REVOKE (delete)

        const chat = prot.key.remoteJid;
        const user = prot.key.participant || mek.key.participant || mek.key.remoteJid;
        const username = user.split("@")[0];

        // Deleted message key
        const deletedKey = prot.key;

        // Load original deleted message from store
        let deletedMsg;
        try {
            deletedMsg = await conn.loadMessage(chat, deletedKey.id); 
        } catch {
            deletedMsg = null;
        }

        // Notify + resend deleted message
        if (isGroup) {
            await conn.sendMessage(chat, {
                text: `🚨 *ANTI DELETE ACTIVE!*\n👤 @${username} deleted a message.\n⏰ Time: ${new Date().toLocaleString()}`,
                mentions: [user]
            });

            if (deletedMsg?.message) {
                await conn.sendMessage(chat, { 
                    forward: deletedMsg, 
                    quoted: deletedMsg 
                });
            }
        } else {
            await conn.sendMessage(chat, {
                text: `🚨 *ANTI DELETE ACTIVE!*\nYou deleted a message.\n⏰ Time: ${new Date().toLocaleString()}`
            });

            if (deletedMsg?.message) {
                await conn.sendMessage(chat, { 
                    forward: deletedMsg, 
                    quoted: deletedMsg 
                });
            }
        }

    } catch (e) {
        console.log("ANTI_DELETE ERROR:", e);
    }
});
