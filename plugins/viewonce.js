const { cmd } = require("../command");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

const viewOnceEmojis = ['👁️', '😹', '🥲', '😭', '😂', '❤️'];

viewOnceEmojis.forEach(emoji => {
  cmd({
    pattern: emoji,
    on: "body",  // IMPORTANT: Use body handler instead of command
    alias: emoji === '👁️' ? ["vv", "viewonce", "vo"] : [],
    react: emoji,
    desc: "Retrieve View Once message",
    category: "owner",
    filename: __filename
  }, async (conn, mek, m, { from, reply }) => {
    try {
      // Check if this is a reply to a message
      const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) {
        return reply("⚠️ Reply to a *View Once* message with this emoji!");
      }

      // Get bot number
      const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';

      // Detect type (image / video / audio / sticker)
      if (quoted.imageMessage) {
        const buffer = await downloadMediaMessage(
          { message: { imageMessage: quoted.imageMessage } },
          "buffer",
          {},
          { reuploadRequest: conn.updateMediaMessage }
        );
        // Send to bot number
        await conn.sendMessage(botNumber, {
          image: buffer,
          caption: quoted.imageMessage.caption || "👁️ ViewOnce Revealed"
        }, { quoted: mek });

        await reply(`✅ ViewOnce image sent to bot PM!`);

      } else if (quoted.videoMessage) {
        const buffer = await downloadMediaMessage(
          { message: { videoMessage: quoted.videoMessage } },
          "buffer",
          {},
          { reuploadRequest: conn.updateMediaMessage }
        );
        // Send to bot number
        await conn.sendMessage(botNumber, {
          video: buffer,
          caption: quoted.videoMessage.caption || "👁️ ViewOnce Revealed"
        }, { quoted: mek });

        await reply(`✅ ViewOnce video sent to bot PM!`);

      } else if (quoted.audioMessage) {
        const buffer = await downloadMediaMessage(
          { message: { audioMessage: quoted.audioMessage } },
          "buffer",
          {},
          { reuploadRequest: conn.updateMediaMessage }
        );
        // Send to bot number
        await conn.sendMessage(botNumber, {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: quoted.audioMessage.ptt || false
        }, { quoted: mek });

        await reply(`✅ ViewOnce audio sent to bot PM!`);

      } else if (quoted.stickerMessage) {
        const buffer = await downloadMediaMessage(
          { message: { stickerMessage: quoted.stickerMessage } },
          "buffer",
          {},
          { reuploadRequest: conn.updateMediaMessage }
        );
        // Send to bot number
        await conn.sendMessage(botNumber, {
          sticker: buffer
        }, { quoted: mek });

        await reply(`✅ ViewOnce sticker sent to bot PM!`);

      } else {
        await reply("❌ Only image/video/audio/sticker view once supported!");
      }

    } catch (e) {
      console.error("vv plugin error:", e);
      await reply("❌ Error: " + e.message);
    }
  });
});

// Also add .vv command support with prefix
viewOnceEmojis.forEach(emoji => {
  if (emoji === '👁️') {
    cmd({
      pattern: "vv",
      alias: ["viewonce", "vo"],
      react: "👁️",
      desc: "Retrieve View Once message",
      category: "owner",
      filename: __filename
    }, async (conn, mek, m, { from, reply }) => {
      try {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) {
          return reply("⚠️ Reply to a *View Once* message!");
        }

        const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';

        if (quoted.imageMessage) {
          const buffer = await downloadMediaMessage(
            { message: { imageMessage: quoted.imageMessage } },
            "buffer",
            {},
            { reuploadRequest: conn.updateMediaMessage }
          );
          await conn.sendMessage(botNumber, {
            image: buffer,
            caption: quoted.imageMessage.caption || "👁️ ViewOnce Revealed"
          }, { quoted: mek });
        } else if (quoted.videoMessage) {
          const buffer = await downloadMediaMessage(
            { message: { videoMessage: quoted.videoMessage } },
            "buffer",
            {},
            { reuploadRequest: conn.updateMediaMessage }
          );
          await conn.sendMessage(botNumber, {
            video: buffer,
            caption: quoted.videoMessage.caption || "👁️ ViewOnce Revealed"
          }, { quoted: mek });
        } else if (quoted.audioMessage) {
          const buffer = await downloadMediaMessage(
            { message: { audioMessage: quoted.audioMessage } },
            "buffer",
            {},
            { reuploadRequest: conn.updateMediaMessage }
          );
          await conn.sendMessage(botNumber, {
            audio: buffer,
            mimetype: "audio/mp4",
            ptt: quoted.audioMessage.ptt || false
          }, { quoted: mek });
        } else if (quoted.stickerMessage) {
          const buffer = await downloadMediaMessage(
            { message: { stickerMessage: quoted.stickerMessage } },
            "buffer",
            {},
            { reuploadRequest: conn.updateMediaMessage }
          );
          await conn.sendMessage(botNumber, {
            sticker: buffer
          }, { quoted: mek });
        } else {
          await reply("❌ Only image/video/audio/sticker view once supported!");
        }

      } catch (e) {
        console.error("vv plugin error:", e);
        await reply("❌ Error: " + e.message);
      }
    });
  }
});
