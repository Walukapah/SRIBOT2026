const { cmd } = require('../command');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const axios = require("axios");

cmd({
    pattern: "plist",
    desc: "Send product list message",
    category: "general",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    try {
        // fetch thumbnail buffer from url
        const thumbRes = await axios.get("https://files.catbox.moe/kus7ix.jpg", { responseType: "arraybuffer" });
        const thumbBuffer = Buffer.from(thumbRes.data, "binary");

        const msg = generateWAMessageFromContent(from, proto.Message.fromObject({
            productListMessage: {
                businessOwnerJid: "628123456789@s.whatsapp.net", // change to your business JID
                footerText: "Hello World!",
                name: "Amazing boldfaced list title",
                description: "This is a list!",
                buttonText: "Required, click to view list",
                productSections: [
                    {
                        title: "This is a title",
                        productItems: [
                            { productId: "1234" },
                            { productId: "5678" }
                        ]
                    }
                ],
                headerImage: {
                    productId: "1234",
                    jpegThumbnail: thumbBuffer // <-- your custom thumbnail
                }
            }
        }), {});

        await conn.relayMessage(from, msg.message, { messageId: msg.key.id });
    } catch (e) {
        console.error(e);
        m.reply("❌ Error sending product list message");
    }
});
