const { cmd } = require("../command");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

const viewOnceEmojis = ['👁️', '😹', '🥲', '😭', '😂', '❤️'];

viewOnceEmojis.forEach(emoji => {
  cmd({
    pattern: emoji,
    alias: emoji === '👁️' ? ["vv", "viewonce", "vo"] : [],
    react: emoji,
    desc: "Retrieve View Once message",
    category: "owner",
    filename: __filename
  }, async (client, message, match, { from, senderNumber }) => {
    try {
      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) {
        return client.sendMessage(from, { text: "⚠️ Reply to a *View Once* message!" }, { quoted: message });
      }

      // Get bot number
      const botNumber = client.user.id.split(':')[0] + '@s.whatsapp.net';

      // Detect type (image / video / audio / sticker)
      if (quoted.imageMessage) {
        const buffer = await downloadMediaMessage(
          { message: { imageMessage: quoted.imageMessage } },
          "buffer",
          {},
          { reuploadRequest: client.updateMediaMessage }
        );
        // Send to bot number
        await client.sendMessage(botNumber, {
          image: buffer,
          caption: quoted.imageMessage.caption || "👁️ ViewOnce Revealed"
        }, { quoted: message });
      } else if (quoted.videoMessage) {
        const buffer = await downloadMediaMessage(
          { message: { videoMessage: quoted.videoMessage } },
          "buffer",
          {},
          { reuploadRequest: client.updateMediaMessage }
        );
        // Send to bot number
        await client.sendMessage(botNumber, {
          video: buffer,
          caption: quoted.videoMessage.caption || "👁️ ViewOnce Revealed"
        }, { quoted: message });
      } else if (quoted.audioMessage) {
        const buffer = await downloadMediaMessage(
          { message: { audioMessage: quoted.audioMessage } },
          "buffer",
          {},
          { reuploadRequest: client.updateMediaMessage }
        );
        // Send to bot number
        await client.sendMessage(botNumber, {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: quoted.audioMessage.ptt || false
        }, { quoted: message });
      } else if (quoted.stickerMessage) {
        const buffer = await downloadMediaMessage(
          { message: { stickerMessage: quoted.stickerMessage } },
          "buffer",
          {},
          { reuploadRequest: client.updateMediaMessage }
        );
        // Send to bot number
        await client.sendMessage(botNumber, {
          sticker: buffer
        }, { quoted: message });
      } else {
        await client.sendMessage(from, { text: "❌ Only image/video/audio/sticker view once supported!" }, { quoted: message });
      }

    } catch (e) {
      console.error("vv plugin error:", e);
      await client.sendMessage(from, { text: "❌ Error: " + e.message }, { quoted: message });
    }
  });
});
