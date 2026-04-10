# LunarAnime Presence

Discord Rich Presence for LunarAnime — shows what you're watching or reading, just like Crunchyroll or Spotify.

## How it works

1. The website reports your current activity to the API
2. This app polls the API every 15 seconds and sets your Discord Rich Presence
3. Your Discord profile shows what you're watching or reading on LunarAnime

## Quick start

```
npm install
npm start
```

## Build

```
npm run build:win
npm run build:linux
npm run build:mac
```

## Login

Click **Sign in via LunarAnime** in the app to authenticate through the website. The app launches on system startup and minimises to the system tray.
