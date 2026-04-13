const { cmd } = require("../command");
const config = require("../config");
const { downloadMediaMessage, getContentType } = require("@whiskeysockets/baileys");

// Helper function to process and send view once content
async function processViewOnce(client, toJid, viewOnceMsg, originalMessage, originalSender, isStickerReply = false) {
  try {
    const senderInfo = isStickerReply ? `\n👤 From: @${originalSender.split('@')[0]}` : '';
    const chatInfo = isStickerReply ? `\n💬 Chat: ${originalMessage.key.remoteJid}` : '';
    const prefix = isStickerReply ? "🔓 *ViewOnce Revealed (Sticker Reply)*" : "👁️ *ViewOnce Revealed*";

    // IMAGE
    if (viewOnceMsg.imageMessage) {
      const buffer = await downloadMediaMessage(
        { message: { imageMessage: viewOnceMsg.imageMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );

      const caption = viewOnceMsg.imageMessage.caption || "";
      const fullCaption = `${prefix}${senderInfo}${chatInfo}\n\n${caption}`;

      await client.sendMessage(toJid, {
        image: buffer,
        caption: fullCaption,
        mentions: isStickerReply ? [originalSender] : []
      }, { quoted: isStickerReply ? null : originalMessage });

      console.log(`[VIEWONCE] Image sent to ${toJid}`);
    }

    // VIDEO
    else if (viewOnceMsg.videoMessage) {
      const buffer = await downloadMediaMessage(
        { message: { videoMessage: viewOnceMsg.videoMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );

      const caption = viewOnceMsg.videoMessage.caption || "";
      const fullCaption = `${prefix}${senderInfo}${chatInfo}\n\n${caption}`;

      await client.sendMessage(toJid, {
        video: buffer,
        caption: fullCaption,
        mentions: isStickerReply ? [originalSender] : []
      }, { quoted: isStickerReply ? null : originalMessage });

      console.log(`[VIEWONCE] Video sent to ${toJid}`);
    }

    // AUDIO
    else if (viewOnceMsg.audioMessage) {
      const buffer = await downloadMediaMessage(
        { message: { audioMessage: viewOnceMsg.audioMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );

      // Send audio
      await client.sendMessage(toJid, {
        audio: buffer,
        mimetype: "audio/mp4",
        ptt: viewOnceMsg.audioMessage.ptt || false
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

// Main vv command - works with .vv reply
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

    // Process and send the view once content
    await processViewOnce(client, from, quoted, message, sender, false);

  } catch (e) {
    console.error("vv plugin error:", e);
    await client.sendMessage(from, { text: "❌ Error: " + e.message }, { quoted: message });
  }
});

// Sticker reply handler for viewonce messages - using body event
cmd({
  pattern: "viewonce_sticker_handler",
  on: "body",
  dontAddCommandList: true,
  filename: __filename
}, async (client, message, match, { from, sender, isGroup }) => {
  try {
    // Check if this is a sticker message
    const msgType = getContentType(message.message);

    if (msgType !== 'stickerMessage') return;

    console.log(`[VIEWONCE] Sticker detected from ${sender} in ${from}`);

    // Get the sticker message
    const stickerMsg = message.message.stickerMessage;
    if (!stickerMsg) return;

    // Check if this sticker is a reply to a message
    const contextInfo = stickerMsg.contextInfo;
    if (!contextInfo || !contextInfo.quotedMessage) {
      console.log(`[VIEWONCE] No quoted message in sticker contextInfo`);
      return;
    }

    console.log(`[VIEWONCE] Sticker is a reply to a message`);

    const quotedMsg = contextInfo.quotedMessage;

    // Check if quoted message is view once
    const isViewOnceImage = quotedMsg.imageMessage?.viewOnce === true;
    const isViewOnceVideo = quotedMsg.videoMessage?.viewOnce === true;
    const isViewOnceAudio = quotedMsg.audioMessage?.viewOnce === true;

    console.log(`[VIEWONCE] ViewOnce check - Image: ${isViewOnceImage}, Video: ${isViewOnceVideo}, Audio: ${isViewOnceAudio}`);

    if (!isViewOnceImage && !isViewOnceVideo && !isViewOnceAudio) {
      console.log(`[VIEWONCE] Quoted message is not view once`);
      return;
    }

    console.log(`[VIEWONCE] ✓ Sticker reply to viewonce detected! Processing...`);

    // Get bot number
    const botNumberClean = client.user.id.split(':')[0];
    const botNumber = botNumberClean + '@s.whatsapp.net';

    // Get owner numbers from config
    let ownerNumbers = [];
    try {
      const currentConfig = config.getConfigSync(botNumberClean);
      ownerNumbers = Array.isArray(currentConfig.OWNER_NUMBER) 
        ? currentConfig.OWNER_NUMBER 
        : [currentConfig.OWNER_NUMBER];
    } catch (e) {
      console.log(`[VIEWONCE] Could not load config, using default`);
      ownerNumbers = [botNumberClean];
    }

    console.log(`[VIEWONCE] Bot: ${botNumberClean}, Owners: ${JSON.stringify(ownerNumbers)}`);

    // Send to bot number first
    try {
      await processViewOnce(client, botNumber, quotedMsg, message, sender, true);
      console.log(`[VIEWONCE] ✓ Sent to bot number`);
    } catch (err) {
      console.error(`[VIEWONCE] ✗ Failed to send to bot number:`, err.message);
    }

    // Also send to all owner numbers
    for (const owner of ownerNumbers) {
      if (!owner || owner === botNumberClean) continue;

      const ownerJid = owner + '@s.whatsapp.net';
      try {
        await processViewOnce(client, ownerJid, quotedMsg, message, sender, true);
        console.log(`[VIEWONCE] ✓ Sent to owner ${owner}`);
      } catch (err) {
        console.error(`[VIEWONCE] ✗ Failed to send to owner ${owner}:`, err.message);
      }
    }

    // Send confirmation reaction to the original chat
    try {
      await client.sendMessage(from, { 
        react: { text: "👁️", key: message.key } 
      });
    } catch (err) {
      console.error(`[VIEWONCE] Failed to send reaction:`, err.message);
    }

  } catch (e) {
    console.error("[VIEWONCE] Sticker handler error:", e);
  }
});

module.exports = { processViewOnce };
