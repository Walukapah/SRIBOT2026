const { cmd } = require("../command");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

// Sticker handler for viewonce reveal
// When user replies to a viewonce message with any sticker, it will be revealed

// STICKER HANDLER
cmd({
  on: "sticker",
  pattern: "viewonce_sticker_reveal",
  desc: "Reveal ViewOnce when sticker is replied to it",
  filename: __filename
}, async (client, message, match, { from, sender, senderNumber }) => {
  try {
    console.log("[VIEWONCE STICKER] Sticker received from:", senderNumber);
    
    // Check multiple possible quoted message locations
    let quoted = null;
    
    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      quoted = message.message.extendedTextMessage.contextInfo.quotedMessage;
    }
    else if (message.message?.stickerMessage?.contextInfo?.quotedMessage) {
      quoted = message.message.stickerMessage.contextInfo.quotedMessage;
    }
    else if (message.message?.lottieStickerMessage?.message?.stickerMessage?.contextInfo?.quotedMessage) {
      quoted = message.message.lottieStickerMessage.message.stickerMessage.contextInfo.quotedMessage;
    }
    
    if (!quoted) {
      console.log("[VIEWONCE STICKER] No quoted message found");
      return;
    }

    const isViewOnce = quoted.imageMessage?.viewOnce === true || 
                       quoted.videoMessage?.viewOnce === true ||
                       quoted.audioMessage?.viewOnce === true;
    
    if (!isViewOnce) {
      console.log("[VIEWONCE STICKER] Quoted message is not viewonce");
      return;
    }

    console.log("[VIEWONCE STICKER] ViewOnce detected! Processing...");

    const botNumber = client.user.id.split(':')[0] + '@s.whatsapp.net';

    await client.sendMessage(from, { 
      react: { text: "👁️", key: message.key } 
    });

    // Handle image/video/audio viewonce
    if (quoted.imageMessage) {
      const buffer = await downloadMediaMessage(
        { message: { imageMessage: quoted.imageMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      
      await client.sendMessage(botNumber, {
        image: buffer,
        caption: "👁️ ViewOnce Image Revealed\n\n📩 From: " + senderNumber
      });
      
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
      
      await client.sendMessage(botNumber, {
        video: buffer,
        caption: "👁️ ViewOnce Video Revealed\n\n📩 From: " + senderNumber
      });
      
      await client.sendMessage(from, {
        text: "✅ *ViewOnce Video* sent to owner! 👁️"
      }, { quoted: message });
    }

    console.log("[VIEWONCE STICKER] Successfully revealed viewonce");

  } catch (e) {
    console.error("[VIEWONCE STICKER] Error:", e);
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
