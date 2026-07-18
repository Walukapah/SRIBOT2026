const { cmd } = require('../command');
const axios = require('axios');

// Custom getBuffer with timeout and better error handling
const getBufferWithTimeout = async (url, timeout = 15000) => {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            },
            responseType: 'arraybuffer',
            timeout: timeout,
            maxRedirects: 5
        });
        return res.data;
    } catch (e) {
        console.log(`[GOOGLEIMAGE] getBuffer failed for ${url}:`, e.message);
        return null;
    }
};

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
                const buffer = await getBufferWithTimeout(img.image_url, 15000);
                
                if (!buffer) {
                    console.log(`[GOOGLEIMAGE] Skipping image ${i + 1} - failed to download`);
                    continue;
                }
                
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

        // Send as album - try different methods
        try {
            // Method 1: Album format
            await conn.sendMessage(from, {
                album: albumItems
            }, { quoted: mek });
        } catch (albumError) {
            console.log("[GOOGLEIMAGE] Album send failed, trying individual sends:", albumError.message);
            
            // Method 2: Send images one by one
            for (const item of albumItems) {
                await conn.sendMessage(from, {
                    image: item.image,
                    caption: item.caption
                }, { quoted: mek });
                await new Promise(r => setTimeout(r, 500)); // Small delay between sends
            }
        }

    } catch (error) {
        console.error("[GOOGLEIMAGE] Error:", error);
        reply(`❌ Error: ${error.message}`);
    }
});
