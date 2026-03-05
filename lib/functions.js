const axios = require('axios')

const getBuffer = async(url, options) => {
	try {
		options ? options : {}
		var res = await axios({
			method: 'get',
			url,
			headers: {
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			...options,
			responseType: 'arraybuffer'
		})
		return res.data
	} catch (e) {
		console.log(e)
	}
}

const getGroupAdmins = (participants) => {
	var admins = []
	for (let i of participants) {
		i.admin !== null  ? admins.push(i.id) : ''
	}
	return admins
}

const getRandom = (ext) => {
	return `${Math.floor(Math.random() * 10000)}${ext}`
}

const h2k = (eco) => {
	var lyrik = ['', 'K', 'M', 'B', 'T', 'P', 'E']
	var ma = Math.log10(Math.abs(eco)) / 3 | 0
	if (ma == 0) return eco
	var ppo = lyrik[ma]
	var scale = Math.pow(10, ma * 3)
	var scaled = eco / scale
	var formatt = scaled.toFixed(1)
	if (/\.0$/.test(formatt))
		formatt = formatt.substr(0, formatt.length - 2)
	return formatt + ppo
}

const isUrl = (url) => {
	return url.match(
		new RegExp(
			/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/,
			'gi'
		)
	)
}

const Json = (string) => {
    return JSON.stringify(string, null, 2)
}

const runtime = (seconds) => {
	seconds = Number(seconds)
	var d = Math.floor(seconds / (3600 * 24))
	var h = Math.floor(seconds % (3600 * 24) / 3600)
	var m = Math.floor(seconds % 3600 / 60)
	var s = Math.floor(seconds % 60)
	var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
	var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
	var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
	var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

const sleep = async(ms) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

const fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch (err) {
        return err
    }
}

// ============================================
// BUTTON MESSAGE GENERATORS
// ============================================

/**
 * Generate Interactive Button Message (New WhatsApp Format)
 */
const generateInteractiveButtons = (text, footer, buttons, imageUrl = null) => {
    const interactiveButtons = buttons.map((btn, index) => {
        if (btn.type === 'quick_reply' || btn.type === 'reply') {
            return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.display_text,
                    id: btn.id || `btn_${index}`
                })
            };
        } else if (btn.type === 'url') {
            return {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.display_text,
                    url: btn.url,
                    merchant_url: btn.url
                })
            };
        } else if (btn.type === 'call') {
            return {
                name: 'cta_call',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.display_text,
                    phone_number: btn.phone
                })
            };
        } else if (btn.type === 'copy') {
            return {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.display_text,
                    copy_code: btn.copy_text
                })
            };
        } else if (btn.type === 'reminder') {
            return {
                name: 'cta_reminder',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.display_text
                })
            };
        } else if (btn.type === 'cancel_reminder') {
            return {
                name: 'cta_cancel_reminder',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.display_text
                })
            };
        } else if (btn.type === 'address') {
            return {
                name: 'address_message',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text || btn.display_text
                })
            };
        } else if (btn.type === 'location') {
            return {
                name: 'send_location',
                buttonParamsJson: JSON.stringify({})
            };
        }
        return null;
    }).filter(Boolean);

    const message = {
        body: text,
        footer: footer,
        interactiveButtons: interactiveButtons,
        hasMediaAttachment: imageUrl ? true : false
    };

    if (imageUrl) {
        message.image = { url: imageUrl };
    }

    return message;
};

/**
 * Generate Template Button Message (Legacy but stable)
 */
const generateTemplateButtons = (text, footer, buttons, imageUrl = null) => {
    const templateButtons = buttons.map((btn, index) => {
        if (btn.type === 'url') {
            return {
                index: index,
                urlButton: {
                    displayText: btn.text,
                    url: btn.url
                }
            };
        } else if (btn.type === 'call') {
            return {
                index: index,
                callButton: {
                    displayText: btn.text,
                    phoneNumber: btn.phone
                }
            };
        } else if (btn.type === 'reply' || btn.type === 'quick_reply') {
            return {
                index: index,
                quickReplyButton: {
                    displayText: btn.text,
                    id: btn.id || `btn_${index}`
                }
            };
        }
        return null;
    }).filter(Boolean);

    const message = {
        caption: text,
        footer: footer,
        templateButtons: templateButtons
    };

    if (imageUrl) {
        message.image = { url: imageUrl };
    } else {
        message.text = text;
        delete message.caption;
    }

    return message;
};

/**
 * Generate List Message (Menu with sections)
 */
const generateListMessage = (text, title, buttonText, sections, footer = '') => {
    return {
        text: text,
        title: title,
        footer: footer,
        buttonText: buttonText,
        sections: sections.map((section, idx) => ({
            title: section.title,
            rows: section.rows.map((row, ridx) => ({
                title: row.title,
                description: row.description || '',
                rowId: row.id || `row_${idx}_${ridx}`
            }))
        }))
    };
};

/**
 * Generate Poll Message
 */
const generatePollMessage = (name, values, selectableCount = 1) => {
    return {
        poll: {
            name: name,
            values: values,
            selectableOptionsCount: selectableCount
        }
    };
};

// Legacy Button Message Function (for backward compatibility)
const generateButtonMessage = (text, footer, buttons, imageUrl) => {
    return generateTemplateButtons(text, footer, buttons, imageUrl);
};

module.exports = { 
    getBuffer, 
    getGroupAdmins, 
    getRandom, 
    h2k, 
    isUrl, 
    Json, 
    runtime, 
    sleep, 
    fetchJson,
    generateButtonMessage,
    generateInteractiveButtons,
    generateTemplateButtons,
    generateListMessage,
    generatePollMessage
};
