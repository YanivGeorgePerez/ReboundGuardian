// main.js

let recaptchaWidgetId;
let addingToken = false;

// Called when the page loads
window.onload = function () {
  // If not on localhost, we render the invisible reCAPTCHA
  if (!isLocalhost()) {
    recaptchaWidgetId = grecaptcha.render(document.createElement('div'), {
      sitekey: window.recaptchaSiteKey,
      size: 'invisible',
      callback: onCaptchaSuccess
    });
  }
  loadTheme();    // Load theme from localStorage
  loadTokens();   // Load existing tokens
};

// Check if hostname is localhost
function isLocalhost() {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

const socket = io();

// DOM references
const tokenInput = document.getElementById('tokenInput');
const addTokenBtn = document.getElementById('addTokenBtn');
const tokensList = document.getElementById('tokensList');
const consoleLog = document.getElementById('consoleLog');
const startBtn = document.getElementById('startBtn');
const themeToggle = document.getElementById('themeToggle');

// Socket events
socket.on('connect', () => appendConsole('Connected to server.'));
socket.on('disconnect', () => appendConsole('Disconnected from server.'));
socket.on('log', (msg) => appendConsole(msg));

/**
 * Append a line to the console area
 * @param {string} message
 */
function appendConsole(message) {
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.textContent = `[${time}] ${message}`;
  consoleLog.appendChild(line);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

/**
 * Fetch the session's tokens from the server, then display them
 */
async function loadTokens() {
  try {
    const { data } = await axios.get('/api/tokens');
    drawTokens(data);
  } catch (err) {
    console.error(err);
    appendConsole('Error loading tokens.');
  }
}

/**
 * Redraw the tokens list
 * @param {Array} tokenArray
 */
function drawTokens(tokenArray) {
  tokensList.innerHTML = '';
  tokenArray.forEach((t) => {
    const avatarUrl = t.userData.avatar
      ? `https://cdn.discordapp.com/avatars/${t.userData.id}/${t.userData.avatar}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.innerHTML = `
      <img src="${avatarUrl}" alt="avatar"
           style="width:40px; height:40px; border-radius:50%; margin-right:0.5rem;">
      <div>
        <div style="font-weight:600;">${t.userData.username}#${t.userData.discriminator}</div>
        <div style="font-size:0.8rem; color: #777;">ID: ${t.userData.id}</div>
      </div>
    `;
    tokensList.appendChild(cardDiv);
  });
}

// Handle "Add Token" click
addTokenBtn.addEventListener('click', () => {
  const val = tokenInput.value.trim();
  if (!val) {
    alert('Please enter a Discord token.');
    return;
  }
  addingToken = true;
  addTokenBtn.disabled = true;
  addTokenBtn.textContent = 'Verifying...';

  // If we're on localhost, skip reCAPTCHA
  if (isLocalhost()) {
    // Just call the captcha success function directly
    onCaptchaSuccess(null); 
  } else {
    // Execute reCAPTCHA invisible flow
    if (typeof grecaptcha !== 'undefined' && recaptchaWidgetId) {
      grecaptcha.execute(recaptchaWidgetId);
    } else {
      // Something's off with reCAPTCHA
      onCaptchaFail();
    }
  }
});

/**
 * Called if reCAPTCHA fails to load or user can't do it
 */
function onCaptchaFail() {
  addingToken = false;
  addTokenBtn.disabled = false;
  addTokenBtn.textContent = 'Add Token';
  appendConsole('CAPTCHA error. Could not verify.');
}

/**
 * The reCAPTCHA success callback
 * @param {string|null} captchaToken
 */
async function onCaptchaSuccess(captchaToken) {
  // If user canceled or something
  if (!addingToken) {
    return;
  }

  const tokenVal = tokenInput.value.trim();
  try {
    const body = { token: tokenVal };
    // Only send captchaToken if not on localhost
    if (!isLocalhost()) {
      body.captchaToken = captchaToken;
    }

    // POST to add token
    const res = await axios.post('/api/addToken', body);
    if (res.data && res.data.success) {
      appendConsole(`Token added: ${res.data.userData.username}#${res.data.userData.discriminator}`);
      tokenInput.value = '';
      await loadTokens();
    }
  } catch (err) {
    if (err.response && err.response.data && err.response.data.error) {
      alert(err.response.data.error);
    } else {
      alert('Error adding token.');
    }
  } finally {
    addingToken = false;
    addTokenBtn.disabled = false;
    addTokenBtn.textContent = 'Add Token';
  }
}

// Handle "Start Manager" click
startBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  startBtn.disabled = true;
  startBtn.textContent = 'Starting...';
  try {
    const res = await axios.post('/api/start');
    if (res.data && res.data.success) {
      appendConsole('Unkickable Manager started successfully!');
    }
  } catch (err) {
    if (err.response?.data?.error) {
      alert(err.response.data.error);
    } else {
      alert('Error starting manager.');
    }
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Manager';
  }
});

/* THEME TOGGLE & PERSISTENCE */

// Load theme from localStorage
function loadTheme() {
  const saved = localStorage.getItem('savedTheme');
  const isDark = saved === 'dark';       // if stored "dark", apply it
  document.body.classList.toggle('dark', isDark);
  // Reflect that in the checkbox
  themeToggle.checked = isDark;
}

// Save theme to localStorage whenever changed
themeToggle.addEventListener('change', () => {
  const dark = themeToggle.checked;
  document.body.classList.toggle('dark', dark);
  localStorage.setItem('savedTheme', dark ? 'dark' : 'light');
});
