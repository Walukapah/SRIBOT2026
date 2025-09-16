const config = require("../config");
const { cmd } = require("../command");

cmd({
  on: "message.delete",
  filename: __filename
}, async (client, message) => {
  try {
    if (!config.ANTI_DELETE) return; // Anti-delete off නම් return

    const deleted = message.msg;
    if (!deleted) return;

    let user = message.participant || message.key.participant || message.key.remoteJid;

    // Text
    if (deleted.conversation || deleted.extendedTextMessage?.text) {
      let text = deleted.conversation || deleted.extendedTextMessage.text;
      await client.sendMessage(message.key.remoteJid, {
        text: `🚨 *Anti Delete Active!* \n\n👤 User: @${user.split("@")[0]} \n\n📝 Message:\n${text}`,
        mentions: [user]
      });
    }

    // Image
    else if (deleted.imageMessage) {
      let buffer = await client.downloadMediaMessage(message);
      await client.sendMessage(message.key.remoteJid, {
        image: buffer,
        caption: `🚨 *Anti Delete Active!* \n\n👤 User: @${user.split("@")[0]}`,
        mentions: [user]
      });
    }

    // Video
    else if (deleted.videoMessage) {
      let buffer = await client.downloadMediaMessage(message);
      await client.sendMessage(message.key.remoteJid, {
        video: buffer,
        caption: `🚨 *Anti Delete Active!* \n\n👤 User: @${user.split("@")[0]}`,
        mentions: [user]
      });
    }

    // Audio
    else if (deleted.audioMessage) {
      let buffer = await client.downloadMediaMessage(message);
      await client.sendMessage(message.key.remoteJid, {
        audio: buffer,
        mimetype: "audio/mp4",
        ptt: deleted.audioMessage.ptt || false
      });
      await client.sendMessage(message.key.remoteJid, {
        text: `🚨 *Anti Delete Active!* \n\n👤 User: @${user.split("@")[0]}`,
        mentions: [user]
      });
    }

    // Sticker
    else if (deleted.stickerMessage) {
      let buffer = await client.downloadMediaMessage(message);
      await client.sendMessage(message.key.remoteJid, { sticker: buffer });
      await client.sendMessage(message.key.remoteJid, {
        text: `🚨 *Anti Delete Active!* \n\n👤 User: @${user.split("@")[0]}`,
        mentions: [user]
      });
    }

    // Document
    else if (deleted.documentMessage) {
      let buffer = await client.downloadMediaMessage(message);
      await client.sendMessage(message.key.remoteJid, {
        document: buffer,
        mimetype: deleted.documentMessage.mimetype,
        fileName: deleted.documentMessage.fileName || "document"
      });
      await client.sendMessage(message.key.remoteJid, {
        text: `🚨 *Anti Delete Active!* \n\n👤 User: @${user.split("@")[0]}`,
        mentions: [user]
      });
    }
  } catch (e) {
    console.error("Anti Delete Error:", e);
  }
});
