# Network Setup Guide for Face API

## Problem
Your phone can't reach `localhost:8000` because that's your computer's address, not accessible from your phone.

## Solution Options

### ✅ Option 1: Use Local IP (Recommended for Development)

**Requirements:**
- Phone and computer must be on the **same WiFi network**
- Windows Firewall must allow port 8000

**Steps:**

1. **Find your computer's IP address:**
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" under your WiFi/Ethernet adapter (usually `192.168.x.x`)

2. **Update `.env` file:**
   ```env
   EXPO_PUBLIC_FACE_API_URL=http://192.168.0.169:8000
   ```
   (Replace with YOUR actual IP)

3. **Allow Windows Firewall:**
   ```powershell
   # Run as Administrator
   New-NetFirewallRule -DisplayName "Python FastAPI" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```

4. **Restart Expo:**
   ```bash
   cd apps/mobile
   npm start --clear
   ```

5. **Test from phone browser:**
   Open `http://192.168.0.169:8000/` on your phone's browser to verify it works.

---

### ✅ Option 2: Use ngrok (Quick Tunnel - No Network Setup)

**Best for:** Quick testing, different networks, or if firewall is complicated.

**Steps:**

1. **Install ngrok:**
   - Download from: https://ngrok.com/download
   - Or: `choco install ngrok` (if you have Chocolatey)

2. **Start your API server:**
   ```bash
   cd apps/api
   .\venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

3. **In another terminal, start ngrok:**
   ```bash
   ngrok http 8000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Update `.env` file:**
   ```env
   EXPO_PUBLIC_FACE_API_URL=https://abc123.ngrok.io
   ```

6. **Restart Expo:**
   ```bash
   cd apps/mobile
   npm start --clear
   ```

**Note:** Free ngrok URLs change each time. For stable URL, use ngrok authtoken.

---

### ✅ Option 3: Deploy to Cloud (Production Ready)

**Best for:** Production, testing from anywhere.

**Options:**
- **Render.com** (Free tier available)
- **Railway.app** (Easy deployment)
- **Fly.io** (Good for Python)
- **Heroku** (Classic option)

**Steps for Render:**
1. Create account at render.com
2. New → Web Service
3. Connect your GitHub repo
4. Build command: `cd apps/api && pip install -r requirements.txt`
5. Start command: `cd apps/api && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Copy the URL (e.g., `https://your-api.onrender.com`)
7. Update `.env`:
   ```env
   EXPO_PUBLIC_FACE_API_URL=https://your-api.onrender.com
   ```

---

## Troubleshooting

### "Network request failed" error

**Check 1: Same Network?**
- Phone and computer must be on same WiFi
- Check WiFi name matches on both devices

**Check 2: Firewall?**
```powershell
# Test if port is accessible
Test-NetConnection -ComputerName 192.168.0.169 -Port 8000
```

**Check 3: IP Address Correct?**
```powershell
# Get your current IP
ipconfig | Select-String "IPv4"
```

**Check 4: Server Running?**
```powershell
# Check if server is listening
netstat -an | Select-String ":8000"
```

### Test from Phone Browser

1. Open browser on phone
2. Go to: `http://192.168.0.169:8000/`
3. Should see: `{"status":"healthy",...}`
4. If it works in browser, it will work in app!

---

## Quick Fix Commands

### Allow Firewall (Run as Admin):
```powershell
New-NetFirewallRule -DisplayName "Python FastAPI" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

### Get Your IP:
```powershell
ipconfig | Select-String "IPv4"
```

### Test Connection:
```powershell
Test-NetConnection -ComputerName 192.168.0.169 -Port 8000
```

---

## Recommended Setup

**For Development:**
- Use **Option 1** (Local IP) if phone and computer are on same network
- Use **Option 2** (ngrok) if networks are different or firewall is blocking

**For Production:**
- Use **Option 3** (Cloud deployment)

---

**Current Status:**
- Your `.env` has: `EXPO_PUBLIC_FACE_API_URL=http://192.168.0.169:8000`
- Server is listening on: `0.0.0.0:8000` ✅
- Next: Test if phone can reach `http://192.168.0.169:8000/` in browser
