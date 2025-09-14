const config = require('../config');
const {cmd, commands} = require('../command');
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "tts",
    desc: "Convert text to speech audio",
    category: "main",//
    filename: __filename,
    usage: ".tts <text> or .tts <language_code> <text>"
},
async(conn, mek, m, {from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
    try {
        if (!q && !quoted?.text) {
            return reply("Please provide text for TTS conversion.\nExample: .tts hello or .tts es hola");
        }

        // Get text either from quoted message or direct input
        const inputText = quoted?.text || q;
        
        // Check if first word is a language code (2 letters)
        const possibleLang = args[0];
        let text = inputText;
        let language = 'en'; // default language
        
        if (possibleLang && possibleLang.length === 2 && !possibleLang.match(/[0-9]/)) {
            language = possibleLang;
            text = args.slice(1).join(' ');
        }

        // Validate we have text to convert
        if (!text || text.trim().length === 0) {
            return reply("No valid text found to convert to speech.");
        }

        const fileName = `tts-${Date.now()}.mp3`;
        const filePath = path.join(__dirname, '..', 'assets', fileName);

        const gtts = new gTTS(text.trim(), language);
        gtts.save(filePath, async function (err) {
            if (err) {
                reply('Error generating TTS audio: ' + err.message);
                return;
            }

            try {
                await conn.sendMessage(from, {
                    audio: { url: filePath },
                    mimetype: 'audio/mpeg'
                });
            } catch (sendError) {
                reply('Error sending audio message: ' + sendError.message);
            } finally {
                // Clean up file
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        });
    } catch(e) {
        console.log(e);
        reply(`Error: ${e.message}`);
    }
});
