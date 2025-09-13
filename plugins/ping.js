// ping.js (සංශෝධිත)
const config = require('../config');
const { cmd } = require('../command');

cmd({
    pattern: "ping",
    react: "🤖",
    alias: ["speed", "test"],
    desc: "Check bot's ping speed",
    category: "main",
    use: '.ping',
    filename: __filename
},
async(conn, mek, m, {from, reply}) => {
    try {
        const start = Date.now();
        const sentMsg = await conn.sendMessage(from, { text: 'Testing ping...' }, { quoted: mek });
        const end = Date.now();
        const pingTime = end - start;
        
        await conn.sendMessage(from, { 
            text: `🏓 *Pong!*\n⏱️ Response Time: ${pingTime}ms\n🤖 Bot: ${config.BOT_NAME}` 
        }, { quoted: mek });
        
        // Delete the test message
        await conn.sendMessage(from, { delete: sentMsg.key });
    } catch (error) {
        console.error('Ping command error:', error);
        reply('❌ Error checking ping!');
    }
});
