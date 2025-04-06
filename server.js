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

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: true
});

app.use(sessionMiddleware);
app.use(bodyParser.json());

// Static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io with session handling
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

// Helper: ensure session tokens exist
function initSessionData(req) {
  if (!req.session.tokens) {
    req.session.tokens = [];
  }
}

// Add token route w/ reCAPTCHA
app.post('/api/addToken', async (req, res) => {
  initSessionData(req);

  const captchaToken = req.body.captchaToken;
  if (!captchaToken) {
    return res.status(400).json({ error: 'Missing reCAPTCHA token.' });
  }

  const captchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.CAPTCHA_SECRET_KEY}&response=${captchaToken}`;
  try {
    const { data } = await axios.post(captchaVerifyUrl);
    if (!data.success) {
      return res.status(400).json({ error: 'CAPTCHA verification failed.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Error verifying CAPTCHA.' });
  }

  if (req.session.tokens.length >= 3) {
    return res.status(400).json({ error: 'Max 3 tokens per session.' });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'No Discord token provided.' });
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

// Get tokens for session
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

// Start selfbots
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

// EJS template rendering
app.get('/', (req, res) => {
  res.render('index', {
    siteKey: process.env.CAPTCHA_SITE_KEY || ''
  });
});

// Catch-all route (for EJS rendering fallback)
app.use((req, res) => {
  res.render('index', {
    siteKey: process.env.CAPTCHA_SITE_KEY || ''
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
