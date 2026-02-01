# Discord Bot Setup for Mentorship Program

This guide walks you through setting up the Discord bot that automatically creates private channels for mentor-mentee sessions.

## Prerequisites

- Admin access to the "Code with Ahsan" Discord server
- A Discord account to own the bot

## Step 1: Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Name it something like "Code with Ahsan Mentorship Bot"
4. Click **Create**

## Step 2: Create the Bot

1. In your application, go to the **"Bot"** section (left sidebar)
2. Click **"Add Bot"** → **"Yes, do it!"**
3. Under **"Privileged Gateway Intents"**, enable:
   - ✅ **Server Members Intent** (required for username lookup)
4. Click **"Reset Token"** to generate a bot token
5. **Copy and save the token** — you'll need it for `.env.local`

> ⚠️ **Important**: Never share your bot token publicly!

## Step 3: Set Bot Permissions

1. Go to **"OAuth2"** → **"URL Generator"**
2. Under **Scopes**, select:
   - ✅ `bot`
3. Under **Bot Permissions**, select:
   - ✅ Manage Channels
   - ✅ Send Messages
   - ✅ View Channels
   - ✅ Read Message History
4. Copy the generated URL at the bottom

## Step 4: Add Bot to Your Server

1. Open the URL you copied in a browser
2. Select "Code with Ahsan" server
3. Click **Authorize**
4. Complete the CAPTCHA

## Step 5: Get Server & Category IDs

### Get Server (Guild) ID

1. In Discord, go to **User Settings** → **Advanced**
2. Enable **Developer Mode**
3. Right-click on "Code with Ahsan" server → **Copy Server ID**

### Get Category ID (Optional)

If you want channels created under a specific category:

1. Right-click on the category (e.g., "Mentorship Sessions")
2. Click **Copy Channel ID** (this is actually the category ID)

## Step 6: Configure Environment Variables

Add these to your `.env.local`:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here
DISCORD_MENTORSHIP_CATEGORY_ID=optional_category_id_here
```

| Variable                         | Required | Description                     |
| -------------------------------- | -------- | ------------------------------- |
| `DISCORD_BOT_TOKEN`              | ✅       | Bot token from Developer Portal |
| `DISCORD_GUILD_ID`               | ✅       | Your Discord server ID          |
| `DISCORD_MENTORSHIP_CATEGORY_ID` | ❌       | Category for new channels       |

## Step 7: Restart Your Server

After adding the environment variables, restart your Next.js development server:

```bash
# Stop the current server (Ctrl+C) and restart
npm run dev
```

## How It Works

When a mentor approves a mentee's request:

1. ✨ A private text channel is created (e.g., `mentorship-john-jane`)
2. 🔒 Permissions are set so only mentor + mentee can see it
3. 👋 A welcome message is posted in the channel
4. 💬 The mentee receives a DM with the channel link

## Verification

To verify the bot is working:

1. Ensure the bot appears online in your Discord server
2. Test by having a mentor approve a test request
3. Check that a new channel appears in the Mentorship category
4. Verify both users have access to the channel

## Troubleshooting

### Bot is offline

- Verify `DISCORD_BOT_TOKEN` is correct
- Check that the bot has been added to the server

### Channel not created

- Verify `DISCORD_GUILD_ID` matches your server
- Check server logs for error messages
- Ensure bot has "Manage Channels" permission

### Users can't see the channel

- Make sure users have provided their Discord usernames during registration
- Usernames are case-sensitive — ensure they match exactly
- Users must be members of the Discord server

### DMs not received

- User may have DMs disabled from server members
- User must be in the same server as the bot
