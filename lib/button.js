// Interactive Button Message System for WhatsApp Bot
// Compatible with @whiskeysockets/baileys
// Created for SRI-BOT 🇱🇰

const { 
    generateWAMessageFromContent, 
    prepareWAMessageMedia,
    proto 
} = require("@whiskeysockets/baileys");

class Button {
    constructor() {
        this._title = "";
        this._subtitle = "";
        this._body = "";
        this._footer = "";
        this._buttons = [];
        this._media = null;
        this._mediaType = null; // 'image', 'video', 'document'
        this._contextInfo = {};
        this._currentSelectionIndex = -1;
        this._currentSectionIndex = -1;
    }

    // ==================== MEDIA METHODS ====================

    // Set image from URL, Buffer, or local path
    async setImage(source, options = {}) {
        if (!source) throw new Error("Image source required (URL, Buffer, or path)");
        
        let imageData;
        
        if (Buffer.isBuffer(source)) {
            imageData = source;
        } else if (typeof source === 'string') {
            if (source.startsWith('http://') || source.startsWith('https://')) {
                // URL - will be handled by prepareWAMessageMedia
                imageData = { url: source };
            } else {
                // Local file path
                const fs = require('fs');
                if (fs.existsSync(source)) {
                    imageData = fs.readFileSync(source);
                } else {
                    throw new Error(`File not found: ${source}`);
                }
            }
        } else {
            throw new Error("Invalid image source type");
        }

        this._media = { image: imageData, ...options };
        this._mediaType = 'image';
        return this;
    }

    // Set video from URL, Buffer, or local path
    async setVideo(source, options = {}) {
        if (!source) throw new Error("Video source required (URL, Buffer, or path)");
        
        let videoData;
        
        if (Buffer.isBuffer(source)) {
            videoData = source;
        } else if (typeof source === 'string') {
            if (source.startsWith('http://') || source.startsWith('https://')) {
                videoData = { url: source };
            } else {
                const fs = require('fs');
                if (fs.existsSync(source)) {
                    videoData = fs.readFileSync(source);
                } else {
                    throw new Error(`File not found: ${source}`);
                }
            }
        } else {
            throw new Error("Invalid video source type");
        }

        this._media = { video: videoData, ...options };
        this._mediaType = 'video';
        return this;
    }

    // Set document
    async setDocument(source, options = {}) {
        if (!source) throw new Error("Document source required");
        
        let docData;
        
        if (Buffer.isBuffer(source)) {
            docData = source;
        } else if (typeof source === 'string') {
            if (source.startsWith('http://') || source.startsWith('https://')) {
                docData = { url: source };
            } else {
                const fs = require('fs');
                if (fs.existsSync(source)) {
                    docData = fs.readFileSync(source);
                } else {
                    throw new Error(`File not found: ${source}`);
                }
            }
        }

        this._media = { document: docData, ...options };
        this._mediaType = 'document';
        return this;
    }

    // ==================== TEXT METHODS ====================

    setTitle(title) {
        this._title = title;
        return this;
    }

    setSubtitle(subtitle) {
        this._subtitle = subtitle;
        return this;
    }

    setBody(body) {
        this._body = body;
        return this;
    }

    setFooter(footer) {
        this._footer = footer;
        return this;
    }

    // ==================== BUTTON METHODS ====================

    // 1. Single Select (Dropdown menu with sections)
    addSelection(title) {
        this._buttons.push({
            name: "single_select",
            buttonParamsJson: JSON.stringify({ title, sections: [] })
        });
        this._currentSelectionIndex = this._buttons.length - 1;
        this._currentSectionIndex = -1;
        return this;
    }

    makeSection(title = "", highlightLabel = "") {
        if (this._currentSelectionIndex === -1) {
            throw new Error("Create a selection first using addSelection()");
        }
        const params = JSON.parse(this._buttons[this._currentSelectionIndex].buttonParamsJson);
        params.sections.push({ title, highlight_label: highlightLabel, rows: [] });
        this._currentSectionIndex = params.sections.length - 1;
        this._buttons[this._currentSelectionIndex].buttonParamsJson = JSON.stringify(params);
        return this;
    }

    makeRow(header = "", title = "", description = "", id = "") {
        if (this._currentSelectionIndex === -1 || this._currentSectionIndex === -1) {
            throw new Error("Create a selection and section first");
        }
        const params = JSON.parse(this._buttons[this._currentSelectionIndex].buttonParamsJson);
        params.sections[this._currentSectionIndex].rows.push({
            header,
            title,
            description,
            id
        });
        this._buttons[this._currentSelectionIndex].buttonParamsJson = JSON.stringify(params);
        return this;
    }

