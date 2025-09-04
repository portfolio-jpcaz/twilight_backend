# 🌙 Twilight – Backend (Node.js / Express)

This is the backend API for the **Twilight** Twitter-like application.  
It is built with **Node.js / Express**, deployed on **Vercel**, and uses a **PostgreSQL database** hosted on **Supabase**.

---

## 🚀 Deployment

- ⚙️ **Backend**: [Twilight Backend on Vercel](https://twilight-backend.vercel.app)  
- 🗄️ **Database**: Hosted on **Supabase (PostgreSQL)**  

---

## ✨ Features

- **User Authentication**
  - Signup with email confirmation (token + expiration)
  - Login with JWT + refresh tokens
  - Password reset flow with email
  - Secure cookies for session handling

- **Tweets API**
  - Create, delete, like/unlike tweets
  - Hashtag auto-extraction
  - Cascade delete (tweets, likes, hashtags associations)

- **Hashtags API**
  - Retrieve most recent and popular hashtags
  - Search tweets by hashtag

- **Security**
  - Centralized JWT verification middleware
  - Token secrets managed via environment variables
  - CORS configured to allow secure frontend requests

---

## 🗂️ Project Structure

backend/  
│  
├── app.js – Express app setup (middlewares, routes, CORS, logging)  
│  
├── db/ – Database access layer  
│   ├── db.js – Connection pool to Supabase PostgreSQL  
│   └── queries.js – All SQL queries (Users, Tweets, Hashtags, Likes)  
│  
├── routes/ – API routes  
│   ├── index.js – Root / healthcheck  
│   ├── users.js – Authentication, signup, signin, refresh, reset  
│   ├── tweets.js – CRUD and like/unlike for tweets  
│   └── hashtags.js – Trends and hashtag search  
│  
├── modules/ – Reusable code  
│   ├── auth_utils.js – JWT creation/verification, token helpers  
│   ├── authenticateToken.js – Middleware for JWT verification  
│   ├── constants.js – Config values (tokens, limits, messages)  
│   ├── debug_utils.js – Logs registered routes  
│   └── utils.js – Helpers (email sending, body check, hashtag parsing)  

---

## ⚙️ Tech Stack & Skills Demonstrated

- **Node.js / Express**: modular routes (`users`, `tweets`, `hashtags`), middleware for authentication and logging  
- **PostgreSQL (Supabase)**: connection pooling via `pg`, queries abstracted in `db/queries.js`, SQL features (JOINs, CTEs, cascade deletes)  
- **Authentication & Security**: JWT (access + refresh), token verification middleware, email verification & password reset tokens, HTTP-only cookies  
- **Utilities**: Nodemailer (Gmail transport) for sending emails, custom helpers for request validation & hashtag extraction, route logging utility for debugging  

---

## 🧑‍💻 API Overview

**Healthcheck**  
`GET /health` → `{ "status": "ok", "db": 1 }`  

**Authentication**  
- `POST /users/signup` → create new account (sends email verification)  
- `POST /users/signin` → login, returns JWT + refresh token  
- `POST /users/refresh` → refresh access token  
- `POST /users/reset` → request password reset  

**Tweets**  
- `POST /tweets` → create new tweet (hashtags auto-extracted)  
- `DELETE /tweets/:id` → delete tweet (author only)  
- `POST /tweets/:id/like` → like/unlike a tweet  
- `GET /tweets` → fetch recent tweets (with like count, liked state)  

**Hashtags**  
- `GET /hashtags/trends` → list recent/popular hashtags  
- `GET /hashtags/:name` → tweets containing a hashtag  

---

## 💡 Future Improvements

- Real-time updates with WebSockets  
- Rate limiting & API quotas  
- More analytics (user activity, trending periods)  

---

## 👨‍💻 Author

Developed by **Jean-Pierre Cazeaux**  
📌 GitHub: [portfolio-jpcaz](https://github.com/portfolio-jpcaz)  
⚙️ Backend deployed on Vercel: [twilight-backend.vercel.app](https://twilight-backend.vercel.app)  
🗄️ Database hosted on Supabase (PostgreSQL)  
