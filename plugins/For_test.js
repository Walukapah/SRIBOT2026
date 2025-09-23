const os = require("os");
const { cmd, commands } = require("../command");
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, Func, fetchJson, } = require("../lib/functions");
const axios = require("axios");
const config = require("../config");


const menuCommand = {
  pattern: "menu4",
  react: "📜",
  category: "main",
  use: ".menu",
  alias: ["panel", "list", "commands", "cmd"],
};
menuCommand.desc = "Get bot's command list.";
menuCommand.dontAddCommandList = true;
menuCommand.use = ".menu4";
menuCommand.filename = __filename;

cmd(menuCommand, async (client, message, args, { from, prefix, pushname, reply }) => {
  try {

    // Organize commands by category
    const categories = [];
    const categoryMap = new Map();
    for (let command of commands) {
      if (!command.dontAddCommandList && command.pattern && command.category.toLowerCase() !== "misc") {
        const category = command.category.toUpperCase();
        if (!categoryMap.has(category)) {
          categories.push(category);
          categoryMap.set(category, []);
        }
        categoryMap.get(category).push(command.pattern);
      }
    }

    // Prepare menu items
    const menuItems = [];
    for (let i = 0; i < categories.length; i++) {
      menuItems.push({
        title: i + 1,
        description: categories[i] + " MENU",
        rowId: prefix + "category " + categories[i],
      });
    }

    // Create menu structure
    const menuSection = {
      title: '',
      rows: menuItems,
    };
    const menuSections = [menuSection];

    // Prepare image and caption
    const image = { url: imageUrl };
    const caption = `*🫣💗👋𝗛𝗘𝗟𝗟𝗢𝗪* ${pushname}

> 🥷𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 𝗗𝗘𝗩𝗜𝗟-𝗧𝗘𝗖𝗛-𝗠𝗗 𝗪𝗛𝗔𝗧𝗛𝗔𝗣𝗣 𝗕𝗢𝗧💀

╭═════════════════●●►
│◦ 🥷 𝗕𝗢𝗧 𝗡𝗔𝗠𝗘 : *𝗗𝗘𝗩𝗜𝗟-𝗧𝗘𝗖𝗛-𝗠𝗗*
│◦ 🥷 𝗢𝗪𝗡𝗘𝗥 𝗡𝗨𝗠𝗕𝗘𝗥 :  *+94702884908*
│◦ 🥷 𝗨𝗣𝗧𝗜𝗠𝗘 : ${runtime(process.uptime())}
│◦ 🥷 𝗥𝗔𝗠 : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
│◦ 🥷 𝗣𝗥𝗘𝗙𝗜𝗫 : ${prefix}
╰═════════════════●●►


> *© ᴘᴏᴡᴇʀᴅ ʙʏ ᴅᴀʀᴋ ᴛᴇᴄʜ ᴢᴏɴᴇ™❗*
`;

    const menuMessage = {
      caption: caption,
      image: "https://i.ibb.co/27Gbs6bR/1234.jpg",
      footer: "> *© ᴘᴏᴡᴇʀᴅ ʙʏ ᴅᴀʀᴋ ᴛᴇᴄʜ ᴢᴏɴᴇ™❗*",
      title: '',
      buttonText: "*🔢 Reply the Number you want to select*",
      sections: menuSections,
    };

    const options = { quoted: message };
    return await client.replyList(from, menuMessage, options);
  } catch (error) {
    reply("*Error !!*");
    console.error(error);
  }
});

// Function to determine hosting environment
function determineHostname() {
  const hostnameLength = os.hostname().length;
  if (hostnameLength === 12) return "replit";
  if (hostnameLength === 72) return "heroku";
  if (hostnameLength === 8) return "koyeb";
  return os.hostname();
}

// Command: Category
const categoryCommand = {
  pattern: "category",
  dontAddCommandList: true,
};

