# Movie Sync 🎬

Watch a downloaded movie together from two different laptops, perfectly in sync — play, pause, and seek on one laptop and the other follows automatically. Includes a small chat panel too.

**Important:** this doesn't send the movie file over the internet. Each of you needs your own copy of the exact same movie file already downloaded on your own laptop. The app only syncs the *play position*, not the video itself.

## 1. Requirements

- [Node.js](https://nodejs.org) installed on the laptop that will run the server (v16+ is fine). Only one of you needs this — the other just needs a browser.

## 2. Install & run

Open a terminal in this folder and run:

```bash
npm install
npm start
```

You'll see something like:

```
🎬 Movie Sync server is running!

   On this laptop, open:   http://localhost:3000
   On the same WiFi, open: http://192.168.1.23:3000
```

## 3. Connect both laptops

**If you're both on the same WiFi (e.g. same house):**
- Person hosting: open `http://localhost:3000`
- Other person: open `http://<host's-IP>:3000` (the second link the terminal printed)

**If you're on different networks (long distance):**
You'll need to expose your local server to the internet temporarily. The easiest free option is [ngrok](https://ngrok.com):

```bash
# in a separate terminal, after npm start is running
npx ngrok http 3000
```

ngrok will give you a public `https://xxxx.ngrok-free.app` link — send that to your girlfriend, and she opens it in her browser instead of the local IP. You keep `npm start` running the whole time.

(Alternatively, deploy this project to a free host like [Render](https://render.com) and both open the public URL it gives you — no ngrok needed, but the server stays online even after you close your laptop.)

## 4. Watch together

1. Both of you open the link and enter the **same room code** (anything you like, e.g. `tamil-swathi`) and your name.
2. Both of you click **📂 Load Movie** and select your own local copy of the movie file. It has to be the same movie/cut/version so timestamps line up.
3. Whoever presses play, pauses, or skips ahead — the other laptop follows automatically within about a second.
4. If it ever drifts out of sync, either of you can click **🔄 Force Sync** to snap the other laptop to your current position.
5. Use the chat box at the bottom to talk while watching.

## Notes

- Works with any video format your browser can play (MP4/H.264 is the safest bet — some formats like MKV with certain codecs may not play directly in the browser).
- If a video won't load, try renaming/converting it to `.mp4` first.
- Keep the `npm start` terminal window open the whole time you're watching — closing it disconnects everyone.
