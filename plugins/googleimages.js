const { cmd } = require('../command');
const axios = require('axios');
const { getBuffer } = require('../lib/functions');

cmd({
    pattern: "googlei",
    alias: ["gi", "googleimage"],
    desc: "Search Google Images",
    category: "search",
    filename: __filename,
    use: ".googlei <query>"
},
async (conn, mek, m, { from, reply, args, q }) => {
    try {
        if (!q) return reply("*Please provide a search query!*\n\nExample: .googlei minecraft");

        await reply(`🔍 Searching Google Images for: *${q}*...`);

        const apiUrl = `https://sriapi.koyeb.app/search/googleimage?q=${encodeURIComponent(q)}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        const data = response.data;

        if (!data.status || !data.result || !data.result.images || data.result.images.length === 0) {
            return reply("❌ No images found for your query.");
        }

        const images = data.result.images;
        
        // Take up to 10 images for the album
        const maxImages = Math.min(images.length, 10);
        const albumItems = [];

        for (let i = 0; i < maxImages; i++) {
            try {
                const img = images[i];
                const buffer = await getBuffer(img.image_url);
                
                albumItems.push({
                    image: buffer,
                    caption: `📷 *${q}* - Image ${i + 1}\n📐 ${img.width}x${img.height} pixels`
                });
            } catch (err) {
                console.log(`[GOOGLEIMAGE] Failed to load image ${i + 1}:`, err.message);
            }
        }

        if (albumItems.length === 0) {
            return reply("❌ Failed to load any images. Please try again.");
        }

        // Send as album
        await conn.sendMessage(from, {
            album: albumItems
        }, { quoted: mek });

    } catch (error) {
        console.error("[GOOGLEIMAGE] Error:", error);
        reply(`❌ Error: ${error.message}`);
    }
});
