# VaultBoy's Internship Tracker

A modern, real-time dashboard for tracking internship progress. Built with React, Vite, Tailwind CSS, Chart.js, and Firebase.

## Features
- Google Material 3 Dark Mode aesthetic
- Tracks exact hours and minutes spent working
- Stores and graphs daily breakdowns (Hours + Smoke Breaks)
- **Real-time syncing** to Firebase Firestore
- Efficient sync logic (only updates cloud database when you hit stop, saving reads/writes)
- Hosted fully client-side (Vercel-compatible)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Head to [Firebase Console](https://console.firebase.google.com/)
   - Create a project and a Firestore Database (Start in Test Mode).
   - Get your Web App config keys.
   - Open `src/firebase.js` and paste your `firebaseConfig`.

3. **Run Locally**
   ```bash
   npm run dev
   ```

## Deployment
Since this app uses Firebase for data storage and doesn't rely on a backend server, it can be deployed to any static host for completely free (like Vercel, Netlify, or GitHub Pages). 

If using Vercel:
```bash
npm install -g vercel
vercel
```