cmd(categoryCommand, async (client, message, args, { from, q: query, pushname, reply }) => {
  try {

    const category = query.trim().toUpperCase();
    if (category === "MISC") return;

    let commandList = `
*𝗛𝗘𝗟𝗟𝗢𝗪🥷💗* ${pushname}

*╭─⊷〔𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦 𝗣𝗔𝗡𝗘𝗟〕━┈⊷*
*│🥷 𝗥𝗔𝗠 𝗨𝗦𝗔𝗚𝗘 -* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB
*│🥷 𝗥𝗨𝗡𝗧𝗜𝗠𝗘 -* ${runtime(process.uptime())}
*╰═════════════════⚆*

*╭═══════════════⚆*
*│🥷 ${category} 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 𝗹𝗶𝘀𝘁:*
*╰═══════════════⚆*

`;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.category.toUpperCase() === category) {
        commandList += `
*╭═══════════════⚆🔅*
*│🥷𝗖𝗼𝗺𝗺𝗮𝗻𝗱:* ${command.pattern}
*│🥷𝗨𝘀𝗲:* ${command.use}
*╰═══════════════⚆*🔅

`;
      }
    }

    const totalCommands = commands.filter(cmd => cmd.category.toUpperCase() === category).length;
    commandList += `\n➠ *Total Commands in ${category}:* ${totalCommands}\n\n> *© ᴘᴏᴡᴇʀᴅ ʙʏ ᴅᴀʀᴋ ᴛᴇᴄʜ ᴢᴏɴᴇ™❗*`;

    const encodedCategory = encodeURIComponent(category);

    const image = { url: 'https://i.ibb.co/27Gbs6bR/1234.jpg' };
    const messageContent = {
      image: image,
      caption: commandList,
    };
    const options = { quoted: message };
    await client.sendMessage(from, messageContent, options);
  } catch (error) {
    reply("*Error !!*");
    console.error(error);
  }
});

const updateCommand = {
  pattern: "update",
  alias: ["restart"],
  desc: "Restart the bot",
  category: "owner",
  use: ".update",
  react: "🚀",
  filename: __filename
};
cmd(updateCommand, async (bot, message, args, extra) => {
  try {
    const { isOwner, reply } = extra;
    if (!isOwner) {
      return reply("Only the owner can use this command.");
    }
    const { exec } = require("child_process");
    await bot.sendMessage(extra.from, { text: "*Updating...*" }, { quoted: message });
    await bot.sendMessage(extra.from, { text: "*Update Done ✔*" }, { quoted: message });
    await sleep(1500);
    exec("pm2 restart all");
  } catch (error) {
    console.log(error);
    reply("" + error);
  }
});

cmd({
  pattern: "selecttest",
  desc: "Send image + all button types including single_select",
  category: "main",
  react: "📑",
  filename: __filename,
}, async (conn, mek, m, { from }) => {
  try {
    await conn.sendMessage(from, { react: { text: "📑", key: mek.key } });

    const interactiveButtons = [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "📚 Select a Category",
          sections: [
            {
              title: "🔍 Past Paper Sections",
              highlight_label: "Recommended",
              rows: [
                {
                  header: "Combined Maths",
                  title: "A/L 2023 Paper",
                  description: "Past Paper for Combined Maths A/L 2023",
                  id: ".wiki Combined Maths A/L 2023"
                },
                {
                  header: "Physics",
                  title: "Model Paper",
                  description: "2023 Physics Model Paper",
                  id: ".wiki Physics Model 2023"
                }
              ]
            }
          ]
        })
      },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "Visit API Site",
          url: "https://pornhub.com"
        })
      },
      {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: "Copy Access Code",
          id: "copy_access",
          copy_code: "DTZ-AL2025"
        })
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "Quick Help",
          id: ".menu"
        })
      }
    ];

    const interactiveMessage = {
      image: { url: "https://files.catbox.moe/gxgikz.jpg" },
      caption: "🖼️ Select your past paper category or visit API site.",
      title: "🎓 DTZ Study Assistant",
      footer: "Powered by Chathura Bot ⚡",
      interactiveButtons
    };

    await conn.sendMessage(from, interactiveMessage, { quoted: mek });

  } catch (e) {
    console.error("selecttest error:", e);
    await conn.sendMessage(from, {
      text: "❌ Error: " + e.message
    }, { quoted: mek });
  }
});
