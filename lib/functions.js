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
// INTERACTIVE BUTTON MESSAGE (NATIVE FLOW)
// ============================================

/**
 * Generate Interactive Button Message (New WhatsApp Format)
 * @param {string} title - Header title
 * @param {string} subtitle - Header subtitle  
 * @param {string} bodyText - Body text
 * @param {string} footerText - Footer text
 * @param {string} imageUrl - Header image URL
 * @param {Array} buttons - Array of button objects
 * @returns {Object} - Interactive message object
 */
const generateInteractiveMessage = (title, subtitle, bodyText, footerText, imageUrl, buttons = []) => {
    const message = {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: {
                    header: {
                        title: title,
                        subtitle: subtitle,
                        hasMediaAttachment: !!imageUrl
                    },
                    body: {
                        text: bodyText
                    },
                    footer: {
                        text: footerText
                    },
                    nativeFlowMessage: {
                        buttons: buttons
                    }
                }
            }
        }
    };

    // Add image if provided
    if (imageUrl) {
        message.viewOnceMessage.message.interactiveMessage.header.imageMessage = {
            url: imageUrl,
            mimetype: "image/jpeg",
            fileLength: "957613",
            height: 1236,
            width: 2560,
            mediaKey: "aiL95s3T9hwxUilfMfCxKcTSrcFpSRksyjw5rYfxK6k=",
            fileEncSha256: "R/RPruMaS10WaMlInLF0g4Z4ZSEImTjcNuGg9bhx19E=",
            directPath: "/o1/v/t24/f2/m235/sample",
            mediaKeyTimestamp: Date.now().toString(),
            jpegThumbnail: "/9j/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAPACADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABQQD/8QAJhAAAgEDAwQBBQAAAAAAAAAAAQIDBAURACExEhNBURQiYXGBof/EABYBAQEBAAAAAAAAAAAAAAAAAAADBP/EABgRAAMBAQAAAAAAAAAAAAAAAAABAxEC/9oADAMBAAIRAxEAPwCSyWdZ6OijfpR5lZwViAOATy2d+PW2lBQW0WxVrJmMhPYkhUnJYMWwqjzkg5HjQ9PO6y04UL0xkKo8gZ3Gf2dW3Cd6KevkkjRkwvbbG6sRgMPRON/xoabS6m8fOBT2ijWRk7nQBCek9w9Rc7AkY2A+3Op663W6O3GopjIZEVVYSNhSw2Y43JJPjIGtK+viMon+OpkeEIc8Fxj6v5xoY3GoKPFMwmjY5KyDO/sHkaEGsP/Z"
        };
    }

    return message;
};

/**
 * Create Single Select Button (Menu/List)
 * @param {string} title - Button title
 * @param {Array} sections - Array of sections with rows
 * @returns {Object} - Button object
 */
const createSingleSelectButton = (title, sections) => {
    return {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
            title: title,
            sections: sections
        })
    };
};

/**
 * Create URL Button
 * @param {string} displayText - Button text
 * @param {string} url - URL to open
 * @returns {Object} - Button object
 */
const createUrlButton = (displayText, url) => {
    return {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
            display_text: displayText,
            url: url,
            merchant_url: url
        })
    };
};

/**
 * Create Copy Button
 * @param {string} displayText - Button text
 * @param {string} copyCode - Text to copy
 * @returns {Object} - Button object
 */
const createCopyButton = (displayText, copyCode) => {
    return {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
            display_text: displayText,
            copy_code: copyCode
        })
    };
};

/**
 * Create Quick Reply Button
 * @param {string} displayText - Button text
 * @param {string} id - Command ID
 * @returns {Object} - Button object
 */
const createReplyButton = (displayText, id) => {
    return {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
            display_text: displayText,
            id: id
        })
    };
};

// Legacy function for compatibility
const generateButtonMessage = (text, footer, buttons, imageUrl) => {
    return generateInteractiveMessage(
        "SRI-BOT 🇱🇰",
        "Multi-Number WhatsApp Bot",
        text,
        footer,
        imageUrl,
        buttons
    );
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
    generateInteractiveMessage,
    createSingleSelectButton,
    createUrlButton,
    createCopyButton,
    createReplyButton
};
