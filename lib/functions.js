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
 * Works without external image URL - uses placeholder or no image
 */
const generateInteractiveMessage = (title, subtitle, bodyText, footerText, imageUrl, buttons = []) => {
    
    // Build header object
    const header = {
        title: title,
        subtitle: subtitle,
        hasMediaAttachment: false
    };

    // If imageUrl provided and is valid, fetch and use it
    if (imageUrl && isUrl(imageUrl)) {
        header.hasMediaAttachment = true;
        // Use a simple image message structure
        header.imageMessage = {
            url: imageUrl,
            mimetype: "image/jpeg",
            caption: "",
            fileLength: "100000",
            height: 600,
            width: 800,
            mediaKey: Buffer.from("sample-media-key").toString('base64'),
            fileEncSha256: Buffer.from("sample-sha").toString('base64'),
            directPath: "/v/t62/sample",
            mediaKeyTimestamp: Math.floor(Date.now() / 1000).toString(),
            jpegThumbnail: ""
        };
    }

    const message = {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: {
                    header: header,
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

    return message;
};

/**
 * Alternative: Generate simple text-based interactive message (no image)
 */
const generateInteractiveMessageText = (title, bodyText, footerText, buttons = []) => {
    return {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: {
                    header: {
                        title: title,
                        hasMediaAttachment: false
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
};

/**
 * Create Single Select Button (Menu/List)
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
    generateInteractiveMessageText,
    createSingleSelectButton,
    createUrlButton,
    createCopyButton,
    createReplyButton
};
