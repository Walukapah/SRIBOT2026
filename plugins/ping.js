const os = require('os');
const { exec } = require('child_process');
const config = require('../config');
const {cmd, commands} = require('../command');

function formatTime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds = seconds % (24 * 60 * 60);
    const hours = Math.floor(seconds / (60 * 60));
    seconds = seconds % (60 * 60);
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);

    let time = '';
    if (days > 0) time += `${days}d `;
    if (hours > 0) time += `${hours}h `;
    if (minutes > 0) time += `${minutes}m `;
    if (seconds > 0 || time === '') time += `${seconds}s`;

    return time.trim();
}

// Function to run speed test using Python speedtest-cli
function runSpeedTest() {
    return new Promise((resolve, reject) => {
        const path = require('path');

        // Try multiple possible paths for speedtest.py
        const possiblePaths = [
            path.join(__dirname, '..', 'lib', 'speedtest.py'),      // lib folder
            path.join(__dirname, '..', 'speedtest.py'),              // root folder
            path.join(process.cwd(), 'lib', 'speedtest.py'),         // cwd lib
            path.join(process.cwd(), 'speedtest.py'),                  // cwd root
            './lib/speedtest.py',
            './speedtest.py'
        ];

        let speedtestPath = null;
        const fs = require('fs');

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                speedtestPath = p;
                console.log(`[SPEEDTEST] Found speedtest.py at: ${p}`);
                break;
            }
        }

        if (!speedtestPath) {
            console.error('[SPEEDTEST] speedtest.py not found in any location!');
            resolve({ download: 'N/A', upload: 'N/A', ping: 'N/A' });
            return;
        }

        exec(`python3 "${speedtestPath}" --simple --no-share`, { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                console.error('[SPEEDTEST] Error:', error.message);
                // Try with python if python3 fails
                exec(`python "${speedtestPath}" --simple --no-share`, { timeout: 60000 }, (error2, stdout2, stderr2) => {
                    if (error2) {
                        console.error('[SPEEDTEST] Python fallback error:', error2.message);
                        resolve({ download: 'N/A', upload: 'N/A', ping: 'N/A' });
                    } else {
                        resolve(parseSpeedTestOutput(stdout2));
                    }
                });
            } else {
                resolve(parseSpeedTestOutput(stdout));
            }
        });
    });
}

// Parse speedtest-cli simple output
function parseSpeedTestOutput(output) {
    const lines = output.trim().split('\n');
    let result = { download: 'N/A', upload: 'N/A', ping: 'N/A' };

    for (const line of lines) {
        if (line.startsWith('Ping:')) {
            result.ping = line.replace('Ping:', '').trim();
        } else if (line.startsWith('Download:')) {
            result.download = line.replace('Download:', '').trim();
        } else if (line.startsWith('Upload:')) {
            result.upload = line.replace('Upload:', '').trim();
        }
    }

    return result;
}

cmd({
    pattern: "ping",
    react: "🤖",
    alias: ["speed", "test"],
    desc: "Check bot's ping speed and internet speed",
    category: "main",
    use: '.ping',
    filename: __filename
},
async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
    try {
        const start = Date.now();

        // Send initial message
        const loadingMsg = await conn.sendMessage(from, { 
            text: '📡 *Running Speed Test...*\n\n⏳ Please wait while testing download & upload speeds...' 
        }, { quoted: mek });

        const end = Date.now();
        const botPing = Math.round((end - start) / 2);

        const uptimeInSeconds = process.uptime();
        const uptimeFormatted = formatTime(uptimeInSeconds);

        // Run internet speed test
        const speedResults = await runSpeedTest();

        const botInfo = `
┏━━〔 🗿 *${config.BOT_NAME}* 〕━━┓
┃
┃ 🤖 *Bot Status*
┃ 🚀 Bot Ping     : ${botPing} ms
┃ ⏱️ Uptime        : ${uptimeFormatted}
┃ 🔖 Version      : v${config.VERSION}
┃
┃ 📡 *Internet Speed*
┃ 🌐 Network Ping  : ${speedResults.ping}
┃ ⬇️ Download     : ${speedResults.download}
┃ ⬆️ Upload       : ${speedResults.upload}
┃
┗━━━━━━━━━━━━━━━━━━━┛`.trim();

        // Delete loading message and send result
        await conn.sendMessage(from, { delete: loadingMsg.key });
        await conn.sendMessage(from, { text: botInfo }, { quoted: mek });

    } catch (error) {
        console.error('Error in ping command:', error);
        reply('❌ Failed to get bot status.');
    }
});
