const config = require("../config");
const { cmd } = require("../command");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

cmd({
  on: "messages.upsert",
  filename: __filename
}, async (client, update) => {
  try {
    if (!config.ANTI_DELETE) return;

    const m = update.messages?.[0];
    if (!m?.message?.protocolMessage) return;

    const prot = m.message.protocolMessage;

    // Check if revoke (deleted)
    if (prot.type !== "REVOKE") return;

    const chat = prot.key.remoteJid;
    const msgId = prot.key.id;
    const user = prot.key.participant || m.key.participant || m.key.remoteJid;

    // get original deleted msg
    const deletedMsg = await client.loadMessage(chat, msgId);
    if (!deletedMsg?.message) return;

    const msg = deletedMsg.message;

    // ---- Text
    if (msg.conversation || msg.extendedTextMessage?.text) {
      const text = msg.conversation || msg.extendedTextMessage.text;
      await client.sendMessage(chat, {
        text: `🚨 *Anti Delete Active!*\n👤 @${user.split("@")[0]} deleted:\n\n${text}`,
        mentions: [user]
      });
    }
    // ---- Media (image/video/audio/doc/sticker)
    else {
      const buffer = await downloadMediaMessage(deletedMsg, "buffer", {}, { reuploadRequest: client.updateMediaMessage });
      if (msg.imageMessage) {
        await client.sendMessage(chat, {
          image: buffer,
          caption: `🚨 *Anti Delete Active!*\n👤 @${user.split("@")[0]} tried to delete this.`,
          mentions: [user]
        });
      } else if (msg.videoMessage) {
        await client.sendMessage(chat, {
          video: buffer,
          caption: `🚨 *Anti Delete Active!*\n👤 @${user.split("@")[0]} tried to delete this.`,
          mentions: [user]
        });
      } else if (msg.audioMessage) {
        await client.sendMessage(chat, {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: msg.audioMessage.ptt || false
        }, { quoted: m });
      } else if (msg.stickerMessage) {
        await client.sendMessage(chat, { sticker: buffer }, { quoted: m });
      } else if (msg.documentMessage) {
        await client.sendMessage(chat, {
          document: buffer,
          mimetype: msg.documentMessage.mimetype,
          fileName: msg.documentMessage.fileName || "document"
        });
      }
    }

  } catch (e) {
    console.error("Anti Delete Error:", e);
  }
});