    // 2. Quick Reply Button
    addReply(displayText = "", id = "") {
        this._buttons.push({
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: displayText, id })
        });
        return this;
    }

    // 3. URL Button (Call to Action)
    addUrl(displayText = "", url = "", merchantUrl = "") {
        this._buttons.push({
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: displayText,
                url: url,
                merchant_url: merchantUrl || url
            })
        });
        return this;
    }

    // 4. Copy Button
    addCopy(displayText = "", copyCode = "", id = "") {
        this._buttons.push({
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
                display_text: displayText,
                copy_code: copyCode,
                id
            })
        });
        return this;
    }

    // 5. Call Button
    addCall(displayText = "", phoneNumber = "") {
        this._buttons.push({
            name: "cta_call",
            buttonParamsJson: JSON.stringify({
                display_text: displayText,
                id: phoneNumber
            })
        });
        return this;
    }

    // 6. Reminder Button
    addReminder(displayText = "", id = "") {
        this._buttons.push({
            name: "cta_reminder",
            buttonParamsJson: JSON.stringify({
                display_text: displayText,
                id
            })
        });
        return this;
    }

    // 7. Location Button
    addLocation() {
        this._buttons.push({
            name: "send_location",
            buttonParamsJson: ""
        });
        return this;
    }

    // 8. Address Button
    addAddress(displayText = "", id = "") {
        this._buttons.push({
            name: "address_message",
            buttonParamsJson: JSON.stringify({
                display_text: displayText,
                id
            })
        });
        return this;
    }

    // Context info (forwarding, mentions, etc.)
    setContextInfo(contextInfo) {
        this._contextInfo = contextInfo;
        return this;
    }

    // ==================== SEND METHOD ====================

    // Build and send the message
    async send(jid, conn, quoted = {}) {
        try {
            // Prepare media if exists
            let mediaMessage = {};
            let hasMedia = false;

            if (this._media) {
                try {
                    mediaMessage = await prepareWAMessageMedia(this._media, {
                        upload: conn.waUploadToServer
                    });
                    hasMedia = true;
                } catch (mediaError) {
                    console.error('[BUTTON] Media preparation failed:', mediaError);
                    // Continue without media
                }
            }

            // Build header
            const header = proto.Message.InteractiveMessage.Header.create({
                title: this._title,
                subtitle: this._subtitle,
                hasMediaAttachment: hasMedia,
                ...(hasMedia ? mediaMessage : {})
            });

            // Build interactive message
            const interactiveMessage = {
                body: proto.Message.InteractiveMessage.Body.create({
                    text: this._body
                }),
                footer: proto.Message.InteractiveMessage.Footer.create({
                    text: this._footer
                }),
                header: header,
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                    buttons: this._buttons
                }),
                contextInfo: this._contextInfo
            };

            // Generate full message
            const message = generateWAMessageFromContent(
                jid,
                {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage: proto.Message.InteractiveMessage.create(interactiveMessage)
                        }
                    }
                },
                { quoted }
            );

            // Send message
            await conn.relayMessage(message.key.remoteJid, message.message, {
                messageId: message.key.id
            });

            return {
                success: true,
                key: message.key,
                message: message.message
            };

        } catch (error) {
            console.error('[BUTTON] Error sending button message:', error);
            throw error;
        }
    }
}

// ==================== HELPER FUNCTIONS ====================

// Quick function for simple buttons with image
async function sendImageButtons(conn, jid, imageUrl, text, footer, buttons, quoted = {}) {
    const btn = new Button()
        .setImage(imageUrl)
        .setBody(text)
        .setFooter(footer);
    
    for (const btnData of buttons) {
        if (btnData.type === 'reply') {
            btn.addReply(btnData.text, btnData.id);
        } else if (btnData.type === 'url') {
            btn.addUrl(btnData.text, btnData.url);
        } else if (btnData.type === 'copy') {
            btn.addCopy(btnData.text, btnData.copy);
        } else if (btnData.type === 'call') {
            btn.addCall(btnData.text, btnData.number);
        }
    }
    
    return await btn.send(jid, conn, quoted);
}

// Quick function for menu with image
async function sendImageMenu(conn, jid, imageUrl, title, description, sections, quoted = {}) {
    const btn = new Button()
        .setImage(imageUrl)
        .setTitle(title)
        .setBody(description)
        .setFooter("Powered by SRI-BOT 🇱🇰");
    
    const selection = btn.addSelection("📋 Select Option");
    
    for (const section of sections) {
        btn.makeSection(section.title, section.highlight);
        for (const row of section.rows) {
            btn.makeRow(row.header, row.title, row.description, row.id);
        }
    }
    
    return await btn.send(jid, conn, quoted);
}

// Function with buffer support
async function sendImageBufferButtons(conn, jid, imageBuffer, text, footer, buttons, quoted = {}) {
    const btn = new Button();
    
    // Handle buffer
    if (Buffer.isBuffer(imageBuffer)) {
        await btn.setImage(imageBuffer);
    } else {
        await btn.setImage(imageBuffer); // URL or path
    }
    
    btn.setBody(text).setFooter(footer);
    
    for (const btnData of buttons) {
        if (btnData.type === 'reply') {
            btn.addReply(btnData.text, btnData.id);
        } else if (btnData.type === 'url') {
            btn.addUrl(btnData.text, btnData.url);
        } else if (btnData.type === 'copy') {
            btn.addCopy(btnData.text, btnData.copy);
        } else if (btnData.type === 'call') {
            btn.addCall(btnData.text, btnData.number);
        }
    }
    
    return await btn.send(jid, conn, quoted);
}

module.exports = {
    Button,
    sendImageButtons,
    sendImageMenu,
    sendImageBufferButtons
};
