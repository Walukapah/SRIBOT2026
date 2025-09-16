const { cmd } = require('../command');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

cmd({
    pattern: "vv",
    desc: "View once media downloader.",
    category: "utility",
    react: "👀",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        // Check if the message is a reply
        if (!quoted) {
            return reply('❌ Please reply to a view-once image or video.');
        }

        // Extract quoted imageMessage or videoMessage
        const quotedMsg = quoted.message;
        const quotedImage = quotedMsg?.imageMessage;
        const quotedVideo = quotedMsg?.videoMessage;

        if (quotedImage && quotedImage.viewOnce) {
            // Download and send the image
            const stream = await downloadContentFromMessage(quotedImage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            await conn.sendMessage(
                from, 
                { 
                    image: buffer, 
                    caption: quotedImage.caption || 'Extracted from view once message' 
                }, 
                { quoted: mek }
            );
        } else if (quotedVideo && quotedVideo.viewOnce) {
            // Download and send the video
            const stream = await downloadContentFromMessage(quotedVideo, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            await conn.sendMessage(
                from, 
                { 
                    video: buffer, 
                    caption: quotedVideo.caption || 'Extracted from view once message' 
                }, 
                { quoted: mek }
            );
        } else {
            reply('❌ Please reply to a view-once image or video.');
        }
    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
    }
});
