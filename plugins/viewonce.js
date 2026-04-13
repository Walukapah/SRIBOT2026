const { cmd } = require("../command");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

// Handle sticker reply to viewonce messages
cmd({
  pattern: "viewonce_sticker_handler",
  on: "sticker",
  dontAddCommandList: true,
  filename: __filename
}, async (client, message, match, { from, isOwner }) => {
  try {
    // Only owner can use this
    if (!isOwner) return;

    // Check if this is a reply to a message
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return;
    
    // Check if quoted message is a viewonce message
    const isViewOnce = quoted.imageMessage?.viewOnce || 
                       quoted.videoMessage?.viewOnce || 
                       quoted.audioMessage?.viewOnce;
    
    if (!isViewOnce) return;

    // Get bot number
    const botNumber = client.user.id.split(':')[0] + '@s.whatsapp.net';

    // Download and send the viewonce content based on type
    if (quoted.imageMessage) {
      const buffer = await downloadMediaMessage(
        { message: { imageMessage: quoted.imageMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      await client.sendMessage(botNumber, {
        image: buffer,
        caption: "👁️ ViewOnce Revealed"
      });
      // React to confirm
      await client.sendMessage(from, { react: { text: "✅", key: message.key } });
    } else if (quoted.videoMessage) {
      const buffer = await downloadMediaMessage(
        { message: { videoMessage: quoted.videoMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      await client.sendMessage(botNumber, {
        video: buffer,
        caption: "👁️ ViewOnce Revealed"
      });
      // React to confirm
      await client.sendMessage(from, { react: { text: "✅", key: message.key } });
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
      // React to confirm
      await client.sendMessage(from, { react: { text: "✅", key: message.key } });
    }
  } catch (e) {
    console.error("viewonce sticker handler error:", e);
  }
});
