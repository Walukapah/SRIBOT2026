const config = require('../config');
const { cmd, commands } = require('../command');
const { fetchJson } = require('../lib/functions');

cmd({
    pattern: "ai",
    desc: "Chat with AI",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!q) return reply('Please provide a question/message for the AI. Example: *ai hello*');
        
        const apiUrl = `https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(q)}`;
        const data = await fetchJson(apiUrl);
        
        if (!data || !data.data) {
            return reply('Failed to get response from AI service. Please try again later.');
        }
        
        return reply(`🧠*AI Response*:\n\n${data.data}\n\nPOWERED BY SRI BOT 🛡️`);
    } catch (e) {
        console.error('AI command error:', e);
        return reply('An error occurred while processing your request. Please try again later.');
    }
});
