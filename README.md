# ♞ JUDGE CHESS

> **"Play chess. Then find out how good your moves really were."**

Judge Chess is a modern, real-time multiplayer chess web application engineered with server-authoritative move validation, resilient session reconnection, synchronized chess clocks, and an automated post-game Stockfish 19 analysis engine.

After every match concludes, Judge Chess evaluates every position, classifies every move (Exceptional, Best, Great, Good, Inaccuracies, Mistakes, Blunders), calculates custom **Judge Accuracy** (0–100%), identifies the **Move of the Game**, and renders an interactive review board with evaluation charts.

---

## 🌟 Key Features

1. **True Real-Time Multiplayer**
   - Play from completely separate physical devices and internet networks using 5-character shareable room codes (`e.g. H7K2Q`) or direct invite URLs.
   - Zero-latency move synchronization via Socket.IO WebSockets.
   - Accounts are not required: users create, share, and play within seconds.

2. **Authoritative Server Architecture**
   - The browser never dictates turn validity, legal moves, or clock status.
   - Every move intention is validated server-side using `chess.js`. Illegal moves and wrong-turn attempts are rejected instantly.
   - Enforces all official FIDE chess rules: castling, en passant, pawn promotion (Queen, Rook, Bishop, Knight choice modal), check, checkmate, stalemate, threefold repetition, and 50-move rule.

3. **Synchronized Chess Clocks & Timeout Enforcement**
   - Server-owned authoritative timekeeping supporting standard blitz and rapid presets (`1m`, `3m`, `3+2`, `5m`, `10m`, `15+10`, and `No Clock`).
   - Handles timeout victories and timeout-versus-insufficient-material draws.

4. **Resilient Disconnection & Reconnection**
   - Refreshing the browser or experiencing temporary network interruptions never destroys the game.
   - Secure cryptographic reconnect tokens preserve player identities, room state, remaining clock time, and color assignments during a 60-second grace window.

5. **Signature Right-Panel Transformation**
   - **During Active Play**: Displays live game status, active turn indicators, move notation, draw offers, resignation, and sound controls.
   - **After Match**: Smoothly transforms into the **Judge Review Panel**, displaying move quality badges, evaluation before and after, engine best choices, centipawn losses, and stepper controls.

6. **Post-Game Stockfish 19 Analysis & Judge Accuracy**
   - Asynchronous queue runs Stockfish 19 depth 14 analysis over every move.
   - Real-time progress indicators: `Analyzing your game... Move 14 of 42 (33%)`.
   - Engine assistance is **strictly prohibited during live play**; analysis is only presented post-game.
   - Normalized evaluations (+ for White advantage, - for Black advantage) with mate score mapping.
   - Interactive **Evaluation Graph** (Recharts) with clickable move scrubbing.
   - Board arrow annotations: Played move (amber arrow) vs. Engine Best move (emerald arrow).

7. **Original Judge Chess Identity**
   - Clean dark design system: Deep charcoal/near-black background (`#0e0f12`), muted bronze-slate dark squares (`#5e6878`), warm ivory/stone light squares (`#e8e2d4`), and warm bronze accents (`#d4a373`).
   - Distinctive typography, custom badges, and zero third-party branding clones.
   - Synthesized zero-dependency Web Audio API sound effects for crisp, offline-ready moves, captures, check warnings, and game-over cues.

---

## 🏛 Architecture & Tech Stack

```
judge-chess/
├── apps/
│   ├── web/                     # Next.js 15 App Router Frontend
│   │   ├── src/app/             # Pages: / (Home/Lobby), /game/[roomCode], /play, /history
│   │   ├── src/components/      # ChessBoard, Clocks, JudgePanel, Graph, Modals
│   │   └── src/lib/             # Socket client singleton, Web Audio sound generator
│   └── server/                  # Node.js + Express + Socket.IO Backend
│       ├── src/game/            # GameManager, GameRoom, ClockManager
│       ├── src/socket/          # Typed event handlers
│       ├── src/analysis/        # StockfishService, MoveClassifier, AccuracyCalculator
│       └── src/database/        # PostgreSQL schema with transparent memory fallback
└── packages/
    └── shared/                  # Shared TypeScript types, event contracts, classifications
```

### Technology Matrix
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts, Lucide Icons, Canvas Confetti.
- **Chess Engine & Rules**: Stockfish 19 (UCI), `chess.js`, `react-chessboard`.
- **Real-Time Communication**: Socket.IO WebSockets.
- **Backend**: Node.js, Express, TypeScript, TSX.
- **Database**: PostgreSQL (pg pool) with high-performance in-memory fallback for offline/development environments.

---

## 📊 Judge Accuracy & Move Classification

### Move Classification System
Every played move is evaluated against the top engine line and classified using custom centipawn loss ($L_{\text{cp}}$) and tactical complexity thresholds:

