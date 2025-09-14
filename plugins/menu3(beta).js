const config = require('../config');
const { cmd, commands } = require('../command');
const pkg = require("@whiskeysockets/baileys");
const { proto, generateWAMessageFromContent } = pkg;

cmd({
    pattern: "menu3",
    desc: "Displays main menu with interactive buttons",
    category: "utility",
    filename: __filename
},
async(conn, mek, m, { from }) => {
    try {
        // Generate the interactive message
        const msg = generateWAMessageFromContent(from, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.create({
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: "PRABATH-MD-BETA_PUBLIC\n+234 816 597 5051, +254 799 073744, +263 78 0...\n\nShare: 451\nViews: 428656"
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({
                            text: "Select an option below"
                        }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            title: "MAIN MENU",
                            hasMediaAttachment: false
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                            buttons: [
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "AI MENU",
                                        id: ".aimenu"
                                    })
                                },
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "SEARCH MENU",
                                        id: ".searchmenu"
                                    })
                                },
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "DOWNLOAD MENU",
                                        id: ".downloadmenu"
                                    })
                                },
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "OWNER MENU",
                                        id: ".ownermenu"
                                    })
                                },
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "CONVERT MENU",
                                        id: ".convertmenu"
                                    })
                                },
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "GROUP MENU",
                                        id: ".groupmenu"
                                    })
                                },
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "STICKER MENU",
                                        id: ".stickermenu"
                                    })
                                },
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "GAME MENU",
                                        id: ".gamemenu"
                                    })
                                },
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "MATHTOOL MENU",
                                        id: ".mathtoolmenu"
                                    })
                                }
                            ]
                        })
                    })
                }
            }
        }, {});

        // Send the message
        await conn.relayMessage(msg.key.remoteJid, msg.message, {
            messageId: msg.key.id
        });

    } catch (error) {
        console.error('Menu3 error:', error);
        await conn.sendMessage(from, { text: "Failed to display menu. Please try again." }, { quoted: mek });
    }
});
