const { cmd } = require("../command");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

cmd({
  pattern: "vv",
  alias: ["viewonce", "vo"],
  react: "👁️",
  desc: "Retrieve View Once message",
  category: "owner",
  filename: __filename
}, async (client, message, match, { from, senderNumber }) => {
  try {
    // Get bot number
    const botNumber = client.user.id.split(':')[0] + '@s.whatsapp.net';

    let quoted = null;

    // Check 1: Text reply to viewonce (extendedTextMessage with quotedMessage)
    if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      quoted = message.message.extendedTextMessage.contextInfo.quotedMessage;
      console.log("[VV] Found quoted via extendedTextMessage");
    }
    
    // Check 2: Sticker reply (regular stickerMessage)
    else if (message.message?.stickerMessage?.contextInfo?.quotedMessage) {
      quoted = message.message.stickerMessage.contextInfo.quotedMessage;
      console.log("[VV] Found quoted via stickerMessage");
    }
    
    // Check 3: Sticker reply (lottieStickerMessage - animated stickers)
    else if (message.message?.lottieStickerMessage?.message?.stickerMessage?.contextInfo?.quotedMessage) {
      quoted = message.message.lottieStickerMessage.message.stickerMessage.contextInfo.quotedMessage;
      console.log("[VV] Found quoted via lottieStickerMessage");
    }
    
    // Check 4: Image reply
    else if (message.message?.imageMessage?.contextInfo?.quotedMessage) {
      quoted = message.message.imageMessage.contextInfo.quotedMessage;
      console.log("[VV] Found quoted via imageMessage");
    }
    
    // Check 5: Video reply
    else if (message.message?.videoMessage?.contextInfo?.quotedMessage) {
      quoted = message.message.videoMessage.contextInfo.quotedMessage;
      console.log("[VV] Found quoted via videoMessage");
    }

    if (!quoted) {
      return client.sendMessage(from, { 
        text: "⚠️ Reply to a *View Once* message with text, sticker, or image!" 
      }, { quoted: message });
    }

    // Function to process and send viewonce content
    const processViewOnce = async (viewOnceMsg) => {
      // Image ViewOnce
      if (viewOnceMsg.imageMessage) {
        const buffer = await downloadMediaMessage(
          { message: { imageMessage: viewOnceMsg.imageMessage } },
          "buffer",
          {},
          { reuploadRequest: client.updateMediaMessage }
        );
        await client.sendMessage(botNumber, {
          image: buffer,
          caption: viewOnceMsg.imageMessage.caption || "👁️ ViewOnce Image Revealed"
        });
        return "image";
      }
      
      // Video ViewOnce
      else if (viewOnceMsg.videoMessage) {
        const buffer = await downloadMediaMessage(
          { message: { videoMessage: viewOnceMsg.videoMessage } },
          "buffer",
          {},
          { reuploadRequest: client.updateMediaMessage }
        );
        await client.sendMessage(botNumber, {
          video: buffer,
          caption: viewOnceMsg.videoMessage.caption || "👁️ ViewOnce Video Revealed"
        });
        return "video";
      }
      
      // Audio/Voice ViewOnce
      else if (viewOnceMsg.audioMessage) {
        const buffer = await downloadMediaMessage(
          { message: { audioMessage: viewOnceMsg.audioMessage } },
          "buffer",
          {},
          { reuploadRequest: client.updateMediaMessage }
        );
        await client.sendMessage(botNumber, {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: viewOnceMsg.audioMessage.ptt || false
        });
        return "audio";
      }
      
      return null;
    };

    let result = null;

    // Check if quoted message is a viewonce
    if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce || quoted.audioMessage?.viewOnce) {
      console.log("[VV] Quoted message has viewOnce flag, processing...");
      result = await processViewOnce(quoted);
    } else {
      console.log("[VV] Quoted message is not viewOnce:", 
        quoted.imageMessage ? "image" : 
        quoted.videoMessage ? "video" : 
        quoted.audioMessage ? "audio" : "unknown",
        "viewOnce:", quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce || quoted.audioMessage?.viewOnce
      );
    }

    // Send confirmation to user
    if (result) {
      await client.sendMessage(from, { 
        text: `✅ ViewOnce ${result} sent to bot number!` 
      }, { quoted: message });
    } else {
      await client.sendMessage(from, { 
        text: "❌ No ViewOnce message found! Reply to a viewonce message with text, sticker, or image." 
      }, { quoted: message });
    }

  } catch (e) {
    console.error("[VV] Plugin error:", e);
    await client.sendMessage(from, { text: "❌ Error: " + e.message }, { quoted: message });
  }
});
