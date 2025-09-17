const { cmd } = require("../command");
const config = require("../config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

cmd({
  on: "body",
  filename: __filename,
}, async (client, message, m, { from, isGroup }) => {
  try {
    if (config.ANTI_DELETE !== "true") return;

    // protocolMessage check
    if (!message.message?.protocolMessage) return;
    const prot = message.message.protocolMessage;
    if (prot.type !== 0) return; // 0 = REVOKE

    const chat = prot.key.remoteJid;
    const user = prot.key.participant || message.key.participant || message.key.remoteJid;
    const username = user.split("@")[0];

    // deleted message content
    const deletedMsg = prot.key;
    const quoted = prot.message || null;

    let notifyText = `🚨 *ANTI DELETE ACTIVE!*\n👤 @${username} deleted a message.\n⏰ ${new Date().toLocaleString()}`;

    if (quoted?.conversation) {
      // text deleted
      await client.sendMessage(chat, {
        text: `${notifyText}\n\n💬 Deleted text:\n> ${quoted.conversation}`,
        mentions: [user]
      });
    } else if (quoted?.imageMessage) {
      const buffer = await downloadMediaMessage(
        { message: { imageMessage: quoted.imageMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      await client.sendMessage(chat, {
        image: buffer,
        caption: `${notifyText}\n\n🖼️ Deleted Image`,
        mentions: [user]
      });
    } else if (quoted?.videoMessage) {
      const buffer = await downloadMediaMessage(
        { message: { videoMessage: quoted.videoMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      await client.sendMessage(chat, {
        video: buffer,
        caption: `${notifyText}\n\n🎥 Deleted Video`,
        mentions: [user]
      });
    } else if (quoted?.audioMessage) {
      const buffer = await downloadMediaMessage(
        { message: { audioMessage: quoted.audioMessage } },
        "buffer",
        {},
        { reuploadRequest: client.updateMediaMessage }
      );
      await client.sendMessage(chat, {
        audio: buffer,
        mimetype: "audio/mp4",
        ptt: quoted.audioMessage.ptt || false,
        caption: `${notifyText}\n\n🎵 Deleted Audio`,
        mentions: [user]
      });
    } else {
      // fallback if type unknown
      await client.sendMessage(chat, {
        text: notifyText,
        mentions: [user]
      });
    }

  } catch (e) {
    console.error("ANTI_DELETE ERROR:", e);
  }
});
