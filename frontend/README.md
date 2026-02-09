# LAN Quiz - Real-Time Multiplayer Quiz Application

A modern, real-time multiplayer quiz application built with Next.js 14, TypeScript, and WebSocket connections. Perfect for local network gaming events, classrooms, and team building.

## Features

- 🚀 **Real-time multiplayer gameplay** - Up to 100 players simultaneously
- 🎯 **Zero latency** - All communication over LAN for instant responses
- 📱 **Cross-platform** - Works on any device with a web browser
- 🎨 **Modern UI** - Beautiful gradient design with smooth animations
- ♿ **Accessible** - WCAG 2.1 compliant with keyboard navigation
- 🔒 **Type-safe** - Built with TypeScript for reliability
- 🎭 **Error boundaries** - Graceful error handling throughout
- 🍞 **Toast notifications** - User-friendly feedback system

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Real-time**: WebSocket
- **Fonts**: Google Fonts (Manrope, Space Grotesk)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm
- Backend server running (see backend documentation)

### Installation

1. Install dependencies
```bash
npm install
```

2. Set up environment variables - Create a `.env` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8081
NEXT_PUBLIC_WS_URL=ws://localhost:8081/ws/quiz
```

3. Run the development server
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── host/              # Host game pages
│   ├── play/              # Player game pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   └── not-found.tsx      # 404 page
├── components/            # Reusable React components
│   ├── ErrorBoundary.tsx  # Error boundary wrapper
│   ├── ErrorMessage.tsx   # Error display component
│   ├── LoadingSpinner.tsx # Loading state component
│   ├── PinInput.tsx       # PIN input component
│   └── Toast.tsx          # Toast notification component
├── contexts/              # React contexts
│   └── ToastContext.tsx   # Toast notification system
├── hooks/                 # Custom React hooks
│   ├── useCountdown.ts    # Countdown timer hook
│   ├── useKeyPress.ts     # Keyboard shortcut hook
│   ├── useQuizApi.ts      # Quiz API hook
│   └── useQuizSocket.ts   # WebSocket hook
├── lib/                   # Utility libraries
│   ├── api.ts            # API client functions
│   ├── env.ts            # Environment validation
│   ├── socket.ts         # WebSocket client
│   └── utils.ts          # Helper functions
└── public/               # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Key Features

### Toast Notifications
User-friendly notifications for success, error, warning, and info messages with auto-dismiss.

### Error Boundaries
Catch and handle React errors gracefully with fallback UI and reload options.

### Custom Hooks
- **useQuizApi**: Manage quiz CRUD operations with loading states
- **useQuizSocket**: Handle WebSocket connections and messages
- **useCountdown**: Timer management for quiz questions
- **useKeyPress**: Keyboard shortcut support (ESC to close modals)

### Accessibility Features
- ARIA labels and landmarks
- Keyboard navigation support (Tab, Enter, ESC, Arrow keys)
- Focus management
- Screen reader friendly
- High contrast mode support

### Performance Optimizations
- Component memoization with React.memo
- Optimized re-renders with useCallback/useMemo
- Efficient WebSocket connection management
- Auto-reconnection with exponential backoff

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8081` |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | `ws://localhost:8081/ws/quiz` |

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## License

This project is licensed under the MIT License.
