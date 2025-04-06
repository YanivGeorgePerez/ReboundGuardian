require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const {
  verifyToken,
  startSelfbotsForSession
} = require('./ReboundGuardian');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ----------------------
// SESSION CONFIGURATION
// ----------------------
app.set('trust proxy', 1); // <-- required when behind a proxy

app.set('trust proxy', 1);
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,      // real SSL from CF → your server
    sameSite: 'none',  // okay because we have secure: true
    httpOnly: true
  }
});



app.use(sessionMiddleware);
app.use(bodyParser.json());

// ----------------------
// STATIC FILES
// ----------------------
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------
// SOCKET.IO HANDLING
// ----------------------
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.on('connection', (socket) => {
  const sessionID = socket.request.sessionID;
  socket.join(sessionID);
  console.log(`[Socket] Connected session ${sessionID}`);

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected session ${sessionID}`);
  });
});

// ----------------------
// UTIL FUNCTION
// ----------------------
function initSessionData(req) {
  if (!req.session.tokens) req.session.tokens = [];
}

// ----------------------
// API: ADD TOKEN
// ----------------------
app.post('/api/addToken', async (req, res) => {
  initSessionData(req);

  const { captchaToken, token } = req.body;
  if (!token) return res.status(400).json({ error: 'No Discord token provided.' });

  // Optional: allow bypassing captcha on localhost
  const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  if (!isLocalhost) {
    if (!captchaToken) {
      return res.status(400).json({ error: 'Missing reCAPTCHA token.' });
    }

    const captchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.CAPTCHA_SECRET_KEY}&response=${captchaToken}`;
    try {
      const { data } = await axios.post(captchaVerifyUrl);
      if (!data.success) {
        return res.status(400).json({ error: 'CAPTCHA verification failed.' });
      }
    } catch {
      return res.status(500).json({ error: 'Error verifying CAPTCHA.' });
    }
  }

  if (req.session.tokens.length >= 3) {
    return res.status(400).json({ error: 'Max 3 tokens per session.' });
  }

  if (req.session.tokens.find(t => t.token === token)) {
    return res.status(400).json({ error: 'Token already added in this session.' });
  }

  const userData = await verifyToken(token);
  if (!userData) {
    return res.status(400).json({ error: 'Invalid token.' });
  }

  req.session.tokens.push({ token, userData });
  return res.json({ success: true, userData });
});

// ----------------------
// API: GET SESSION TOKENS
// ----------------------
app.get('/api/tokens', (req, res) => {
  initSessionData(req);
  const minimal = req.session.tokens.map(t => ({
    userData: {
      id: t.userData.id,
      username: t.userData.username,
      discriminator: t.userData.discriminator,
      avatar: t.userData.avatar
    }
  }));
  res.json(minimal);
});

// ----------------------
// API: START MANAGER
// ----------------------
app.post('/api/start', async (req, res) => {
  initSessionData(req);

  if (!req.session.tokens.length) {
    return res.status(400).json({ error: 'No tokens to start. Add at least one.' });
  }

  try {
    const sessionID = req.sessionID;
    startSelfbotsForSession(sessionID, req.session.tokens, io);
    return res.json({ success: true, message: 'Manager started successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to start manager.' });
  }
});

// ----------------------
// PAGE RENDERING
// ----------------------

// Index route
app.get('/', (req, res) => {
  res.render('index', {
    siteKey: process.env.CAPTCHA_SITE_KEY || ''
  });
});

// Fallback: only render index for non-API routes
// Only render index if it's a regular page request
app.use((req, res, next) => {
    const url = req.originalUrl;
  
    // Skip rendering for known backend/API/socket routes
    if (url.startsWith('/api') || url.startsWith('/socket.io')) {
      return res.status(404).json({ error: 'Not found' });
    }
  
    // Otherwise, render frontend
    res.render('index', {
      siteKey: process.env.CAPTCHA_SITE_KEY || ''
    });
  });
  
  

// ----------------------
// START SERVER
// ----------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ ReboundGuardian running at http://localhost:${PORT}`);
});
