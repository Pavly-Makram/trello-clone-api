# 📋 Trello Clone - RESTful API & Real-time Server

A robust, enterprise-ready Trello backend clone built using **Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Redis, and Socket.io**.

---

## 🚀 Features

- **Authentication & Authorization:** Secure registration and login with JWT and bcrypt; Role-Based Access Control (RBAC: Owner, Admin, Member, Viewer).
- **Password Reset:** Redis-backed token flow for secure forgot/reset password workflows.
- **Board & List Management:** Full CRUD operations for boards, lists, and positions.
- **Card System:** Task assignments, priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and re-ordering/moving across lists.
- **Real-time Updates:** Powered by **Socket.io** (real-time card creations, movements, updates, and comments broadcasted per board).
- **Caching & Rate Limiting:** High performance caching via **Redis** and rate-limiting using `express-rate-limit` + `rate-limit-redis`.
- **Validation:** Strict runtime schema validations with **Zod**.
- **Documentation:** Interactive OpenAPI specification via **Swagger UI** (`/api-docs`).
- **Comprehensive Testing:** Integration and unit tests implemented using **Jest & Supertest**.

---

## 🛠 Tech Stack

- **Runtime & Language:** Node.js, TypeScript
- **Framework:** Express.js
- **Database & ORM:** PostgreSQL, Prisma
- **Cache & Memory Store:** Redis, ioredis
- **WebSockets:** Socket.io
- **Security:** Helmet, CORS, Rate-Limiting, Zod
- **Documentation:** Swagger (OpenAPI 3.0)
- **Testing:** Jest, Supertest

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL
- Redis Server

### 2. Installation
\`\`\`bash
# Clone the repository
git clone https://github.com/Pavly-Makram/trello-clone-api.git
cd trello-clone-api

# Install dependencies
npm install
\`\`\`

### 3. Environment Variables
Create a \`.env\` file in the root directory:
\`\`\`env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/trello_db?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your_secret_key"
\`\`\`

### 4. Database Setup & Migration
\`\`\`bash
npx prisma generate
npx prisma migrate dev --name init
\`\`\`

### 5. Run Server
\`\`\`bash
# Development mode
npm run dev

# Run Tests
npm test
\`\`\`

---

## 📖 API Documentation
Once the server is running, visit:
\`\`\`
http://localhost:5001/api-docs
\`\`\`