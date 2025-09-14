//BOT_INFO: process.env.BOT_INFO || "X-BOT-MD;ASWIN SPARKY;https://i.imgur.com/r3GZeiX.jpeg",
const config = require('../config');
const moment = require('moment-timezone');
const { cmd, commands } = require('../command');
const axios = require('axios');
const font = require("@viper-x/fancytext");
const menust = config.MENU_FONT;
const style = font[menust];
const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

cmd({
  pattern: "menu",
  alias: ["help", "allmenu"],
  use: '.menu',
  desc: "Show all bot commands",
  category: "menu",
  react: "📜",
  filename: __filename
},
async (conn, mek, m, { from, reply }) => {
  try {
    const totalCommands = commands.length;
    const date = moment().tz("Asia/Colombo").format("dddd, DD MMMM YYYY");
    const time = moment().tz("Asia/Colombo").format("HH:mm:ss");

    const uptime = () => {
      let sec = process.uptime();
      let h = Math.floor(sec / 3600);
      let m = Math.floor((sec % 3600) / 60);
      let s = Math.floor(sec % 60);
      return `${h}h ${m}m ${s}s`;
    };

    // Main menu header
    let menuText = `╭══〘 ${style(config.BOT_NAME || "BOT")} 〙══⊷❙\n`;
    menuText += `┃╭─────────────────\n`;
    menuText += `┃│➛ USER : @${m.sender.split("@")[0]}\n`;
    menuText += `┃│➛ OWNER : ${style(config.OWNER_NAME || "Owner")}\n`;
    menuText += `┃│➛ PREFIX : [ ${config.PREFIX} ]\n`;
    menuText += `┃│➛ DATE : ${date}\n`;
    menuText += `┃│➛ TIME : ${time}\n`;
    menuText += `┃│➛ UPTIME : ${uptime()}\n`;
    menuText += `┃│➛ CMDS : ${totalCommands}\n`;
    menuText += `┃│➛ VERSION : ${config.VERSION || "1.0.0"}\n`;
    menuText += `┃╰─────────────────\n`;
    menuText += `╰════════════════⊷❙\n\n${readMore}\n\n`;

    // Categorize commands
    let categories = {};
    commands.forEach((cmd) => {
      if (!cmd.pattern || cmd.dontAddCommandList) return;
      const category = cmd.category || 'misc';
      if (!categories[category]) categories[category] = [];
      categories[category].push(cmd);
    });

    // Add commands to menu by category
    Object.keys(categories).sort().forEach((cat) => {
      menuText += `╭───『 ${style(cat.toUpperCase())} 』───⦿\n`;
      categories[cat].sort((a, b) => {
        const aCmd = a.pattern.toString().split('|')[0].replace(/[^a-zA-Z0-9]/g, '');
        const bCmd = b.pattern.toString().split('|')[0].replace(/[^a-zA-Z0-9]/g, '');
        return aCmd.localeCompare(bCmd);
      }).forEach((cmd) => {
        const cmdName = cmd.pattern.toString().split('|')[0].replace(/[^a-zA-Z0-9]/g, '');
        menuText += `│› ${config.PREFIX}${style(cmdName)}\n`;
      });
      menuText += `╰─────────────────⦿\n\n`;
    });

    let srim = {
                "key": {
                    "participants": "0@s.whatsapp.net",
                    "remoteJid": "status@broadcast",
                    "fromMe": false,
                    "id": "Hey!"
                },
                "message": {
                    "contactMessage": {
                        "displayName": `${config.BOT_INFO.split(";")[0]}`,
                        "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                    }
                },
                "participant": "0@s.whatsapp.net"
    }

    // Menu type handling
    switch(config.MENU_TYPE.toLowerCase()) {
      case 'big':
        return await conn.sendMessage(from, {
          text: style(menuText),
          contextInfo: {
              externalAdReply: {
                  title: style(`Hey ${m.pushName}!`),
                  body: style(`${config.BOT_INFO.split(";")[0]}`),
                  sourceUrl: "https://sparky.devstackx.in",
                  mediaType: 1,
                  showAdAttribution: true,
                  renderLargerThumbnail: true,
                  thumbnailUrl: `${config.BOT_INFO.split(";")[2]}`
              }
           }
        }, { quoted: mek });

      case 'small':
        return await conn.sendMessage(from, {
          text: style(menuText),
          contextInfo: {
              externalAdReply: {
                  title: style(`Hey ${m.pushName}!`),
                  body: style(`${config.BOT_INFO.split(";")[0]}`),
                  sourceUrl: "https://sparky.devstackx.in",
                  mediaUrl: "https://sparky.devstackx.in",
                  mediaType: 1,
                  showAdAttribution: true,
                  renderLargerThumbnail: false,
                  thumbnailUrl: `${config.BOT_INFO.split(";")[2]}`
              }
           }
        }, { quoted: srim });

      case 'image':
        return await conn.sendMessage(from, {
          image: await getBuffer(config.BOT_INFO.split(";")[2]),
          caption: style(menuText)
        }, { quoted: mek });

      case 'document':
        return await conn.sendMessage(from, {
          document: {
              url: config.MEDIA_URL
          },
            caption: menuText,
            mimetype: 'application/zip',
            fileName: style(config.BOT_INFO.split(";")[0]),
            fileLength: "99999999999",
            contextInfo: {
                externalAdReply: {
                      title: style(`Hey ${m.pushName}!`),
                      body: style(`${config.BOT_INFO.split(";")[0]}`),
                      sourceUrl: "https://sparky.devstackx.in",
                      mediaType: 1,
                      showAdAttribution: true,
                      renderLargerThumbnail: true,
                      thumbnailUrl: `${config.BOT_INFO.split(";")[2]}`
                  }
              }
        }, { quoted: srim });

      case 'text':
        return await conn.sendMessage(from, {
          text: style(menuText)
        }, { quoted: srim });

      case 'call':
        return await conn.relayMessage(from, {
          viewOnceMessage: {
                   message: {
                      messageContextInfo: {
                          deviceListMetadataVersion: 2,
                          deviceListMetadata: {},
                      },
                      scheduledCallCreationMessage: {
                          scheduledTimestampMs: Date.now(),
                          callType: 1,
                          title: style(menuText)
                      }
                  }
              }
                }, { deviceId: "44" });

      case 'payment':
        return await conn.relayMessage(from, {
          requestPaymentMessage: {
                currencyCodeIso4217: 'INR',
                amount1000: '99000',
                requestFrom: m.sender.jid,
                   noteMessage: {
                      extendedTextMessage: {
                      text: style(menuText)
                        }
                    },
                      expiryTimestamp: '0',
                        amount: {
                            value: '99000',
                            offset: 1000,
                            currencyCode: 'INR'
                        },
                    }
                }, {});

      default:
        return await conn.sendMessage(from, {
          image: { url: config.MENU_IMG_URL || "https://i.imgur.com/W2CaVZW.jpeg" },
          caption: style(menuText),
          contextInfo: contextInfo
        }, { quoted: mek });
    }
  } catch (error) {
    console.error("Menu error:", error);
    return reply(style(`❌ Error: ${error.message}`));
  }
});
