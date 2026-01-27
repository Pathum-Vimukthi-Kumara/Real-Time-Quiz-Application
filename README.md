# LAN Quiz Application

A real-time multiplayer quiz application for your local network.

## Tech Stack

- **Backend**: Java Spring Boot + WebSockets
- **Frontend**: Next.js (React + TypeScript + Tailwind CSS)
- **Database**: MongoDB Atlas

## Project Structure

```
├── backend/                 # Java Spring Boot Backend
│   ├── src/main/java/com/lanquiz/
│   │   ├── config/          # WebSocket & CORS configuration
│   │   ├── controller/      # REST API controllers
│   │   ├── handler/         # WebSocket message handlers
│   │   ├── model/           # Data models
│   │   ├── repository/      # MongoDB repositories
│   │   └── service/         # Business logic
│   └── pom.xml
│
└── frontend/                # Next.js Frontend
    ├── app/
    │   ├── host/            # Host dashboard & game control
    │   ├── play/            # Player game interface
    │   └── page.tsx         # Home page
    └── lib/
        ├── api.ts           # REST API client
        └── socket.ts        # WebSocket client
```

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- Maven

### 1. Start the Backend

```bash
cd backend
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

### 3. Access from Other Devices on LAN

1. Find your computer's IP address (e.g., `192.168.1.100`)
2. Other devices can access: `http://192.168.1.100:3000`

## How to Play

### As a Host:
1. Go to the home page
2. Click "Host a Game"
3. Create a quiz or select an existing one
4. Share the 6-digit PIN with players
5. Start the game when everyone has joined

### As a Player:
1. Go to the home page
2. Click "Join a Game"
3. Enter the 6-digit PIN
4. Enter your nickname
5. Answer questions as fast as you can!

## Environment Variables

Create `.env.local` in frontend directory:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws/quiz
```

For LAN access, replace `localhost` with your computer's IP address.