| Classification | Symbol | Centipawn Loss Range | Description |
| :--- | :---: | :---: | :--- |
| **EXCEPTIONAL** | `◆` | $0$ cp | A rare, high-impact tactical breakthrough or brilliant sacrifice. |
| **BEST** | `✓` | $\le 8$ cp | The top choice found by the Stockfish engine. |
| **GREAT** | `★` | $\le 25$ cp | An extremely strong move maintaining the full initiative. |
| **GOOD** | `●` | $\le 60$ cp | A solid move preserving the position. |
| **INACCURACY** | `△` | $\le 140$ cp | Suboptimal play that lets some advantage slip. |
| **MISTAKE** | `!` | $\le 300$ cp | A clear error that noticeably harms the evaluation. |
| **BLUNDER** | `✕` | $> 300$ cp | A critical failure or tactical collapse. |

*Position saturation correction: If a player is already completely winning (+9.00 pawns) and plays a safe move dropping evaluation to +7.00, it is not flagged as a blunder.*

### Judge Accuracy Formula
Judge Accuracy is calculated across all player moves using an exponential decay function that maps centipawn loss ($L_i$) to move quality ($q_i \in [0, 1]$):

$$q_i = \exp\left( -0.0055 \times L_i \right)$$

$$\text{Judge Accuracy} = \frac{100}{N} \sum_{i=1}^N q_i$$

- $0$ cp loss $\rightarrow 100.0\%$
- $10$ cp loss $\rightarrow 94.6\%$
- $40$ cp loss $\rightarrow 80.2\%$
- $120$ cp loss $\rightarrow 51.7\%$
- $250$ cp loss $\rightarrow 25.3\%$
- $> 500$ cp loss $\rightarrow < 6\%$

The final value is bounded strictly between **0.0%** and **100.0%**.

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 20+ (v24 recommended)
- npm 10+
- Stockfish (e.g. `brew install stockfish` on macOS or `apt install stockfish` on Linux)

### 1. Install Dependencies
```bash
git clone <repo-url>
cd judge-chess
npm install
```

### 2. Build Shared Package
```bash
npm run build:shared
```

### 3. Run Automated Tests
```bash
npm test
```
*Executes all 15 automated test suites covering chess rules, castling, en passant, promotion, multiplayer room lifecycle, turn enforcement, reconnection tokens, Stockfish UCI communication, and accuracy formulas.*

### 4. Start Realtime Backend Server
```bash
npm run dev:server
```
*Listens on `http://0.0.0.0:4000`.*

### 5. Start Web Application
```bash
npm run dev:web
```
*Accessible at `http://localhost:3000` (and `http://<your-local-ip>:3000` for phone/tablet testing on the same Wi-Fi).*

---

## ⚙️ Environment Variables

### Web App (`apps/web/.env.local`)
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```
*In production, replace with your deployed WebSocket server URL (e.g. `https://judge-chess-server.up.railway.app`).*

### Server (`apps/server/.env`)
```env
PORT=4000
CORS_ORIGIN=*
DATABASE_URL=postgresql://user:password@host:5432/judgechess
STOCKFISH_PATH=/opt/homebrew/bin/stockfish
STOCKFISH_DEPTH=14
```

---

## 🌐 Public Deployment Guide

Because Socket.IO requires persistent WebSocket connections, deploy the backend and frontend separately:

### 1. Realtime Server Deployment (Railway / Render / Fly.io)
1. Deploy `apps/server` (or the repository root pointing to `apps/server/dist/index.js`).
2. Set environment variables:
   - `PORT`: Provided by host (e.g. `8080` or `4000`)
   - `DATABASE_URL`: Your Supabase or PostgreSQL connection string
   - `STOCKFISH_DEPTH`: `14`
3. If running in a container, ensure Stockfish is installed (`apt-get install -y stockfish`).

### 2. Frontend Deployment (Vercel)
1. Import repository on Vercel.
2. Root Directory: `apps/web`.
3. Set environment variable:
   - `NEXT_PUBLIC_SOCKET_URL`: URL of your deployed Railway/Render backend.
   - `NEXT_PUBLIC_SERVER_URL`: URL of your deployed Railway/Render backend.
4. Deploy!

---

## 🧪 Testing Checklist & Verification

### Unit & Integration Tests
Run all test suites with:
```bash
npm test
```
Includes:
- Legal and illegal move validation
- Check, checkmate, stalemate, and insufficient material
- Kingside and queenside castling
- En passant execution and square cleanup
- Pawn promotion to Queen, Rook, Bishop, Knight
- Multiplayer room creation, color assignment, and 3rd player rejection
- Turn order enforcement
- Session reconnection with cryptographic tokens
- Resignation and draw agreement
- Real Stockfish evaluation and score parsing
- Move classification and Judge Accuracy calculation

---

## 🔮 Roadmap
- Player rating and Elo matchmaking system
- Opening book identification (ECO codes)
- Personal puzzle generation from game blunders
- AI natural language move commentary
- Spectator links with live broadcast
