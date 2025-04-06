let addingToken = false;
let localTokens = [];
let botRunning = false;

// DOM elements
const tokenInput = document.getElementById('tokenInput');
const addTokenBtn = document.getElementById('addTokenBtn');
const tokensList = document.getElementById('tokensList');
const consoleLog = document.getElementById('consoleLog');
const startBtn = document.getElementById('startBtn');
const themeToggle = document.getElementById('themeToggle');
const resetBtn = document.getElementById('resetTokensBtn');
const botStatusIcon = document.getElementById('botStatusIcon');

// Check localhost
function isLocalhost() {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

const socket = io();

// Socket events
socket.on('connect', () => appendConsole('Connected to server.'));
socket.on('disconnect', () => {
  appendConsole('Disconnected from server.');
  setBotStatus(false);
});
socket.on('log', (msg) => {
  appendConsole(msg);
  if (/started|active/i.test(msg)) setBotStatus(true);
  if (/disconnected/i.test(msg)) setBotStatus(false);
});

// Console logger
function appendConsole(message) {
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.textContent = `[${time}] ${message}`;
  consoleLog.appendChild(line);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

// BOT STATUS
function setBotStatus(active) {
  botRunning = active;
  if (botStatusIcon) {
    botStatusIcon.style.backgroundColor = active ? "#4caf50" : "#f44336";
    botStatusIcon.title = active ? "Bot is running" : "Bot is offline";
  }
}

// Load saved tokens
function loadLocalTokens() {
  try {
    const str = localStorage.getItem('localTokens');
    localTokens = str ? JSON.parse(str) : [];
  } catch {
    localTokens = [];
  }
}

// Save tokens
function saveLocalTokens() {
  localStorage.setItem('localTokens', JSON.stringify(localTokens));
}

// Draw token list
function drawLocalTokens() {
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

// Reset saved tokens
resetBtn?.addEventListener('click', () => {
  localTokens = [];
  saveLocalTokens();
  drawLocalTokens();
  appendConsole('🔁 Cleared saved accounts.');
});

// Load session tokens from backend
async function loadTokensFromServer() {
  try {
    const { data } = await axios.get('/api/tokens');
    if (data.length) {
      appendConsole(`Session has ${data.length} token(s).`);
    }
  } catch {
    appendConsole('Error loading session tokens.');
  }
}

// ADD TOKEN BUTTON
addTokenBtn.addEventListener('click', () => {
  const val = tokenInput.value.trim();
  if (!val) return alert('Enter a Discord token.');
  if (localTokens.length >= 3) return alert('You can only add 3 tokens.');

  addingToken = true;
  addTokenBtn.disabled = true;
  addTokenBtn.textContent = 'Verifying...';

  if (isLocalhost()) {
    onCaptchaSuccess(null);
  } else {
    const token = grecaptcha.getResponse();
    if (!token) {
      alert("Please solve the CAPTCHA first.");
      addTokenBtn.disabled = false;
      addTokenBtn.textContent = 'Add Token';
      return;
    }
    onCaptchaSuccess(token);
  }
});

// HANDLE CAPTCHA SUCCESS
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
    addTokenBtn.disabled = false;
    addTokenBtn.textContent = 'Add Token';
    tokenInput.value = '';
    if (!isLocalhost()) grecaptcha.reset(); // 💡 reset checkbox
  }
}

// START MANAGER
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
    alert(err.response?.data?.error || 'Failed to start manager.');
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Manager';
  }
});

// THEME STUFF
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

// INIT
window.onload = function () {
  loadTheme();
  loadLocalTokens();
  drawLocalTokens();
  loadTokensFromServer();
  if (!isLocalhost()) grecaptcha.ready(() => {});
};
