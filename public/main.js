let tokenInput, addTokenBtn, tokensList, consoleLog, startBtn, stopBtn, themeToggle, resetBtn, botStatusIcon;
let addingToken = false;
let localTokens = [];
let botRunning = false;

// Immediately apply saved theme before DOM renders
loadThemeEarly();

// SOCKET
const socket = io();
socket.on('connect', () => appendConsole('✅ Connected to server.'));
socket.on('disconnect', () => {
  appendConsole('❌ Disconnected.');
  setBotStatus(false);
});
socket.on('log', (msg) => {
  appendConsole(msg);
  if (/started|active/i.test(msg)) setBotStatus(true);
  if (/disconnected|stopped/i.test(msg)) setBotStatus(false);
});

// Init after DOM is ready
window.onload = function () {
  tokenInput = document.getElementById('tokenInput');
  addTokenBtn = document.getElementById('addTokenBtn');
  tokensList = document.getElementById('tokensList');
  consoleLog = document.getElementById('consoleLog');
  startBtn = document.getElementById('startBtn');
  stopBtn = document.getElementById('stopBtn');
  themeToggle = document.getElementById('themeToggle');
  resetBtn = document.getElementById('resetTokensBtn');
  botStatusIcon = document.getElementById('botStatusIcon');

  checkManagerStatus();
  loadTheme();
  loadLocalTokens();
  drawLocalTokens();
  loadTokensFromServer();

  addEventListeners();

  if (!isLocalhost()) grecaptcha.ready(() => {});
};

// UTILITIES
function isLocalhost() {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

function appendConsole(message) {
  if (!consoleLog) return;
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.textContent = `[${time}] ${message}`;
  consoleLog.appendChild(line);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

function setBotStatus(active) {
  botRunning = active;
  if (botStatusIcon) {
    botStatusIcon.style.backgroundColor = active ? "#4caf50" : "#f44336";
    botStatusIcon.title = active ? "Bot is running" : "Bot is offline";
  }
}

// THEME
function loadThemeEarly() {
  const saved = localStorage.getItem('savedTheme');
  if (saved === 'dark') {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  }
}

function loadTheme() {
  const saved = localStorage.getItem('savedTheme');
  const isDark = saved === 'dark';
  document.body.classList.toggle('dark', isDark);
  if (themeToggle) themeToggle.checked = isDark;
}

function addEventListeners() {
  if (themeToggle) {
    themeToggle.addEventListener('change', () => {
      const dark = themeToggle.checked;
      document.body.classList.toggle('dark', dark);
      localStorage.setItem('savedTheme', dark ? 'dark' : 'light');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      localTokens = [];
      saveLocalTokens();
      drawLocalTokens();
      try {
        await axios.post('/api/resetTokens');
        appendConsole('🧹 Tokens cleared.');
      } catch {
        appendConsole('⚠️ Could not reset session.');
      }
      if (!isLocalhost() && typeof grecaptcha !== 'undefined') grecaptcha.reset();
    });
  }

  if (addTokenBtn) {
    addTokenBtn.addEventListener('click', () => {
      const val = tokenInput.value.trim();
      if (!val) return alert('Enter a Discord token.');
      if (localTokens.length >= 3) return alert('Max 3 tokens.');

      addingToken = true;
      addTokenBtn.disabled = true;
      addTokenBtn.textContent = 'Verifying...';

      if (isLocalhost()) {
        onCaptchaSuccess(null);
      } else {
        const token = grecaptcha.getResponse();
        if (!token) {
          alert("Solve the CAPTCHA first.");
          addTokenBtn.disabled = false;
          addTokenBtn.textContent = 'Add Token';
          return;
        }
        onCaptchaSuccess(token);
      }
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      startBtn.disabled = true;
      startBtn.textContent = 'Starting...';
      try {
        const res = await axios.post('/api/start');
        if (res.data?.success) {
          appendConsole('🚀 Manager started!');
          setBotStatus(true);
        }
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to start.');
      } finally {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Manager';
      }
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', async () => {
      stopBtn.disabled = true;
      stopBtn.textContent = 'Stopping...';
      try {
        const res = await axios.post('/api/stop');
        if (res.data?.success) {
          appendConsole('🛑 Manager stopped.');
          setBotStatus(false);
        }
      } catch {
        appendConsole('❌ Error stopping.');
      } finally {
        stopBtn.disabled = false;
        stopBtn.textContent = 'Stop Manager';
      }
    });
  }
}

// CAPTCHA
async function onCaptchaSuccess(captchaToken) {
  if (!addingToken) return;

  const tokenVal = tokenInput.value.trim();
  try {
    localTokens.push(tokenVal);
    saveLocalTokens();
    drawLocalTokens();

    const body = { token: tokenVal };
    if (!isLocalhost()) body.captchaToken = captchaToken;

    const res = await axios.post('/api/addToken', body);
    if (res.data?.success) {
      appendConsole(`✅ Token added: ${res.data.userData.username}#${res.data.userData.discriminator}`);
    }
  } catch (err) {
    alert(err.response?.data?.error || 'Error adding token.');
  } finally {
    addingToken = false;
    if (addTokenBtn) {
      addTokenBtn.disabled = false;
      addTokenBtn.textContent = 'Add Token';
    }
    if (tokenInput) tokenInput.value = '';
    if (!isLocalhost()) grecaptcha.reset();
  }
}

// TOKENS
function loadLocalTokens() {
  try {
    const str = localStorage.getItem('localTokens');
    localTokens = str ? JSON.parse(str) : [];
  } catch {
    localTokens = [];
  }
}

function saveLocalTokens() {
  localStorage.setItem('localTokens', JSON.stringify(localTokens));
}

function drawLocalTokens() {
  if (!tokensList) return;
  tokensList.innerHTML = '';
  localTokens.forEach(() => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.innerHTML = `
      <span>••••••••</span>
      <span style="font-size:0.8rem; color: #777;">(Saved)</span>
    `;
    tokensList.appendChild(cardDiv);
  });
}

// STATUS CHECK
async function checkManagerStatus() {
  try {
    const res = await axios.get('/api/status');
    if (res.data?.active) {
      appendConsole('🟢 Manager is active.');
      setBotStatus(true);
    }
  } catch {
    appendConsole('🔴 Could not check manager status.');
  }
}

// SESSION
async function loadTokensFromServer() {
  try {
    const { data } = await axios.get('/api/tokens');
    if (data.length) {
      appendConsole(`📦 Server session has ${data.length} token(s).`);
    }
  } catch {
    appendConsole('⚠️ Error loading session tokens.');
  }
}
