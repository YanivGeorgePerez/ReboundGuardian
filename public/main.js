// main.js

let recaptchaWidgetId;
let addingToken = false;
let localTokens = []; // We'll store the user's tokens in memory from localStorage

// Fired on page load
window.onload = function () {
  // Possibly skip reCAPTCHA if on localhost
  if (!isLocalhost()) {
    recaptchaWidgetId = grecaptcha.render(document.createElement('div'), {
      sitekey: window.recaptchaSiteKey,
      size: 'invisible',
      callback: onCaptchaSuccess
    });
  }
  loadTheme();    // Load theme from localStorage
  loadLocalTokens(); // Load tokens from localStorage
  drawLocalTokens();
  loadTokensFromServer(); // Also fetch server session tokens, if needed
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

/** Print a message to the console area */
function appendConsole(message) {
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.textContent = `[${time}] ${message}`;
  consoleLog.appendChild(line);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

/** Retrieve tokens from localStorage into localTokens array */
function loadLocalTokens() {
  try {
    const str = localStorage.getItem('localTokens');
    if (str) {
      localTokens = JSON.parse(str);
    } else {
      localTokens = [];
    }
  } catch (err) {
    localTokens = [];
    console.error('Error parsing localStorage tokens.', err);
  }
}

/** Save our localTokens array to localStorage */
function saveLocalTokens() {
  localStorage.setItem('localTokens', JSON.stringify(localTokens));
}

/** Re-draw tokens from localTokens array, showing masked tokens only */
function drawLocalTokens() {
  tokensList.innerHTML = '';
  localTokens.forEach((t) => {
    const masked = '••••••••'; // always show 8 bullets, or partial
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.innerHTML = `
      <span style="margin-right:0.5rem;">${masked}</span>
      <span style="font-size:0.8rem; color: #777;">(Saved)</span>
    `;
    tokensList.appendChild(cardDiv);
  });
}

/** Optionally also fetch tokens from server's session, if needed  */
async function loadTokensFromServer() {
  try {
    const { data } = await axios.get('/api/tokens');
    // The server might have a separate session list. 
    // For demonstration, we won't merge them. We'll rely on localTokens for re-persistence.
    // If you want to sync them, you'd do that here.
    if (data.length) {
      appendConsole(`Server session has ${data.length} tokens as well.`);
    }
  } catch (err) {
    console.error(err);
    appendConsole('Error loading server tokens.');
  }
}

// "Add Token" button click
addTokenBtn.addEventListener('click', () => {
  const val = tokenInput.value.trim();
  if (!val) {
    alert('Please enter a Discord token.');
    return;
  }
  if (localTokens.length >= 3) {
    alert('Max 3 tokens in local storage. Remove one or proceed with these.');
    return;
  }

  addingToken = true;
  addTokenBtn.disabled = true;
  addTokenBtn.textContent = 'Verifying...';

  // If on localhost => skip reCAPTCHA
  if (isLocalhost()) {
    onCaptchaSuccess(null);
  } else {
    if (typeof grecaptcha !== 'undefined' && recaptchaWidgetId) {
      grecaptcha.execute(recaptchaWidgetId);
    } else {
      onCaptchaFail();
    }
  }
});

/** If reCAPTCHA fails or not available */
function onCaptchaFail() {
  addingToken = false;
  addTokenBtn.disabled = false;
  addTokenBtn.textContent = 'Add Token';
  appendConsole('CAPTCHA error. Could not verify.');
}

/** reCAPTCHA success => add token to localStorage & server (if needed) */
async function onCaptchaSuccess(captchaToken) {
  if (!addingToken) return;

  const tokenVal = tokenInput.value.trim();
  try {
    localTokens.push(tokenVal);
    saveLocalTokens();
    drawLocalTokens();

    const body = { token: tokenVal };
    if (!isLocalhost()) {
      body.captchaToken = captchaToken;
    }

    const res = await axios.post('/api/addToken', body);

    if (res.data && res.data.success) {
      appendConsole(`Server accepted token: ${res.data.userData.username}#${res.data.userData.discriminator}`);
    }
  } catch (err) {
    if (err.response?.data?.error) {
      alert(err.response.data.error);
    } else {
      alert('Error adding token.');
    }
  } finally {
    addingToken = false;
    addTokenBtn.disabled = false;
    addTokenBtn.textContent = 'Add Token';
    tokenInput.value = '';

    // ✅ RESET CAPTCHA
    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.reset();
    }
  }
}


/** Start Manager => server route to start the bot logic */
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

/** THEME TOGGLE & PERSISTENCE */

// Restore theme from localStorage
function loadTheme() {
  const saved = localStorage.getItem('savedTheme');
  const isDark = saved === 'dark';
  document.body.classList.toggle('dark', isDark);
  themeToggle.checked = isDark;
}

// Save theme to localStorage
themeToggle.addEventListener('change', () => {
  const dark = themeToggle.checked;
  document.body.classList.toggle('dark', dark);
  localStorage.setItem('savedTheme', dark ? 'dark' : 'light');
});
