const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "google",
    alias: ["g", "search"],
    desc: "Search Google",
    category: "search",
    filename: __filename,
    use: ".google <query>"
},
async (conn, mek, m, { from, reply, args, q }) => {
    try {
        if (!q) return reply("*Please provide a search query!*\n\nExample: .google minecraft");

        await reply(`🔍 Searching Google for: *${q}*...`);

        const apiUrl = `https://sriapi.koyeb.app/search/google?q=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        const data = response.data;

        if (!data.status || !data.result || !data.result.result || !data.result.result.results || data.result.result.results.length === 0) {
            return reply("❌ No results found for your query.");
        }

        const results = data.result.result.results;
        const totalResults = data.result.result.total_results || results.length;
        const query = data.result.result.query || q;

        let text = `🔍 *Google Search Results*\n\n`;
        text += `📌 *Query:* ${query}\n`;
        text += `📊 *Total Results:* ${totalResults}\n`;
        text += `═`.repeat(30) + `\n\n`;

        for (let i = 0; i < Math.min(results.length, 10); i++) {
            const result = results[i];
            text += `*${i + 1}. ${result.title}*\n`;
            text += `🔗 ${result.url}\n`;
            text += `📝 ${result.snippet}\n`;
            text += `\n`;
        }

        text += `═`.repeat(30) + `\n`;
        text += `Powered by SRI-BOT 🇱🇰`;

        await reply(text);

    } catch (error) {
        console.error("[GOOGLE] Error:", error);
        reply(`❌ Error: ${error.message}`);
    }
});
