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
        this._contextInfo = {};
        this._currentSelectionIndex = -1;
        this._currentSectionIndex = -1;
    }

    // Set media (image/video/document)
    setImage(urlOrBuffer, options = {}) {
        if (!urlOrBuffer) throw new Error("Image URL or buffer required");
        this._media = Buffer.isBuffer(urlOrBuffer) 
            ? { image: urlOrBuffer, ...options } 
            : { image: { url: urlOrBuffer }, ...options };
        return this;
    }

    setVideo(urlOrBuffer, options = {}) {
        if (!urlOrBuffer) throw new Error("Video URL or buffer required");
        this._media = Buffer.isBuffer(urlOrBuffer) 
            ? { video: urlOrBuffer, ...options } 
            : { video: { url: urlOrBuffer }, ...options };
        return this;
    }

    setDocument(urlOrBuffer, options = {}) {
        if (!urlOrBuffer) throw new Error("Document URL or buffer required");
        this._media = Buffer.isBuffer(urlOrBuffer) 
            ? { document: urlOrBuffer, ...options } 
            : { document: { url: urlOrBuffer }, ...options };
        return this;
    }

    // Set text content
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

    // Button types for Native Flow Messages

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

    // Build and send the message
    async send(jid, conn, quoted = {}) {
        // Prepare media if exists
        let mediaMessage = {};
        if (this._media) {
            mediaMessage = await prepareWAMessageMedia(this._media, {
                upload: conn.waUploadToServer
            });
        }

        // Build interactive message
        const interactiveMessage = {
            body: proto.Message.InteractiveMessage.Body.create({
                text: this._body
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
                text: this._footer
            }),
            header: proto.Message.InteractiveMessage.Header.create({
                title: this._title,
                subtitle: this._subtitle,
                hasMediaAttachment: !!this._media,
                ...mediaMessage
            }),
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

        return message;
    }
}

// Helper function for simple button creation
async function sendSimpleButtons(conn, jid, text, footer, buttons, quoted = {}) {
    const btn = new Button()
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

// Helper for menu with sections
async function sendMenu(conn, jid, title, description, sections, quoted = {}) {
    const btn = new Button()
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

module.exports = {
    Button,
    sendSimpleButtons,
    sendMenu
};
