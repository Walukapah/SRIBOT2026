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

    // Check for quoted message (text reply or sticker reply)
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quoted) {
      return client.sendMessage(from, { text: "⚠️ Reply to a *View Once* message with text or sticker!" }, { quoted: message });
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

    // Case 1: Direct reply to viewonce message (text reply)
    if (quoted.imageMessage || quoted.videoMessage || quoted.audioMessage) {
      // Check if it's actually a viewonce message
      if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce || quoted.audioMessage?.viewOnce) {
        result = await processViewOnce(quoted);
      }
    }
    
    // Case 2: Reply with sticker (sticker reply to viewonce)
    // When user replies with a sticker, the quoted message contains the viewonce
    if (!result && message.message?.stickerMessage) {
      // The quoted message should be the viewonce message
      if (quoted.imageMessage || quoted.videoMessage || quoted.audioMessage) {
        result = await processViewOnce(quoted);
      }
    }

    // Send confirmation to user
    if (result) {
      await client.sendMessage(from, { 
        text: `✅ ViewOnce ${result} sent to bot number!` 
      }, { quoted: message });
    } else {
      await client.sendMessage(from, { 
        text: "❌ No ViewOnce message found! Reply to a viewonce message with text or sticker." 
      }, { quoted: message });
    }

  } catch (e) {
    console.error("vv plugin error:", e);
    await client.sendMessage(from, { text: "❌ Error: " + e.message }, { quoted: message });
  }
});
