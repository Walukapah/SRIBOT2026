const { cmd } = require("../command");
const config = require("../config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

cmd({
  pattern: "vv",
  alias: ["viewonce", "vo"],
  react: "👁️",
  desc: "Retrieve View Once message",
  category: "owner",
  filename: __filename
}, async (client, message, match, { from, isOwner }) => {
  try {
    if (!isOwner) {
      return client.sendMessage(from, { text: "📛 Owner command only!" }, { quoted: message });
    }

    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
      return client.sendMessage(from, { text: "⚠️ Reply to a *View Once* message!" }, { quoted: message });
    }

    // Get bot number
    const botNumber = client.user.id.split(':')[0] + '@s.whatsapp.net';

    // Detect type (image / video / audio)
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
      });
      // Confirm to user
      await client.sendMessage(from, { text: "✅ ViewOnce image sent to bot number!" }, { quoted: message });
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
      });
      // Confirm to user
      await client.sendMessage(from, { text: "✅ ViewOnce video sent to bot number!" }, { quoted: message });
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
      });
      // Confirm to user
      await client.sendMessage(from, { text: "✅ ViewOnce audio sent to bot number!" }, { quoted: message });
    } else {
      await client.sendMessage(from, { text: "❌ Only image/video/audio view once supported!" }, { quoted: message });
    }

  } catch (e) {
    console.error("vv plugin error:", e);
    await client.sendMessage(from, { text: "❌ Error: " + e.message }, { quoted: message });
  }
});

// Handle sticker reply to viewonce messages
cmd({
  pattern: "sticker_reply_viewonce",
  on: "sticker",
  dontAddCommandList: true,
  filename: __filename
}, async (client, message, match, { from }) => {
  try {
    // Check if this is a reply to a viewonce message
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return;
    
    // Check if quoted message is a viewonce message
    const isViewOnce = quoted.imageMessage?.viewOnce || 
                       quoted.videoMessage?.viewOnce || 
                       quoted.audioMessage?.viewOnce;
    
    if (!isViewOnce) return;

    // Get bot number
    const botNumber = client.user.id.split(':')[0] + '@s.whatsapp.net';

    // Download the viewonce content based on type
    if (quoted.imageMessage) {
      const buffer = await downloadMediaMessage(
        { message: { imageMessage: quoted.imageMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      await client.sendMessage(botNumber, {
        image: buffer,
        caption: "👁️ ViewOnce Revealed (via sticker reply)"
      });
      await client.sendMessage(from, { text: "✅ ViewOnce image sent to bot number!" }, { quoted: message });
    } else if (quoted.videoMessage) {
      const buffer = await downloadMediaMessage(
        { message: { videoMessage: quoted.videoMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      await client.sendMessage(botNumber, {
        video: buffer,
        caption: "👁️ ViewOnce Revealed (via sticker reply)"
      });
      await client.sendMessage(from, { text: "✅ ViewOnce video sent to bot number!" }, { quoted: message });
    } else if (quoted.audioMessage) {
      const buffer = await downloadMediaMessage(
        { message: { audioMessage: quoted.audioMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      await client.sendMessage(botNumber, {
        audio: buffer,
        mimetype: "audio/mp4",
        ptt: quoted.audioMessage.ptt || false
      });
      await client.sendMessage(from, { text: "✅ ViewOnce audio sent to bot number!" }, { quoted: message });
    }
  } catch (e) {
    console.error("sticker reply viewonce error:", e);
  }
});
