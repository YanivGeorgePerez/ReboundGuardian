// ReboundGuardian.js
const { Client } = require('discord.js-selfbot-v13');
const { XMLHttpRequest } = require('xmlhttprequest');
const axios = require('axios');

// Session ID => [{ client, token }]
const sessionBotsMap = {};

/** Emit log to all sockets in a session */
function broadcastToSession(io, sessionID, message) {
  io.to(sessionID).emit('log', message);
}

/** Verify Discord token */
async function verifyToken(token) {
  try {
    const res = await axios.get('https://discord.com/api/v9/users/@me', {
      headers: { Authorization: token }
    });
    return res.data;
  } catch {
    return null;
  }
}

/** Re-add user to group chat */
function addMemberToChannel(memberId, channelId, token) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `https://discord.com/api/v9/channels/${channelId}/recipients/${memberId}`);
    xhr.setRequestHeader('Authorization', token);
    xhr.setRequestHeader('User-Agent', 'Mozilla/5.0');
    xhr.onload = () => xhr.status === 204 ? resolve() : reject(`❌ Failed: ${xhr.status}`);
    xhr.onerror = () => reject('❌ Network error');
    xhr.send();
  }).catch(err => {
    console.error(`[AddUser Error] ${err}`);
  });
}

/** Start selfbots for a session */
function startSelfbotsForSession(sessionID, tokens, io) {
  if (sessionBotsMap[sessionID]) {
    broadcastToSession(io, sessionID, '[⚠️] Already running.');
    return;
  }

  const clients = [];
  const accountIds = () => clients.map(c => c.client.user.id);

  tokens.forEach(({ token, userData }) => {
    const client = new Client({ checkUpdate: false });

    client.on('ready', () => {
      broadcastToSession(io, sessionID, `✅ ${userData.username}#${userData.discriminator} ready`);
    });

    client.on('channelRecipientRemove', async (channel, member) => {
      if (!member?.id || !accountIds().includes(member.id)) return;

      const tag = `${member.username || 'Unknown'}#${member.discriminator || '0000'}`;
      broadcastToSession(io, sessionID, `ℹ️ ${tag} removed from ${channel.id}, re-adding...`);

      const t0 = performance.now();
      await addMemberToChannel(member.id, channel.id, token);
      const t1 = performance.now();

      broadcastToSession(io, sessionID, `🔄 Re-added in ${Math.round(t1 - t0)}ms`);
    });

    client.on('disconnect', evt => {
      broadcastToSession(io, sessionID, `❌ Disconnected: ${evt?.reason || 'Unknown'}`);
    });

    client.login(token);
    clients.push({ client, token });
  });

  sessionBotsMap[sessionID] = clients;
  broadcastToSession(io, sessionID, `🚀 Started ${clients.length} selfbot(s)`);
}

/** Stop and clean up session selfbots */
function stopSelfbotsForSession(sessionID, io) {
  const clients = sessionBotsMap[sessionID];
  if (!clients) return;

  clients.forEach(({ client }) => {
    try {
      client.destroy();
    } catch (err) {
      console.error(`[Stop Error] ${err.message}`);
    }
  });

  delete sessionBotsMap[sessionID];
  broadcastToSession(io, sessionID, `🛑 Manager stopped`);
}

module.exports = {
  verifyToken,
  startSelfbotsForSession,
  stopSelfbotsForSession,
  sessionBotsMap
};
