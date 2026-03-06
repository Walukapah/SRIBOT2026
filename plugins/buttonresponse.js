const { cmd } = require('../command');
const config = require('../config');
const { runtime } = require('../lib/functions');

// Handle all button responses in one place
cmd({
    on: "text",
    pattern: ".*",
    dontAddCommandList: true,
    filename: __filename
}, async (conn, mek, m, { from, body, reply, sender }) => {
    
    // Check if it's a button response
    const buttonPrefixes = ['btn_', 'img_', 'quick_', 'buff_', 'local_', 'vid_', 'cmd_', 'menu_', 'alive_', 'custom_'];
    const isButtonResponse = buttonPrefixes.some(prefix => body.startsWith(prefix));
    
    if (!isButtonResponse) return; // Not a button response, ignore
    
    console.log(`[BUTTON RESPONSE] ${body} from ${sender}`);
    
    // Response mapping
    const responses = {
        // Image button responses
        'img_confirm': '✅ You confirmed! Action completed successfully.',
        'img_cancel': '❌ You cancelled the operation.',
        'img_like': '❤️ Thanks for liking our image!',
        'img_share': '🔁 Please share this bot with your friends!',
        
        // Quick button responses
        'quick_yes': '✅ You selected YES! Great choice.',
        'quick_no': '❌ You selected NO! Maybe next time.',
        
        // Buffer responses
        'buff_awesome': '🎉 Awesome! The buffer system works perfectly.',
        'buff_good': '👍 Good! Everything is functioning correctly.',
        
        // Local image responses
        'local_success': '✅ Local image loading works! Your setup is correct.',
        'local_fail': '❌ If you see this, the image loaded but you clicked fail.',
        
        // Video responses
        'vid_like': '❤️ Thanks for liking the video!',
        'vid_share': '🔁 Sharing is caring! Spread the word.',
        
        // Custom menu responses
        'custom_1': '✅ You selected Option 1',
        'custom_2': '✅ You selected Option 2',
        'custom_3': '✅ You selected Option 3',
        
        // Alive button responses
        'alive_menu': '📜 Use .menu for full command list!',
        'alive_ping': `🏓 Pong! Bot is running fast!`,
        'alive_owner': `👤 Owner: ${config.OWNER_NUMBER[0] || 'Not set'}\nUse .owner for details.`,
        
        // Command category responses
        'cmd_ping': '🚀 Use .ping to check bot response speed!',
        'cmd_owner': '👤 Use .owner to contact the bot owner.',
        'cmd_about': `ℹ️ ${config.BOT_NAME}\nVersion: ${config.VERSION}\nMode: ${config.MODE}`,
        'cmd_link': '🔗 Use .invite to get group invite link.',
        'cmd_promote': '👮 Use .promote @user to make someone admin.',
        'cmd_kick': '🚫 Use .kick @user to remove a member.',
        'cmd_sticker': '🖼️ Use .sticker to create stickers from images.',
        'cmd_music': '🎵 Use .play or .ytmp3 to download music.',
        'cmd_joke': '😂 Joke feature coming soon! Stay tuned.',
        'cmd_all': '📜 Full command list:\n.ping - Check speed\n.owner - Contact owner\n.menu - Show menu\n.testbuttons - Button demo\n.imgbtn - Image buttons',
        
        // Menu responses
        'menu_ping': '🏓 Bot speed test: Use .ping',
        'menu_owner': '👤 Contact owner: Use .owner',
        'menu_about': `🤖 ${config.BOT_NAME} v${config.VERSION}`,
        'menu_glink': '🔗 Group link: Use .invite',
        'menu_admins': '👮 Admin list: Use .admins',
        'menu_kick': '🚫 Remove member: Use .kick @user',
        'menu_sticker': '🖼️ Sticker maker: Use .sticker',
        'menu_audio': '🎵 Audio tools: Use .ytmp3',
        'menu_video': '📹 Video downloader: Use .ytmp4',
        
        // Help
        'btn_help': `ℹ️ *SRI-BOT Help*\n\nAvailable commands:\n• .imgbtn - Image with buttons\n• .imgmenu - Image menu\n• .quickimg - Fast image buttons\n• .imgbuffer - Downloaded image\n• .localimg - Local file test\n• .vidbtn - Video with buttons\n• .alivebtn - Alive with buttons\n• .custommenu - Build custom menu\n\nPrefix: ${config.PREFIX}`
    };
    
    const responseText = responses[body];
    
    if (responseText) {
        await reply(responseText);
    } else {
        // Unknown button ID
        await reply(`📌 Button received: *${body}*\n\nThis button is not configured yet. Use .help for available commands.`);
    }
});
