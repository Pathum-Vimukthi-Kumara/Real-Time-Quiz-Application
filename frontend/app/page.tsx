'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [gamePin, setGamePin] = useState('');
  const [username, setUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (gamePin.trim() && username.trim()) {
      router.push(`/play?pin=${gamePin}&username=${encodeURIComponent(username)}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[150px]" />
      </div>

      {/* Logo & Title */}
      <div className="text-center mb-12 animate-fadeIn relative z-10">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-6 shadow-lg shadow-purple-500/30">
          <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4">
          <span className="text-gradient">LAN Quiz</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-md mx-auto">
          Host and play real-time quiz games over your local network
        </p>
      </div>

      {/* Main Card */}
      <div className="glass-card p-8 w-full max-w-md animate-fadeIn relative z-10" style={{ animationDelay: '0.1s' }}>
        {!isJoining ? (
          <>
            <div className="space-y-4">
              <button
                onClick={() => router.push('/host')}
                className="btn btn-primary w-full text-lg py-4 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Host a Game
              </button>

              <button
                onClick={() => setIsJoining(true)}
                className="btn btn-secondary w-full text-lg py-4 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Join a Game
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleJoinGame} className="space-y-5">
            <button
              type="button"
              onClick={() => setIsJoining(false)}
              className="text-gray-400 hover:text-white transition flex items-center gap-2 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Game PIN</label>
              <input
                type="text"
                value={gamePin}
                onChange={(e) => setGamePin(e.target.value)}
                placeholder="Enter 6-digit PIN"
                className="input text-center text-2xl tracking-widest"
                maxLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your nickname"
                className="input"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full text-lg py-4">
              Join Game
            </button>
          </form>
        )}
      </div>

      {/* Features Section */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl animate-fadeIn relative z-10" style={{ animationDelay: '0.2s' }}>
        <div className="glass p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">Real-Time</h3>
          <p className="text-sm text-gray-400">Instant updates with WebSocket technology</p>
        </div>

        <div className="glass p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">Multiplayer</h3>
          <p className="text-sm text-gray-400">Play with friends on your local network</p>
        </div>

        <div className="glass p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">Leaderboard</h3>
          <p className="text-sm text-gray-400">Track scores and rankings in real-time</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-gray-500 text-sm relative z-10">
        <p>Built for OS & Network Project</p>
      </footer>
    </main>
  );
}
