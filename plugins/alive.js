const config = require('../config');
const { cmd, commands } = require('../command');

cmd({
    pattern: "alive",
    desc: "Check bot online or no.",
    category: "main",
    react: "👋",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        // Sound file URLs
        const audioFiles = [
            'https://files.catbox.moe/hpwsi2.mp3',
            'https://files.catbox.moe/xci982.mp3',
            'https://files.catbox.moe/utbujd.mp3',
            'https://files.catbox.moe/w2j17k.m4a',
            'https://files.catbox.moe/851skv.m4a',
            'https://files.catbox.moe/qnhtbu.m4a',
            'https://files.catbox.moe/lb0x7w.mp3',
            'https://files.catbox.moe/efmcxm.mp3',
            'https://files.catbox.moe/gco5bq.mp3',
            'https://files.catbox.moe/26oeeh.mp3',
            'https://files.catbox.moe/a1sh4u.mp3',
            'https://files.catbox.moe/vuuvwn.m4a',
            'https://files.catbox.moe/wx8q6h.mp3',
            'https://files.catbox.moe/uj8fps.m4a',
            'https://files.catbox.moe/dc88bx.m4a',
            'https://files.catbox.moe/tn32z0.m4a'
        ];

        // Randomly pick an audio file
        const vn = audioFiles[Math.floor(Math.random() * audioFiles.length)];

        // Other variables
        const name = pushname || conn.getName(sender);
        const url = 'https://github.com/';
        const murl = 'https://whatsapp.com/channel/0029Vaan9TF9Bb62l8wpoD47';
        const img = 'https://i.imgur.com/vTs9acV.jpeg';

        // Constructing the contact message
        const con = {
            key: {
                fromMe: false,
                participant: `${sender.split('@')[0]}@s.whatsapp.net`,
                ...(isGroup ? { remoteJid: '94756209082@s.whatsapp.net' } : {}),
            },
            message: {
                contactMessage: {
                    displayName: name,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${sender.split('@')[0]}:${sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
                },
            },
        };

        // Audio file message with external ad reply info
        const doc = {
            audio: {
                url: vn,
            },
            mimetype: 'audio/mpeg',
            ptt: true,
            waveform: [100, 0, 100, 0, 100, 0, 100],
            fileName: 'shizo',
            contextInfo: {
                mentionedJid: [sender],
                externalAdReply: {
                    title: '𝗜 𝗔𝗠 𝗔𝗟𝗜𝗩𝗘 𝗠𝗢𝗧𝗛𝗘𝗥𝗙𝗨𝗖𝗞𝗘𝗥',
                    body: 'Regards Keithkeizzah',
                    thumbnailUrl: img,
                    sourceUrl: murl,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        };

        // Send the message
        await conn.sendMessage(from, doc, { quoted: con });

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});
