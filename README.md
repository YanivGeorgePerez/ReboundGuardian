# ReboundGuardian

> **Disclaimer**: This selfbot-based tool may violate [Discord’s Terms of Service](https://discord.com/terms). Use at your own risk. The maintainers take no responsibility for any harm, bans, or TOS violations that may occur.

## Overview

ReboundGuardian is a small app that helps your Discord accounts stay in a group channel even if someone tries to kick you out. It does this by listening for a `channelRecipientRemove` event and instantly re-adding your account, making you effectively “unkickable.”

### Key Features

1. **Selfbot Logic** – Uses `discord.js-selfbot-v13` to listen for removal events and re-add kicked accounts.
2. **Invisible reCAPTCHA** – Ensures only humans can add tokens. Automatically skipped on `localhost` for easy debugging.
3. **Persistent Theme** – Light/Dark mode is saved in `localStorage`.  
4. **Token Persistence** – User tokens are stored in `localStorage` and reloaded on page refresh.
5. **Masked Tokens** – Inputs are `type=password`, and saved tokens show as `••••`, preventing token leaks.

## How It Works

1. **User Adds Token**  
   - Paste up to 3 tokens (input is hidden, stored locally, plus verified by the server if you’re not on localhost).

2. **Selfbot Listens**  
   - Whenever Discord tries removing one of your accounts from a group channel, the selfbot sees the `channelRecipientRemove` event and instantly re-adds you.

3. **Result**  
   - You can’t be permanently kicked from the group. Your token is re-added automatically.

## Warning & TOS

- Using a selfbot or unauthorized client on Discord can get you banned.  
- This project is purely educational. We provide no warranty, and by using this code, you accept all consequences.

## Installation

1. **Clone** this repo:
   ```bash
   git clone https://github.com/YanivGeorgePerez/ReboundGuardian.git
   cd ReboundGuardian
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```
   or if you prefer Yarn:
   ```bash
   yarn
   ```

3. **Create a `.env` file** (for production usage):
   ```bash
   SESSION_SECRET=someRandomSecret
   CAPTCHA_SITE_KEY=YourGoogleRecaptchaSiteKey
   CAPTCHA_SECRET_KEY=YourGoogleRecaptchaSecretKey
   PORT=3000
   ```
   *If you’re debugging on localhost, reCAPTCHA is automatically skipped.*

4. **Run**:
   ```bash
   npm start
   ```
   Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Add up to 3 tokens** in the password field (they’re masked).  
2. **Solve reCAPTCHA** if you’re not on localhost.  
3. **Click “Start Manager”** to launch the selfbot logic.  
4. **Open Console** to see logs. If you get removed from a group, you’ll see an “Attempting re-add…” message.

### Token Persistence

- Tokens are stored in `localStorage`. 
- They remain across page reloads, but you won’t see the raw tokens. They appear as “••••” in the UI.

### Theme Persistence

- Toggle Light/Dark mode with the slider in top-right.  
- The chosen theme is saved in `localStorage`, so your preference persists.

## Contributing

1. Fork this repo  
2. Create your feature branch (`git checkout -b feature/someFeature`)  
3. Commit your changes (`git commit -m 'Add some feature'`)  
4. Push to the branch (`git push origin feature/someFeature`)  
5. Open a Pull Request

## License

This project is licensed under an “**Educational / Use at your own risk**” approach. See the disclaimers above.