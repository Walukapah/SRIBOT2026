const { proto, downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys')
const fs = require('fs')

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
			
			// Handle button messages
			if (m.type === 'buttonsMessage') {
				m.body = m.msg.contentText || ''
				m.buttonResponse = m.msg.buttonsResponseMessage ? m.msg.buttonsResponseMessage.selectedButtonId : ''
			} else if (m.type === 'templateButtonReplyMessage') {
				m.body = m.msg.selectedDisplayText || m.msg.selectedId || ''
				m.buttonResponse = m.msg.selectedId || ''
			} else if (m.type === 'listResponseMessage') {
				m.body = m.msg.title || m.msg.singleSelectReply?.selectedRowId || ''
				m.buttonResponse = m.msg.singleSelectReply?.selectedRowId || ''
			} else if (m.type === 'interactiveResponseMessage') {
				if (m.msg.interactiveResponseMessage?.body?.text) {
					m.body = m.msg.interactiveResponseMessage.body.text
				} else if (m.msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
					try {
						const params = JSON.parse(m.msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)
						m.body = params.id || params.display_text || ''
						m.buttonResponse = params.id || ''
					} catch (e) {
						m.body = m.msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson
					}
				} else if (m.msg.interactiveResponseMessage?.buttonReply?.buttonId) {
					m.body = m.msg.interactiveResponseMessage.buttonReply.buttonId
					m.buttonResponse = m.msg.interactiveResponseMessage.buttonReply.buttonId
				} else {
					m.body = ''
				}
			} else {
				// Standard message types
				m.body = (m.type === 'conversation') ? m.msg : 
						(m.type === 'extendedTextMessage') ? m.msg.text : 
						(m.type == 'imageMessage') && m.msg.caption ? m.msg.caption : 
						(m.type == 'videoMessage') && m.msg.caption ? m.msg.caption : 
						(m.type == 'templateButtonReplyMessage') && m.msg.selectedId ? m.msg.selectedId : 
						(m.type == 'buttonsResponseMessage') && m.msg.selectedButtonId ? m.msg.selectedButtonId : ''
			}
			
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
	
	// Button message reply methods
	m.replyButtons = (text, buttons, id = m.chat, options = {}) => {
		const buttonMessage = {
			text: text,
			footer: options.footer || '',
			buttons: buttons,
			headerType: options.headerType || 1,
			viewOnce: options.viewOnce || false
		}
		
		if (options.image) {
			buttonMessage.headerType = 4
			buttonMessage.image = typeof options.image === 'string' ? { url: options.image } : options.image
		}
		
		if (options.document) {
			buttonMessage.headerType = 3
			buttonMessage.document = typeof options.document === 'string' ? { url: options.document } : options.document
			if (options.fileName) buttonMessage.fileName = options.fileName
		}
		
		return conn.sendMessage(id, buttonMessage, { quoted: m })
	}
	
	m.replyList = (title, text, footer, buttonText, sections, image = null, id = m.chat) => {
    const listMessage = {
        text: text,
        footer: footer,
        title: title,
        buttonText: buttonText || "SELECT",
        sections: sections,
        headerType: image ? 4 : 1,  // image තියෙනවා නම් 4 වෙනවා
    }

    if (image) {
        listMessage.image = typeof image === 'string' ? { url: image } : image
    }

    return conn.sendMessage(id, listMessage, { quoted: m })
}
	
	m.replyTemplateButtons = (text, buttons, id = m.chat, options = {}) => {
		const templateMessage = {
			text: text,
			footer: options.footer || '',
			templateButtons: buttons
		}
		
		return conn.sendMessage(id, templateMessage, { quoted: m })
	}
	
	return m
}

module.exports = { sms, downloadMediaMessage }
