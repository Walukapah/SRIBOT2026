const { proto, downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys')
const fs = require('fs')
const axios = require('axios')
const Jimp = require('jimp')
const crypto = require('crypto')
const moment = require('moment-timezone')

const downloadMediaMessage = async(m, filename) => {
	if (m.type === 'viewOnceMessage') {
		m.type = m.msg.type
	}
	if (m.type === 'imageMessage') {
		var nameJpg = filename ? filename + '.jpg' : 'undefined.jpg'
		const stream = await downloadContentFromMessage(m.msg, 'image')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameJpg, buffer)
		return fs.readFileSync(nameJpg)
	} else if (m.type === 'videoMessage') {
		var nameMp4 = filename ? filename + '.mp4' : 'undefined.mp4'
		const stream = await downloadContentFromMessage(m.msg, 'video')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameMp4, buffer)
		return fs.readFileSync(nameMp4)
	} else if (m.type === 'audioMessage') {
		var nameMp3 = filename ? filename + '.mp3' : 'undefined.mp3'
		const stream = await downloadContentFromMessage(m.msg, 'audio')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameMp3, buffer)
		return fs.readFileSync(nameMp3)
	} else if (m.type === 'stickerMessage') {
		var nameWebp = filename ? filename + '.webp' : 'undefined.webp'
		const stream = await downloadContentFromMessage(m.msg, 'sticker')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameWebp, buffer)
		return fs.readFileSync(nameWebp)
	} else if (m.type === 'documentMessage') {
		var ext = m.msg.fileName.split('.')[1].toLowerCase().replace('jpeg', 'jpg').replace('png', 'jpg').replace('m4a', 'mp3')
		var nameDoc = filename ? filename + '.' + ext : 'undefined.' + ext
		const stream = await downloadContentFromMessage(m.msg, 'document')
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		fs.writeFileSync(nameDoc, buffer)
		return fs.readFileSync(nameDoc)
	}
}

const isGroupChat = (jid) => typeof jid === 'string' && jid.endsWith('@g.us')

// Image resizing function
async function resize(image, width, height) {
    let oyy = await Jimp.read(image);
    let kiyomasa = await oyy.resize(width, height).getBufferAsync(Jimp.MIME_JPEG);
    return kiyomasa;
}

