const { cmd } = require("../command");
const config = require("../config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

// Store pending viewonce messages temporarily
const pendingViewOnce = new Map();

// Main vv command - still works with .vv reply
cmd({
  pattern: "vv",
  alias: ["viewonce", "vo"],
  react: "👁️",
  desc: "Retrieve View Once message",
  category: "owner",
  filename: __filename
}, async (client, message, match, { from, isOwner, sender }) => {
  try {
    if (!isOwner) {
      return client.sendMessage(from, { text: "📛 Owner command only!" }, { quoted: message });
    }

    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
      return client.sendMessage(from, { text: "⚠️ Reply to a *View Once* message!" }, { quoted: message });
    }

    // Check if it's a view once message
    const isViewOnce = quoted.imageMessage?.viewOnce || 
                      quoted.videoMessage?.viewOnce || 
                      quoted.audioMessage?.viewOnce;

    // Process and send the view once content
    await processViewOnce(client, from, quoted, message, sender);

  } catch (e) {
    console.error("vv plugin error:", e);
    await client.sendMessage(from, { text: "❌ Error: " + e.message }, { quoted: message });
  }
});

// Sticker reply handler for viewonce messages
cmd({
  pattern: "sticker_reply_viewonce",
  on: "sticker",
  dontAddCommandList: true,
  filename: __filename
}, async (client, message, match, { from, sender, isGroup }) => {
  try {
    // Check if this is a reply to a view once message
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return;

    // Check if quoted message is view once
    const isViewOnceImage = quoted.imageMessage?.viewOnce === true;
    const isViewOnceVideo = quoted.videoMessage?.viewOnce === true;
    const isViewOnceAudio = quoted.audioMessage?.viewOnce === true;

    if (!isViewOnceImage && !isViewOnceVideo && !isViewOnceAudio) return;

    console.log(`[VIEWONCE] Sticker reply detected from ${sender} to viewonce message`);

    // Get bot number
    const botNumber = client.user.id.split(':')[0] + '@s.whatsapp.net';

    // Get owner numbers from config
    const currentConfig = config.getConfigSync(botNumber.split('@')[0]);
    const ownerNumbers = Array.isArray(currentConfig.OWNER_NUMBER) 
      ? currentConfig.OWNER_NUMBER 
      : [currentConfig.OWNER_NUMBER];

    // Send to bot number
    await processViewOnce(client, botNumber, quoted, message, sender, true);

    // Also send to all owner numbers
    for (const owner of ownerNumbers) {
      const ownerJid = owner + '@s.whatsapp.net';
      if (ownerJid !== botNumber) {
        try {
          await processViewOnce(client, ownerJid, quoted, message, sender, true);
        } catch (err) {
          console.error(`[VIEWONCE] Failed to send to owner ${owner}:`, err.message);
        }
      }
    }

    // Send confirmation to the original chat
    await client.sendMessage(from, { 
      react: { text: "👁️", key: message.key } 
    });

  } catch (e) {
    console.error("[VIEWONCE] Sticker handler error:", e);
  }
});

// Helper function to process and send view once content
async function processViewOnce(client, toJid, quoted, originalMessage, originalSender, isStickerReply = false) {
  try {
    const senderInfo = isStickerReply ? `\n👤 From: @${originalSender.split('@')[0]}` : '';
    const chatInfo = isStickerReply ? `\n💬 Chat: ${originalMessage.key.remoteJid}` : '';
    const prefix = isStickerReply ? "🔓 *ViewOnce Revealed (Sticker Reply)*" : "👁️ *ViewOnce Revealed*";

    // IMAGE
    if (quoted.imageMessage) {
      const buffer = await downloadMediaMessage(
        { message: { imageMessage: quoted.imageMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );

      const caption = quoted.imageMessage.caption || "";
      const fullCaption = `${prefix}${senderInfo}${chatInfo}\n\n${caption}`;

      await client.sendMessage(toJid, {
        image: buffer,
        caption: fullCaption,
        mentions: isStickerReply ? [originalSender] : []
      }, { quoted: isStickerReply ? null : originalMessage });

      console.log(`[VIEWONCE] Image sent to ${toJid}`);
    }

    // VIDEO
    else if (quoted.videoMessage) {
      const buffer = await downloadMediaMessage(
        { message: { videoMessage: quoted.videoMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );

      const caption = quoted.videoMessage.caption || "";
      const fullCaption = `${prefix}${senderInfo}${chatInfo}\n\n${caption}`;

      await client.sendMessage(toJid, {
        video: buffer,
        caption: fullCaption,
        mentions: isStickerReply ? [originalSender] : []
      }, { quoted: isStickerReply ? null : originalMessage });

      console.log(`[VIEWONCE] Video sent to ${toJid}`);
    }

    // AUDIO
    else if (quoted.audioMessage) {
      const buffer = await downloadMediaMessage(
        { message: { audioMessage: quoted.audioMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );

      // Send audio
      await client.sendMessage(toJid, {
        audio: buffer,
        mimetype: "audio/mp4",
        ptt: quoted.audioMessage.ptt || false
      }, { quoted: isStickerReply ? null : originalMessage });

      // Send info text separately for audio
      if (isStickerReply) {
        const infoText = `${prefix}${senderInfo}${chatInfo}`;
        await client.sendMessage(toJid, {
          text: infoText,
          mentions: [originalSender]
        });
      }

      console.log(`[VIEWONCE] Audio sent to ${toJid}`);
    }

    else {
      if (!isStickerReply) {
        await client.sendMessage(toJid, { 
          text: "❌ Only image/video/audio view once supported!" 
        }, { quoted: originalMessage });
      }
    }

  } catch (e) {
    console.error("[VIEWONCE] Process error:", e);
    if (!isStickerReply) {
      throw e;
    }
  }
}

module.exports = { processViewOnce };
