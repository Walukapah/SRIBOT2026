const { cmd } = require("../command");
const config = require("../config");
const { downloadMediaMessage } = require("./lib/msg");

module.exports = {
    on: "body",
    filename: __filename,
    async function(conn, mek, m, { from, sender, isGroup, reply }) {
        try {
            // Check if anti-delete is enabled
            if (config.ANTI_DELETE !== "true") return;
            
            // Check if this is a message deletion
            if (!mek.message?.protocolMessage) return;
            
            const prot = mek.message.protocolMessage;
            if (prot.type !== "REVOKE") return;

            const chat = prot.key.remoteJid;
            const user = prot.key.participant || mek.key.participant || mek.key.remoteJid;
            const username = user.split("@")[0];

            // We can't retrieve the actual deleted content without storing messages,
            // but we can notify about the deletion
            if (isGroup) {
                await conn.sendMessage(chat, {
                    text: `🚨 *Anti Delete Active!*\n👤 @${username} deleted a message.\n⏰ Time: ${new Date().toLocaleString()}`,
                    mentions: [user]
                });
            } else {
                await conn.sendMessage(chat, {
                    text: `🚨 *Anti Delete Active!*\nYou deleted a message.\n⏰ Time: ${new Date().toLocaleString()}`
                });
            }

        } catch (err) {
            console.error("Anti Delete Error:", err);
        }
    }
};
