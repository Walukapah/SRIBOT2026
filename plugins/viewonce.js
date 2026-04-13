const { cmd } = require("../command");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

// Sticker handler for viewonce reveal
// When user replies to a viewonce message with any sticker, it will be revealed

cmd({
  on: "sticker",
  pattern: "viewonce_sticker_handler",
  desc: "Reveal View Once message when sticker is sent as reply",
  category: "owner",
  filename: __filename
}, async (client, message, match, { from, sender, isOwner }) => {
  try {
    // Check if message is a reply to a viewonce message
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
      return; // Not a reply, ignore
    }

    // Check if quoted message is a viewonce message
    const isViewOnce = quoted.imageMessage?.viewOnce === true || 
                       quoted.videoMessage?.viewOnce === true ||
                       quoted.audioMessage?.viewOnce === true;
    
    if (!isViewOnce) {
      return; // Not a viewonce message, ignore sticker
    }

    // Get bot number
    const botNumber = client.user.id.split(':')[0] + '@s.whatsapp.net';

    // React to the sticker
    await client.sendMessage(from, { 
      react: { text: "👁️", key: message.key } 
    });

    // Detect type (image / video / audio)
    if (quoted.imageMessage) {
      const buffer = await downloadMediaMessage(
        { message: { imageMessage: quoted.imageMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      // Send to bot number (owner)
      await client.sendMessage(botNumber, {
        image: buffer,
        caption: quoted.imageMessage.caption || "👁️ ViewOnce Revealed\n\n📩 From: " + sender.split('@')[0]
      }, { quoted: message });
      
      // Confirm to user
      await client.sendMessage(from, {
        text: "✅ *ViewOnce Image* sent to owner! 👁️"
      }, { quoted: message });
      
    } else if (quoted.videoMessage) {
      const buffer = await downloadMediaMessage(
        { message: { videoMessage: quoted.videoMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      // Send to bot number (owner)
      await client.sendMessage(botNumber, {
        video: buffer,
        caption: quoted.videoMessage.caption || "👁️ ViewOnce Revealed\n\n📩 From: " + sender.split('@')[0]
      }, { quoted: message });
      
      // Confirm to user
      await client.sendMessage(from, {
        text: "✅ *ViewOnce Video* sent to owner! 👁️"
      }, { quoted: message });
      
    } else if (quoted.audioMessage) {
      const buffer = await downloadMediaMessage(
        { message: { audioMessage: quoted.audioMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      // Send to bot number (owner)
      await client.sendMessage(botNumber, {
        audio: buffer,
        mimetype: "audio/mp4",
        ptt: quoted.audioMessage.ptt || false
      }, { quoted: message });
      
      // Send info text
      await client.sendMessage(botNumber, {
        text: "👁️ ViewOnce Audio Revealed\n\n📩 From: " + sender.split('@')[0]
      });
      
      // Confirm to user
      await client.sendMessage(from, {
        text: "✅ *ViewOnce Audio* sent to owner! 👁️"
      }, { quoted: message });
    }

  } catch (e) {
    console.error("viewonce sticker handler error:", e);
    await client.sendMessage(from, { text: "❌ Error: " + e.message }, { quoted: message });
  }
});

// Keep the old .vv command as backup/alternative
cmd({
  pattern: "vv",
  alias: ["viewonce", "vo"],
  react: "👁️",
  desc: "Retrieve View Once message (Alternative to sticker method)",
  category: "owner",
  filename: __filename
}, async (client, message, match, { from, sender, senderNumber }) => {
  try {
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
    } else {
      await client.sendMessage(from, { text: "❌ Only image/video/audio view once supported!" }, { quoted: message });
    }

  } catch (e) {
    console.error("vv plugin error:", e);
    await client.sendMessage(from, { text: "❌ Error: " + e.message }, { quoted: message });
  }
});
