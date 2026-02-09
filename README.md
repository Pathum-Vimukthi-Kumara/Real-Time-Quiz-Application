# LAN Quiz Application

A real-time multiplayer quiz application for your local network with JWT authentication.

## Tech Stack

- **Backend**: Java Spring Boot + WebSockets + Spring Security
- **Frontend**: Next.js (React + TypeScript + Tailwind CSS)
- **Database**: MongoDB Atlas
- **Authentication**: JWT (JSON Web Tokens)

## Project Structure

```
├── backend/                 # Java Spring Boot Backend
│   ├── src/main/java/com/lanquiz/
│   │   ├── config/          # WebSocket & CORS configuration
│   │   ├── controller/      # REST API controllers (Quiz, Auth, User)
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── exception/       # Custom exceptions & global handler
│   │   ├── handler/         # WebSocket message handlers
│   │   ├── model/           # Data models (Quiz, User)
│   │   ├── repository/      # MongoDB repositories
│   │   ├── security/        # JWT & Spring Security config
│   │   └── service/         # Business logic
│   ├── postman/             # Postman collection & environment
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

## Features

### Authentication & User Management
- User registration with email and password
- JWT-based authentication
- User profile management (update name, email)
- Change password functionality
- Account deletion

### Quiz Management
- Create and manage quizzes (authenticated users only)
- Public quiz browsing
- Real-time multiplayer gameplay via WebSocket

### API Testing
- Complete Postman collection with sample requests
- Pre-configured environment file for localhost

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- Maven

### 1. Configure Backend Environment

Set these environment variables or update `application.properties`:

```bash
# MongoDB connection string
MONGODB_URI=<your-mongodb-connection-string>

# JWT Secret (256+ bits for HS256)
JWT_SECRET=<your-secret-key-at-least-256-bits>
```

### 2. Start the Backend

```bash
cd backend
mvn spring-boot:run
```

The backend will start on `http://localhost:8081`

### 3. Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

### 4. Access from Other Devices on LAN

1. Find your computer's IP address (e.g., `192.168.1.100`)
2. Other devices can access: `http://192.168.1.100:3000`

## Testing the API

Import the Postman collection and environment:

1. Open Postman
2. Import `backend/postman/Quiz-App-Authentication-API.postman_collection.json`
3. Import `backend/postman/Quiz-App-Authentication-API.postman_environment.json`
4. Select "Quiz Application Local" environment
5. Test the endpoints:
   - **Register**: `POST /api/auth/register`
   - **Login**: `POST /api/auth/login`
   - **Get Profile**: `GET /api/user/profile` (requires auth)
   - **Change Password**: `POST /api/user/change-password` (requires auth)
   - **Create Quiz**: `POST /api/quizzes` (requires auth)

The `authToken` will be automatically set after successful registration/login.

## How to Play

### As a Host:
1. Register/Login to your account
2. Go to the home page
3. Click "Host a Game"
4. Create a quiz or select an existing one (only your own quizzes)
5. Share the 6-digit PIN with players
6. Start the game when everyone has joined

### As a Player:
1. Go to the home page
2. Click "Join a Game"
3. Enter the 6-digit PIN
4. Enter your nickname
5. Answer questions as fast as you can!

## Environment Variables

### Backend (`application.properties`)

```properties
server.port=8081
spring.data.mongodb.uri=${MONGODB_URI}
spring.data.mongodb.database=lanquiz
jwt.secret=${JWT_SECRET}
jwt.expiration=86400000
cors.allowed-origins=http://localhost:3000
```

### Frontend (`.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8081
NEXT_PUBLIC_WS_URL=ws://localhost:8081/ws/quiz
```

For LAN access, replace `localhost` with your computer's IP address.

## API Endpoints Summary

### Authentication (Public)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### User Management (Protected)
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `POST /api/user/change-password` - Change password
- `DELETE /api/user/account` - Delete account

### Quiz Management
- `GET /api/quizzes` - Get all quizzes (public)
- `GET /api/quizzes/{id}` - Get quiz by ID (public)
- `GET /api/quizzes/my` - Get user's quizzes (protected)
- `POST /api/quizzes` - Create quiz (protected)
- `PUT /api/quizzes/{id}` - Update quiz (protected)
- `DELETE /api/quizzes/{id}` - Delete quiz (protected)

### WebSocket
- `ws://localhost:8081/ws/quiz` - Real-time game updates
