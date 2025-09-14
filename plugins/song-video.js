const { cmd } = require('../command');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');

async function downloadMedia(type, q, reply, conn, from, mek) {
  if (!q) return reply("Please give URL / title 📎");

  // Check if it's a URL
  if (ytdl.validateURL(q)) {
    return await downloadFromUrl(type, q, reply, conn, from, mek);
  }

  // Otherwise search YouTube
  const search = await yts(q);
  const data = search.videos[0];

  if (!data || !data.url) {
    return reply("Couldn't find a valid YouTube video.");
  }

  return await downloadFromUrl(type, data.url, reply, conn, from, mek, data);
}

async function downloadFromUrl(type, url, reply, conn, from, mek, data = null) {
  try {
    // Get video info if not provided from search
    if (!data) {
      const info = await ytdl.getInfo(url);
      data = {
        title: info.videoDetails.title,
        description: info.videoDetails.description,
        timestamp: info.videoDetails.lengthSeconds,
        ago: info.videoDetails.uploadDate,
        views: info.videoDetails.viewCount,
        thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url
      };
    }

    let desc = `
 ⚡ *SRIBOT ${type.toUpperCase()} DOWNLOADER* ⚡
 
 *Title*: ${data.title}
 *Duration*: ${formatTime(data.timestamp)}
 *Uploaded*: ${data.ago}
 *Views*: ${data.views}
 
 *MADE BY SRIBOT* 👤
    `;

    await conn.sendMessage(
      from, 
      { image: { url: data.thumbnail }, caption: desc }, 
      { quoted: mek }
    );

    // Create temp directory if not exists
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const sanitizedTitle = data.title.replace(/[^\w\s]/gi, '');
    const filePath = path.join(tempDir, `${sanitizedTitle}.${type === 'song' ? 'mp3' : 'mp4'}`);

    const downloadOptions = {
      quality: type === 'song' ? 'highestaudio' : 'highestvideo',
      filter: type === 'song' ? 'audioonly' : 'videoandaudio'
    };

    const stream = ytdl(url, downloadOptions)
      .on('error', (err) => {
        console.error('Download error:', err);
        reply('❌ Download failed. Please try again.');
      });

    // For audio, we'll convert to mp3
    if (type === 'song') {
      const ffmpeg = require('fluent-ffmpeg');
      await new Promise((resolve, reject) => {
        ffmpeg(stream)
          .audioBitrate(128)
          .save(filePath)
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      // For video, pipe directly
      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filePath);
        stream.pipe(fileStream)
          .on('finish', resolve)
          .on('error', reject);
      });
    }

    // Send the file
    if (type === 'song') {
      await conn.sendMessage(
        from, 
        { 
          audio: fs.readFileSync(filePath), 
          mimetype: 'audio/mpeg',
          filename: `${sanitizedTitle}.mp3`
        }, 
        { quoted: mek }
      );
    } else {
      await conn.sendMessage(
        from, 
        { 
          video: fs.readFileSync(filePath), 
          mimetype: 'video/mp4',
          filename: `${sanitizedTitle}.mp4`
        }, 
        { quoted: mek }
      );
    }

    // Clean up
    fs.unlinkSync(filePath);

  } catch (e) {
    console.error('Download error:', e);
    reply(`❌ Error: ${e.message}`);
  }
}

function formatTime(seconds) {
  if (!seconds) return 'N/A';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

cmd({
  pattern: "song",
  desc: "Download the song",
  react: "🎵",
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
  try {
    await downloadMedia('song', q, reply, conn, from, mek);
  } catch (e) {
    console.log(e);
    reply(`${e}`);
  }
});

cmd({
  pattern: "video",
  desc: "Download the video",
  react: "🎬",
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
  try {
    await downloadMedia('video', q, reply, conn, from, mek);
  } catch (e) {
    console.log(e);
    reply(`${e}`);
  }
});
