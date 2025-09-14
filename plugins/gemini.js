const config = require('../config');
const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');

cmd({
    pattern: "gemini", // Command name changed to "gemini"
    desc: "Chat with Gemini AI",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!q) return reply('🔍 *Question missing!* \n\nඔබගේ ප්‍රශ්නය ඇතුළත් කරන්න.\nඋදා: ```.gemini ලංකාවේ ජනගහනය කීයද?```');

        const apiEndpoints = [
            `https://vapis.my.id/api/gemini?q=${encodeURIComponent(q)}`,
            `https://api.siputzx.my.id/api/ai/gemini-pro?content=${encodeURIComponent(q)}`,
            `https://api.ryzendesu.vip/api/ai/gemini?text=${encodeURIComponent(q)}`,
            `https://api.dreaded.site/api/gemini2?text=${encodeURIComponent(q)}`,
            `https://api.giftedtech.my.id/api/ai/geminiai?apikey=gifted&q=${encodeURIComponent(q)}`,
            `https://api.giftedtech.my.id/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(q)}`
        ];

        let result;
        let lastError;

        for (const endpoint of apiEndpoints) {
            try {
                const data = await fetchJson(endpoint);
                if (data?.data) result = data.data;
                else if (data?.result) result = data.result;
                else if (data?.response) result = data.response;
                else if (data?.message) result = data.message;
                
                if (result) break; // Exit loop if response is valid
            } catch (e) {
                lastError = e;
                continue; // Try next API
            }
        }

        if (result) {
            return reply(`🤖 *Gemini AI*:\n\n${result}`);
        } else {
            return reply('❌ *Gemini is not responding!*\n\nදෝෂය: ' + (lastError?.message || 'All APIs failed. Try again later.'));
        }
    } catch (e) {
        console.error('Gemini Error:', e);
        reply('⚠️ *Error occurred!* \n\n' + e.message);
    }
});
