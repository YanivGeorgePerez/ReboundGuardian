// ReboundGuardian.js
const { Client } = require('discord.js-selfbot-v13');
const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const axios = require('axios');

// Keep track of all sessions => tokens => clients
const sessionBotsMap = {};

function broadcastToSession(io, sessionID, message) {
  io.to(sessionID).emit('log', message);
}

// Verify token with Discord
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

function addMemberToChannel(memberId, channelId, token) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `https://discord.com/api/v9/channels/${channelId}/recipients/${memberId}`);
    xhr.setRequestHeader('Authorization', token);
    xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (compatible; ManagerClient)');
    xhr.onload = () => {
      if (xhr.status === 204) resolve();
      else reject(new Error(`Add user failed. Status: ${xhr.status}`));
    };
    xhr.send();
  }).catch(err => {
    console.error('Error addMemberToChannel:', err.message);
  });
}

function startSelfbotsForSession(sessionID, tokens, io) {
  if (sessionBotsMap[sessionID]) {
    broadcastToSession(io, sessionID, '[System] Manager already running for this session.');
    return;
  }

  sessionBotsMap[sessionID] = [];

  function getAccountIds() {
    return sessionBotsMap[sessionID].map(obj => obj.client.user.id);
  }

  for (const { token, userData } of tokens) {
    const client = new Client({ checkUpdate: false });
    
    client.on('ready', () => {
      broadcastToSession(io, sessionID, `✅ Account active: ${userData.username}#${userData.discriminator}`);
    });

    client.on('channelRecipientRemove', async (channel, member) => {
      // If the removed member is in our session's tokens, re-add them
      if (getAccountIds().includes(member.id)) {
        broadcastToSession(io, sessionID, `ℹ️ ${member.user.username}#${member.user.discriminator} removed from channel ${channel.id}, re-adding...`);
        const startTime = Date.now();
        await addMemberToChannel(member.id, channel.id, token);
        const endTime = Date.now();
        broadcastToSession(io, sessionID, `🔄 Re-added in ${endTime - startTime}ms.`);
      }
    });

    client.on('disconnect', (evt) => {
      broadcastToSession(io, sessionID, `❌ Disconnected: ${evt?.reason || 'Unknown'}`);
    });

    client.login(token);
    sessionBotsMap[sessionID].push({ client, token });
  }

  broadcastToSession(io, sessionID, `🚀 Started ${tokens.length} account(s) for session ${sessionID}`);
}

module.exports = {
  verifyToken,
  startSelfbotsForSession
};
