const config = require('../config');
const moment = require('moment-timezone');
const { cmd, commands } = require('../command');
const axios = require('axios');

cmd({
  pattern: "menu2",
  alias: ["allmenu", "srim"],
  use: '.menu',
  desc: "Show all bot commands",
  category: "menu",
  react: "📜",
  filename: __filename
},
async (conn, mek, m, { from, reply }) => {
  try {
    const totalCommands = commands.length;
    const date = moment().tz("America/Port-au-Prince").format("dddd, DD MMMM YYYY");

    const uptime = () => {
      let sec = process.uptime();
      let h = Math.floor(sec / 3600);
      let m = Math.floor((sec % 3600) / 60);
      let s = Math.floor(sec % 60);
      return `${h}h ${m}m ${s}s`;
    };

    // Menu principal
    let menuText = `
*╭══ SRI-BOT*
*┃❃* *USER* : @${m.sender.split("@")[0]}
*┃❃* *RUNTIME* : ${uptime()}
*┃❃* *MODE* : *${config.MODE}*
*┃❃* *PREFIX* : [ ${config.PREFIX} ]
*┃❃* *PLUGIN* : ${totalCommands}
*┃❃* *DEVELOPER* : *WALUKA*
*┃❃* *VERSIONS* : *${config.VERSION}*
*┕──────────────❒*
`;

    // Catégories et commandes
    let category = {};
    for (let cmd of commands) {
      if (!cmd.category) continue;
      if (!category[cmd.category]) category[cmd.category] = [];
      category[cmd.category].push(cmd);
    }

    const keys = Object.keys(category).sort();
    for (let k of keys) {
      menuText += `\n\n*╭─❝${k.toUpperCase()} MENU*❞`;
      const cmds = category[k].filter(c => c.pattern).sort((a, b) => a.pattern.localeCompare(b.pattern));
      cmds.forEach((cmd) => {
        const usage = cmd.pattern.split('|')[0];
        menuText += `\n├◯ ${config.PREFIX}${usage}`;
      });
      menuText += `\n*┕─────────────▩⫸*`;
    }

    // First try sending as image with caption
      await conn.sendMessage(from, { 
        image: { url: config.MENU_IMG_URL },
        caption: menuText,
        contextInfo: {
          mentionedJid: [m.sender],
          externalAdReply: {
            showAdAttribution: true,
            title: 'SRI BOT MENU LIST ♲',
            body: 'SRI BOT 🇱🇰',
            thumbnailUrl: 'https://images.weserv.nl/?url=i.imgur.com/W2CaVZW.jpeg',
            sourceUrl: config.MEDIA_URL,
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: mek });

  } catch (e) {
    console.error(e);
    reply(`❌ Error: ${e.message}`);
  }
});
