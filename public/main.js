let recaptchaReady = false;
let addingToken = false;
let localTokens = [];
let botRunning = false;

// Fired on page load
window.onload = function () {
  loadTheme();
  loadLocalTokens();
  drawLocalTokens();
  loadTokensFromServer();

  if (!isLocalhost()) {
    recaptchaReady = true;
  }
};

function isLocalhost() {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

const socket = io();
const tokenInput = document.getElementById('tokenInput');
const addTokenBtn = document.getElementById('addTokenBtn');
const tokensList = document.getElementById('tokensList');
const consoleLog = document.getElementById('consoleLog');
const startBtn = document.getElementById('startBtn');
const themeToggle = document.getElementById('themeToggle');
const resetBtn = document.getElementById('resetTokensBtn');
const botStatusIcon = document.getElementById('botStatusIcon');

// Socket events
socket.on('connect', () => appendConsole('Connected to server.'));
socket.on('disconnect', () => appendConsole('Disconnected from server.'));
socket.on('log', (msg) => {
  appendConsole(msg);
  if (msg.toLowerCase().includes('started') || msg.toLowerCase().includes('active')) {
    setBotStatus(true);
  } else if (msg.toLowerCase().includes('disconnected')) {
    setBotStatus(false);
  }
});

function appendConsole(message) {
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.textContent = `[${time}] ${message}`;
  consoleLog.appendChild(line);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

function setBotStatus(running) {
  botRunning = running;
  if (botStatusIcon) {
    botStatusIcon.style.backgroundColor = running ? "#4caf50" : "#f44336";
    botStatusIcon.title = running ? "Bot is running" : "Bot is not running";
  }
}

function loadLocalTokens() {
  try {
    const str = localStorage.getItem('localTokens');
    localTokens = str ? JSON.parse(str) : [];
  } catch (err) {
    localTokens = [];
    console.error('Error parsing localStorage tokens.', err);
  }
}

function saveLocalTokens() {
  localStorage.setItem('localTokens', JSON.stringify(localTokens));
}

function drawLocalTokens() {
  tokensList.innerHTML = '';
  localTokens.forEach((t, index) => {
    const masked = '••••••••';
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.innerHTML = `
      <span>${masked}</span>
      <span style="font-size:0.8rem; color: #777;">(Saved)</span>
    `;
    tokensList.appendChild(cardDiv);
  });
}

resetBtn.addEventListener('click', () => {
  localTokens = [];
  saveLocalTokens();
  drawLocalTokens();
  appendConsole('Local tokens cleared.');
});

async function loadTokensFromServer() {
  try {
    const { data } = await axios.get('/api/tokens');
    if (data.length) {
      appendConsole(`Server session has ${data.length} tokens.`);
    }
  } catch (err) {
    console.error(err);
    appendConsole('Error loading server tokens.');
  }
}

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
    const response = grecaptcha.getResponse();
    if (!response) {
      alert("Please complete the CAPTCHA.");
      addTokenBtn.disabled = false;
      addTokenBtn.textContent = 'Add Token';
      return;
    }
    onCaptchaSuccess(response);
  }
});

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
    if (res.data && res.data.success) {
      appendConsole(`✅ Token added: ${res.data.userData.username}#${res.data.userData.discriminator}`);
    }
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to add token.');
  } finally {
    addingToken = false;
    addTokenBtn.disabled = false;
    addTokenBtn.textContent = 'Add Token';
    tokenInput.value = '';
    if (!isLocalhost()) grecaptcha.reset(); // reset CAPTCHA for next try
  }
}

startBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  startBtn.disabled = true;
  startBtn.textContent = 'Starting...';
  try {
    const res = await axios.post('/api/start');
    if (res.data && res.data.success) {
      appendConsole('🚀 Bot started successfully!');
      setBotStatus(true);
    }
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to start manager.');
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Manager';
  }
});

function loadTheme() {
  const saved = localStorage.getItem('savedTheme');
  const isDark = saved === 'dark';
  document.body.classList.toggle('dark', isDark);
  themeToggle.checked = isDark;
}

themeToggle.addEventListener('change', () => {
  const dark = themeToggle.checked;
  document.body.classList.toggle('dark', dark);
  localStorage.setItem('savedTheme', dark ? 'dark' : 'light');
});