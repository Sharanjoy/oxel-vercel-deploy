# Firebase Setup

## 1) Create Firebase project

- Go to Firebase Console
- Create project
- Add Web App

## 2) Copy config to `.env`

Use `.env.example` as template:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 3) Create Firestore database

- Firebase Console -> Firestore Database -> Create
- Start in test mode (for quick testing)

## 4) Collections used by app

- `site_inquiries`
- `site_visits`

## 5) Restart app

```bash
npm run dev
```
