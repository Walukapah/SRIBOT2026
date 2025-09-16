const config = require("../config");
const { cmd } = require("../command");

cmd({
    pattern: "vv",
    alias: ["viewonce", 'vv2'],
    react: '🐳',
    desc: "Owner retrieve quoted message back to user",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, {from, quoted, isOwner, reply}) => {
    try {
        if (!isOwner) {
            return reply("📛 This is an owner command.");
        }

        if (!quoted) {  
            return reply("*🍁 Please reply to a view once message!*");  
        }  

        // Check if the quoted message is a viewOnceMessage
        const quotedType = m.type;
        if (quotedType !== 'viewOnceMessage' && quotedType !== 'viewOnceMessageV2') {
            return reply("*❌ This is not a view once message!*");
        }

        const buffer = await m.download();  
        const mtype = m.mtype || (m.msg ? m.msg.type : null);
        const caption = m.body || '';

        let messageContent = {};  
        switch (mtype) {  
            case "imageMessage":  
                messageContent = {  
                    image: buffer,  
                    caption: caption,
                    mimetype: "image/jpeg"  
                };  
                break;  
            case "videoMessage":  
                messageContent = {  
                    video: buffer,  
                    caption: caption,
                    mimetype: "video/mp4"  
                };  
                break;  
            case "audioMessage":  
                messageContent = {  
                    audio: buffer,  
                    mimetype: "audio/mp4",  
                    ptt: false  
                };  
                break;  
            default:  
                return reply("❌ Only image, video, and audio messages are supported");  
        }  

        await conn.sendMessage(from, messageContent, { quoted: mek });

    } catch (error) {
        console.error("vv Error:", error);
        reply("❌ Error fetching vv message:\n" + error.message);
    }
});
