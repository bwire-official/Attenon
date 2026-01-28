# VS Code Port Forwarding Guide

## How to Forward Port 8000 in VS Code

### Method 1: Using VS Code Ports Panel (Easiest)

1. **Open the Ports Panel:**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type: `Ports: Focus on Ports View`
   - Or click the **Ports** tab at the bottom of VS Code

2. **Forward Port 8000:**
   - Click the **"Forward a Port"** button (or press `Ctrl+Shift+P` → `Ports: Forward a Port`)
   - Enter: `8000`
   - Press Enter

3. **Get the Forwarded URL:**
   - VS Code will show you a URL like: `https://localhost-8000.vscode-remote.com`
   - Or it might show: `http://localhost:8000` with a public URL

4. **Update your `.env` file:**
   ```env
   EXPO_PUBLIC_FACE_API_URL=https://localhost-8000.vscode-remote.com
   ```
   (Use the URL that VS Code shows you)

5. **Restart Expo:**
   ```bash
   cd apps/mobile
   npm start --clear
   ```

---

### Method 2: Using Command Palette

1. **Press `Ctrl+Shift+P`** (Command Palette)

2. **Type:** `Ports: Forward a Port`

3. **Enter:** `8000`

4. **Copy the URL** that appears

5. **Update `.env`** with that URL

---

### Method 3: If Port Forwarding Doesn't Work

VS Code port forwarding might not work for local development. In that case:

**Use ngrok (Recommended):**

1. **Open a new terminal in VS Code:**
   - `Ctrl+`` (backtick) or Terminal → New Terminal

2. **Run ngrok:**
   ```bash
   ngrok http 8000
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

4. **Update `.env`:**
   ```env
   EXPO_PUBLIC_FACE_API_URL=https://abc123.ngrok-free.app
   ```

5. **Restart Expo**

---

## Quick Steps Summary

1. ✅ Start your API server (port 8000)
2. ✅ Open VS Code Ports panel
3. ✅ Forward port 8000
4. ✅ Copy the forwarded URL
5. ✅ Update `.env` file
6. ✅ Restart Expo

---

## Troubleshooting

### "Port forwarding not available"
- Make sure you're using VS Code (not VS Code Insiders)
- Try Method 3 (ngrok) instead

### "Can't connect to forwarded port"
- Make sure your API server is running on port 8000
- Check: `netstat -an | Select-String ":8000"`

### Still getting "Network request failed"
- Try using ngrok (Method 3)
- Or use your local IP: `http://192.168.0.169:8000` (if on same WiFi)

---

**Note:** VS Code port forwarding works best with Remote Development. For local development, ngrok is often more reliable.
