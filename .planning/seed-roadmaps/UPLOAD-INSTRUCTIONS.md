# How to Upload Roadmaps

## Prerequisites

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Login as a mentor** at http://localhost:3000

## Step 1: Get Your Auth Token

### Option A: From Browser (Easiest)

1. Open your browser DevTools:
   - Chrome/Edge: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - Firefox: Press `F12`

2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)

3. Expand **Cookies** in the left sidebar

4. Click on `http://localhost:3000`

5. Find and copy the **Value** of one of these cookies:
   - `__session` (Firebase Auth)
   - `next-auth.session-token` (NextAuth)
   - Any auth-related cookie with a long string value

### Option B: From Network Tab

1. Open DevTools > **Network** tab

2. Refresh the page while logged in

3. Click any request to your API (e.g., `/api/mentorship/profile`)

4. Look at **Request Headers**

5. Copy the `Cookie:` header value (everything after "Cookie: ")

## Step 2: Run the Upload Script

```bash
cd .planning/seed-roadmaps

# Set your token and run
AUTH_TOKEN=your-copied-token-here node upload-roadmaps.js
```

### Full Example

```bash
cd .planning/seed-roadmaps

AUTH_TOKEN=eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAiLCJ0eXAiOiJKV1QifQ... node upload-roadmaps.js
```

**Note:** Replace the example token with your actual token (it will be much longer)

## Step 3: Watch the Progress

The script will:
1. ✅ Parse each roadmap file
2. ✅ Create as draft
3. ✅ Submit for review (pending status)
4. ✅ Show progress for all 8 roadmaps

Example output:
```
🚀 Roadmap Upload Script
========================

API URL: http://localhost:3000
Auth token: eyJhbGciOiJSUzI1NiI...

Found 8 roadmaps to upload

[1/8] Uploading: Web Development 2026: AI-Native Systems & Performance
  Domain: web-dev, Difficulty: beginner, Hours: 500
  ✅ Created as draft (ID: abc123)
  ✅ Submitted for review (status: pending)

[2/8] Uploading: Frontend Development 2026: Resumability & AI-Generated UIs
  ...
```

## Step 4: Approve Roadmaps

1. Go to http://localhost:3000/mentorship/admin

2. Click the **"Roadmaps"** tab

3. You'll see all 8 roadmaps with status **"pending"**

4. Click **"Approve"** for each roadmap

5. They're now public at http://localhost:3000/roadmaps 🎉

## Troubleshooting

### "AUTH_TOKEN is required"
- Make sure you copied the token correctly
- Check that you're logged in
- Try getting a fresh token

### "401 Unauthorized"
- Token may have expired - get a new one
- Make sure you're logged in as a **mentor** (not just a regular user)

### "Failed to create: 403"
- Your account may not have mentor permissions
- Check your role in Firebase Console

### "Connection refused"
- Make sure dev server is running: `npm run dev`
- Verify URL is correct: http://localhost:3000

### Script hangs or times out
- Check if API route exists: http://localhost:3000/api/roadmaps
- Look at server console for errors
- Try uploading one roadmap manually first via UI

## Alternative: Manual Upload

If the script doesn't work, you can upload manually:

1. Go to http://localhost:3000/roadmaps/new

2. For each roadmap file:
   - Copy content from `.planning/seed-roadmaps/01-web-development-2026.md`
   - Fill in the form
   - Click "Submit for Review"

3. Approve via admin dashboard

---

**Need help?** Check:
- Server logs: Look at terminal where `npm run dev` is running
- Browser console: F12 > Console tab for client errors
- API response: Network tab > look at failed requests
