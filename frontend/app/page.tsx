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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[80%] w-[20%] h-[20%] bg-blue-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">

        {/* Left Column: Hero Text */}
        <div className="text-center lg:text-left space-y-6 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-primary mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Real-Time Multiplayer
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            Level Up Your <br />
            <span className="text-gradient">Local Quiz Games</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
            Host exciting trivia battles on your local network. No internet required, just pure fun with friends and colleagues.
          </p>

          <div className="hidden lg:flex gap-4 pt-4">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-12 h-12 rounded-full border-2 border-[#09090b] bg-gray-800 flex items-center justify-center text-xs font-bold bg-gradient-to-br ${i === 1 ? 'from-pink-500 to-rose-500' :
                    i === 2 ? 'from-purple-500 to-indigo-500' :
                      i === 3 ? 'from-cyan-500 to-blue-500' : 'from-emerald-500 to-teal-500'
                  }`}>
                  User{i}
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-bold text-white">Join the fun!</span>
              <span className="text-xs text-gray-400">Instant connection</span>
            </div>
          </div>
        </div>

        {/* Right Column: Action Card */}
        <div className="w-full max-w-md mx-auto">
          <div className="glass-card p-8 md:p-10 shadow-2xl shadow-primary/10 border-t border-white/10 animate-slideIn">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Get Started</h2>
              <p className="text-gray-400 text-sm">Choose your role to begin</p>
            </div>

            {!isJoining ? (
              <div className="space-y-4">
                <button
                  onClick={() => setIsJoining(true)}
                  className="btn btn-primary w-full text-lg py-4 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative flex items-center justify-center gap-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Join a Game
                  </span>
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-4 bg-[#1a1a24] text-gray-500">OR</span></div>
                </div>

                <button
                  onClick={() => router.push('/host')}
                  className="btn btn-secondary w-full text-lg py-4 flex items-center justify-center gap-3 hover:bg-white/5"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Host New Game
                </button>
              </div>
            ) : (
              <form onSubmit={handleJoinGame} className="space-y-6 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => setIsJoining(false)}
                  className="text-gray-400 hover:text-white transition flex items-center gap-2 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Back to Menu
                </button>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Game PIN</label>
                    <input
                      type="text"
                      value={gamePin}
                      onChange={(e) => setGamePin(e.target.value)}
                      placeholder="000 000"
                      className="input text-center text-3xl font-mono tracking-[0.2em] font-bold h-16 bg-black/30 border-primary/30 focus:border-primary placeholder:text-gray-700"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nickname</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your name"
                      className="input bg-black/30 h-12"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full text-lg py-4 shadow-lg shadow-primary/25 mt-2">
                  Enter Game Lobby
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mt-24 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full relative z-10 px-4">
        {[
          { title: "Zero Latency", desc: "Instant real-time communication over LAN.", icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "text-yellow-400" },
          { title: "Cross Platform", desc: "Play on any device with a web browser.", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", color: "text-blue-400" },
          { title: "Live Reporting", desc: "Track scores and leaderboards instantly.", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", color: "text-green-400" }
        ].map((feat, i) => (
          <div key={i} className="glass p-6 group hover:bg-white/5 transition-all duration-300">
            <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${feat.color}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feat.icon} /></svg>
            </div>
            <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
            <p className="text-sm text-gray-400">{feat.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
