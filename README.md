# Home Base

A personal dashboard app. Track golf rounds, with more modules coming.

## Stack

- **Client**: React + TypeScript + Vite + Tailwind CSS + React Router
- **Server**: Express + TypeScript + `node:sqlite` (built-in, no native deps)
- **DB**: SQLite at `data/homebase.db`

## Getting Started

```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

## API

```
GET    /api/golf/rounds
POST   /api/golf/rounds
PATCH  /api/golf/rounds/:id
DELETE /api/golf/rounds/:id
GET    /api/golf/stats
```

## Project Structure

```
client/   React app
server/   Express API
data/     SQLite database (created on first run)
```
