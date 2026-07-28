# StayZ API

Express backend for the StayZ booking app.

## Location

This backend is integrated into the Flutter workspace at `backend/stayz_api`.

## Main Features

- Users, login, refresh token, logout, password reset, and Google OAuth.
- Properties, rooms, reviews, bookings, favorites, and notifications.
- PayOS payment create/cancel/webhook flow.
- Socket.io chat with JWT authentication.
- MongoDB/Mongoose models, Redis token blacklist/rate limiting, Cloudinary uploads, and SMTP email.

## Commands

```bash
npm install
npm run dev
```

The API starts on `PORT` from `.env`, defaulting to `3000`.

Routes are mounted both at root paths such as `/properties/getAll` and API-prefixed paths such as `/api/properties/getAll`.
