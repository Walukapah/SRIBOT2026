const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID,
    PREFIX: process.env.PREFIX || ".",
    BOT_NAME: process.env.BOT_NAME || "SRI-BOT 🇱🇰",
    BOT_INFO: process.env.BOT_INFO || "SRI-BOT🇱🇰;WALUKA👊;https://i.imgur.com/r3GZeiX.jpeg",
    OWNER_NUMBER: process.env.OWNER_NUMBER || ["94753670175"],
    ALIVE_IMG: process.env.ALIVE_IMG || "https://telegra.ph/file/ad25b2227fa2a1a01b707.jpg",
    ALIVE_MSG: process.env.ALIVE_MSG || "iyoo whats up 💫",
    MENU_IMG_URL: process.env.MENU_IMG_URL || "https://images.weserv.nl/?url=i.imgur.com/W2CaVZW.jpeg",
    MENU_TYPE: process.env.MENU_TYPE || "big", // Menu style: big, small, image, document, text, call, payment
    MENU_FONT: process.env.MENU_FONT || "tiny", // randomStyle, strikeThrough, wingdings, vaporwave, typewriter, analucia, tildeStrikeThrough, underline, doubleUnderline, slashThrough, sparrow, heartsBetween, arrowBelow, crossAboveBelow, creepify, bubbles, mirror, squares, roundsquares, flip, tiny, createMap, serif_I, manga, ladybug, runes, serif_B, serif_BI, serif_I, fancy1, fancy2, fancy3, fancy4, fancy5, fancy6, fancy7, fancy8, fancy9, fancy10, fancy11, fancy12, fancy13, fancy14, fancy15, fancy16, fancy17, fancy18, fancy19, fancy20, fancy21, fancy22, fancy23, fancy24, fancy25, fancy26, fancy27, fancy28, fancy29, fancy30, fancy31, fancy32, fancy33
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "true",
    AUTO_REACT_STATUS: process.env.AUTO_REACT_STATUS || "true",
    AUTO_REACT_STATUS_EMOJI: process.env.AUTO_REACT_STATUS_EMOJI || "❤️",
    NEWS_LETTER: process.env.NEWS_LETTER || "120363165918432989@newsletter",
    MODE: process.env.MODE || "public", // bot modes (public,private,inbox,groups)
    VERSION: process.env.VERSION || "1.0.0", // Added version here
    MEDIA_URL: process.env.MEDIA_URL || "https://whatsapp.com/channel/0029VaAPzWX0G0XdhMbtRI2i",
    AUTO_RECORDING: process.env.AUTO_RECORDING || "true",
    ANTI_DELETE: process.env.ANTI_DELETE || "true"
};