// Capitalize first letter
function capital(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Generate serial
const createSerial = (size) => {
    return crypto.randomBytes(size).toString('hex').slice(0, size);
}

// Format message function
function formatMessage(title, content, footer) {
    return `${title}\n\n${content}\n\n${footer}`;
}

// List Message Generator
function generateListMessage(text, buttonTitle, sections, footer, title) {
    return {
        text: text,
        footer: footer || null,
        title: title || null,
        buttonText: buttonTitle || "Select",
        sections: sections
    };
}

// Button Message Generator with Image Support
function generateButtonMessage(content, buttons, image = null, footer = null, title = null) {
    const message = {
        text: content,
        footer: footer || null,
        title: title || null,
        buttons: buttons,
        headerType: 1 // Default to text header
    };

    // Add image if provided
    if (image) {
        message.headerType = 4; // Image header
        message.image = typeof image === 'string' ? { url: image } : image;
    }

    return message;
}

const sms = (conn, m) => {
	if (m.key) {
		m.id = m.key.id
		m.chat = m.key.remoteJid
		m.fromMe = m.key.fromMe
		m.isGroup = isGroupChat(m.chat)
		m.sender = m.fromMe ? conn.user.id.split(':')[0]+'@s.whatsapp.net' : m.isGroup ? m.key.participant : m.key.remoteJid
	}
	
	if (m.message) {
		m.type = getContentType(m.message)
		m.msg = (m.type === 'viewOnceMessage') ? m.message[m.type].message[getContentType(m.message[m.type].message)] : m.message[m.type]
		if (m.msg) {
			if (m.type === 'viewOnceMessage') {
				m.msg.type = getContentType(m.message[m.type].message)
			}
			var quotedMention = m.msg.contextInfo != null ? m.msg.contextInfo.participant : ''
			var tagMention = m.msg.contextInfo != null ? m.msg.contextInfo.mentionedJid : []
			var mention = typeof(tagMention) == 'string' ? [tagMention] : tagMention
			mention != undefined ? mention.push(quotedMention) : []
			m.mentionUser = mention != undefined ? mention.filter(x => x) : []
			m.body = (m.type === 'conversation') ? m.msg : (m.type === 'extendedTextMessage') ? m.msg.text : (m.type == 'imageMessage') && m.msg.caption ? m.msg.caption : (m.type == 'videoMessage') && m.msg.caption ? m.msg.caption : (m.type == 'templateButtonReplyMessage') && m.msg.selectedId ? m.msg.selectedId : (m.type == 'buttonsResponseMessage') && m.msg.selectedButtonId ? m.msg.selectedButtonId : (m.type == 'interactiveResponseMessage') && m.msg.nativeFlowResponseMessage ? JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id : ''
			m.quoted = m.msg.contextInfo != undefined ? m.msg.contextInfo.quotedMessage : null
			if (m.quoted) {
				m.quoted.type = getContentType(m.quoted)
				m.quoted.id = m.msg.contextInfo.stanzaId
				m.quoted.sender = m.msg.contextInfo.participant
				m.quoted.fromMe = m.quoted.sender.split('@')[0].includes(conn.user.id.split(':')[0])
				m.quoted.msg = (m.quoted.type === 'viewOnceMessage') ? m.quoted[m.quoted.type].message[getContentType(m.quoted[m.quoted.type].message)] : m.quoted[m.quoted.type]
				if (m.quoted.type === 'viewOnceMessage') {
					m.quoted.msg.type = getContentType(m.quoted[m.quoted.type].message)
				}
				var quoted_quotedMention = m.quoted.msg.contextInfo != null ? m.quoted.msg.contextInfo.participant : ''
				var quoted_tagMention = m.quoted.msg.contextInfo != null ? m.quoted.msg.contextInfo.mentionedJid : []
				var quoted_mention = typeof(quoted_tagMention) == 'string' ? [quoted_tagMention] : quoted_tagMention
				quoted_mention != undefined ? quoted_mention.push(quoted_quotedMention) : []
				m.quoted.mentionUser = quoted_mention != undefined ? quoted_mention.filter(x => x) : []
				m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
					key: {
						remoteJid: m.chat,
						fromMe: m.quoted.fromMe,
						id: m.quoted.id,
						participant: m.quoted.sender
					},
					message: m.quoted
				})
				m.quoted.download = (filename) => downloadMediaMessage(m.quoted, filename)
				m.quoted.delete = () => conn.sendMessage(m.chat, { delete: m.quoted.fakeObj.key })
				m.quoted.react = (emoji) => conn.sendMessage(m.chat, { react: { text: emoji, key: m.quoted.fakeObj.key } })
			}
		}
		m.download = (filename) => downloadMediaMessage(m, filename)
	}
	
	// Basic reply functions
	m.reply = (teks, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { text: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyS = (stik, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { sticker: stik, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyImg = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => conn.sendMessage(id, { image: img, caption: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyVid = (vid, teks, id = m.chat, option = { mentions: [m.sender], gif: false }) => conn.sendMessage(id, { video: vid, caption: teks, gifPlayback: option.gif, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyAud = (aud, id = m.chat, option = { mentions: [m.sender], ptt: false }) => conn.sendMessage(id, { audio: aud, ptt: option.ptt, mimetype: 'audio/mpeg', contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyDoc = (doc, id = m.chat, option = { mentions: [m.sender], filename: 'undefined.pdf', mimetype: 'application/pdf' }) => conn.sendMessage(id, { document: doc, mimetype: option.mimetype, fileName: option.filename, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
	m.replyContact = (name, info, number) => {
		var vcard = 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + 'FN:' + name + '\n' + 'ORG:' + info + ';\n' + 'TEL;type=CELL;type=VOICE;waid=' + number + ':+' + number + '\n' + 'END:VCARD'
		conn.sendMessage(m.chat, { contacts: { displayName: name, contacts: [{ vcard }] } }, { quoted: m })
	}
	m.react = (emoji) => conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
	
	// Button message functions
	m.replyButtons = (text, buttons, title, footer, id = m.chat, viewOnce = false) => {
		const buttonMessage = {
			text: text,
			footer: footer || null,
			title: title || null,
			buttons: buttons,
			headerType: 1,
			viewOnce: viewOnce
		}
		return conn.sendMessage(id, buttonMessage, { quoted: m })
	}

	m.replyButtonsImg = (image, caption, buttons, title, footer, id = m.chat, viewOnce = false) => {
		const buttonMessage = {
			image: image,
			caption: caption,
			footer: footer || null,
			title: title || null,
			buttons: buttons,
			headerType: 4, // Image header
			viewOnce: viewOnce
		}
		return conn.sendMessage(id, buttonMessage, { quoted: m })
	}

	m.replyButtonsVid = (video, caption, buttons, title, footer, id = m.chat, viewOnce = false) => {
		const buttonMessage = {
			video: video,
			caption: caption,
			footer: footer || null,
			title: title || null,
			buttons: buttons,
			headerType: 5, // Video header
			viewOnce: viewOnce
		}
		return conn.sendMessage(id, buttonMessage, { quoted: m })
	}

	// Interactive message functions
	m.replyInteractive = (text, interactiveButtons, title, footer, id = m.chat) => {
		const interactiveMessage = {
			text: text,
			footer: footer || null,
			title: title || null,
			interactiveButtons: interactiveButtons
		}
		return conn.sendMessage(id, interactiveMessage, { quoted: m })
	}

	m.replyInteractiveImg = (image, caption, interactiveButtons, title, footer, id = m.chat) => {
		const interactiveMessage = {
			image: image,
			caption: caption,
			footer: footer || null,
			title: title || null,
			interactiveButtons: interactiveButtons
		}
		return conn.sendMessage(id, interactiveMessage, { quoted: m })
	}

	m.replyInteractiveVid = (video, caption, interactiveButtons, title, footer, id = m.chat) => {
		const interactiveMessage = {
			video: video,
			caption: caption,
			footer: footer || null,
			title: title || null,
			interactiveButtons: interactiveButtons
		}
		return conn.sendMessage(id, interactiveMessage, { quoted: m })
	}

	// List message function
	m.replyList = (text, buttonText, sections, title, footer, id = m.chat) => {
		const listMessage = {
			text: text,
			footer: footer || null,
			title: title || null,
			buttonText: buttonText,
			sections: sections
		}
		return conn.sendMessage(id, listMessage, { quoted: m })
	}

	// Template message function
	m.replyTemplate = (text, templateButtons, title, footer, id = m.chat) => {
		const templateMessage = {
			text: text,
			footer: footer || null,
			templateButtons: templateButtons,
			headerType: 1
		}
		return conn.sendMessage(id, templateMessage, { quoted: m })
	}

	// Carousel message function (for news slides)
	m.replyCarousel = async (jid, newsItems) => {
		let anu = [];
		for (let item of newsItems) {
			let imgBuffer;
			try {
				imgBuffer = await resize(item.thumbnail, 300, 200);
			} catch (error) {
				console.error(`Failed to resize image for ${item.title}:`, error);
				imgBuffer = await Jimp.read('https://i.ibb.co/PJvjMx9/20250717-093632.jpg');
				imgBuffer = await imgBuffer.resize(300, 200).getBufferAsync(Jimp.MIME_JPEG);
			}
			let imgsc = await prepareWAMessageMedia({ image: imgBuffer }, { upload: conn.waUploadToServer });
			anu.push({
				body: proto.Message.InteractiveMessage.Body.fromObject({
					text: `*${capital(item.title)}*\n\n${item.body}`
				}),
				header: proto.Message.InteractiveMessage.Header.fromObject({
					hasMediaAttachment: true,
					...imgsc
				}),
				nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
					buttons: [
						{
							name: "cta_url",
							buttonParamsJson: `{"display_text":"𝐃𝙴𝙿𝙻𝙾𝚈","url":"https:/","merchant_url":"https://www.google.com"}`
						},
						{
							name: "cta_url",
							buttonParamsJson: `{"display_text":"𝐂𝙾𝙽𝚃𝙰𝙲𝚃","url":"https","merchant_url":"https://www.google.com"}`
						}
					]
				})
			});
		}
		const msgii = await generateWAMessageFromContent(jid, {
			viewOnceMessage: {
				message: {
					messageContextInfo: {
						deviceListMetadata: {},
						deviceListMetadataVersion: 2
					},
					interactiveMessage: proto.Message.InteractiveMessage.fromObject({
						body: proto.Message.InteractiveMessage.Body.fromObject({
							text: "*Latest News Updates*"
						}),
						carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
							cards: anu
						})
					})
				}
			}
		}, { userJid: jid });
		return conn.relayMessage(jid, msgii.message, {
			messageId: msgii.key.id
		});
	}

	// Utility functions
	m.formatMessage = formatMessage;
	m.generateListMessage = generateListMessage;
	m.generateButtonMessage = generateButtonMessage;
	m.resize = resize;
	m.capital = capital;
	m.createSerial = createSerial;
	
	return m
}

module.exports = { 
	sms, 
	downloadMediaMessage, 
	formatMessage,
	generateListMessage,
	generateButtonMessage,
	resize,
	capital,
	createSerial
}
