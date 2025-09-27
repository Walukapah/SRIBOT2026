const { cmd } = require('../command');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

cmd({
    pattern: "plist",
    desc: "Send product list message",
    category: "general",
    filename: __filename
}, async (conn, mek, m, { from }) => {
    try {
        const msg = generateWAMessageFromContent(from, proto.Message.fromObject({
            productListMessage: {
                businessOwnerJid: "628123456789@s.whatsapp.net", // business jid
                headerImage: { 
                    productId: "1234", // product ID for preview
                },
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
                ]
            }
        }), {});

        await conn.relayMessage(from, msg.message, { messageId: msg.key.id });
    } catch (e) {
        console.error(e);
        m.reply("❌ Error sending product list message");
    }
});
