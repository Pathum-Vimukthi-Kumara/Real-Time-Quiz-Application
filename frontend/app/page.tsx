'use client';

import { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import PinInput from '@/components/PinInput';
import { useToast } from '@/contexts/ToastContext';

const StatCard = memo(({ label, value }: { label: string; value: string }) => (
  <div className="glass p-4 text-center">
    <p className="text-xl font-semibold text-slate-100">{value}</p>
    <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">{label}</p>
  </div>
));
StatCard.displayName = 'StatCard';

const FeatureBadge = memo(({ children }: { children: string }) => (
  <span className="px-4 py-2 rounded-full border border-white/10 bg-white/5">
    {children}
  </span>
));
FeatureBadge.displayName = 'FeatureBadge';

const FeatureCard = memo(({ title, desc, icon, color }: { title: string; desc: string; icon: string; color: string }) => (
  <div className="glass p-6 group hover:bg-white/10 transition-all duration-300 w-full max-w-xs text-center">
    <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${color}`}>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
    </div>
    <h3 className="font-semibold text-lg mb-2">{title}</h3>
    <p className="text-sm text-slate-400">{desc}</p>
  </div>
));
FeatureCard.displayName = 'FeatureCard';

export default function Home() {
  const router = useRouter();
  const { addToast } = useToast();
  const [gamePin, setGamePin] = useState('');
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'select' | 'pin' | 'nickname'>('select');

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gamePin.trim()) {
      addToast('Please enter a game PIN', 'warning');
      return;
    }
    
    if (gamePin.length !== 6) {
      addToast('Game PIN must be 6 digits', 'warning');
      return;
    }

    setStep('nickname');
  };

  const handleNicknameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      addToast('Please enter your name', 'warning');
      return;
    }

    if (username.length < 2) {
      addToast('Name must be at least 2 characters', 'warning');
      return;
    }

    router.push(`/play?pin=${gamePin}&username=${encodeURIComponent(username.trim())}`);
  };

  const resetToSelect = () => {
    setStep('select');
    setGamePin('');
    setUsername('');
  };

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center">
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/25 blur-[120px]" />
        <div className="absolute top-10 right-[-10%] h-80 w-80 rounded-full bg-cyan-500/20 blur-[140px]" />
        <div className="absolute bottom-[-20%] left-[30%] h-96 w-96 rounded-full bg-amber-400/20 blur-[160px]" />
      </div>

      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-10 flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-3 justify-center">
          <div 
            className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-amber-400 text-slate-900 flex items-center justify-center font-bold"
            aria-hidden="true"
          >
            LQ
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">LAN Quiz</p>
            <p className="text-sm text-slate-200">Real-time trivia on your network</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <FeatureBadge>No internet required</FeatureBadge>
          <FeatureBadge>Up to 100 players</FeatureBadge>
        </div>
      </header>

      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-16 flex flex-col items-center gap-12">
        <div className="space-y-8 animate-fadeIn text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-[0.2em] text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.8)]" aria-label="Live status"></span>
            Live on your LAN
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Turn any room into a
              <span className="text-gradient"> high-energy quiz arena</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-xl leading-relaxed mx-auto">
              Host fast, local multiplayer trivia with zero latency. Players join in seconds and compete with live scoring.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto w-full">
            <StatCard label="Setup time" value="30 sec" />
            <StatCard label="Devices" value="Any browser" />
            <StatCard label="Mode" value="LAN only" />
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-200 justify-center" role="list">
            {['Auto scoring', 'Live leaderboards', 'Team-ready', 'Offline-first'].map((item) => (
              <span key={item} role="listitem" className="px-4 py-2 rounded-full border border-white/10 bg-white/5">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto animate-slideIn">
          {step === 'select' && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold">Start the session</h2>
                <p className="text-sm text-slate-400">Choose how you want to jump in</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => setStep('pin')}
                  className="glass-card p-8 text-left group hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  aria-label="Join as a participant"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Joining as a Participant</h3>
                      <p className="text-sm text-slate-400">
                        Enter a game PIN to join an existing quiz session
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium mt-2">
                      <span>Get Started</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/login')}
                  className="glass-card p-8 text-left group hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  aria-label="Join as a host"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Joining as a Host</h3>
                      <p className="text-sm text-slate-400">
                        Create and manage a new quiz session for players
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-amber-400 font-medium mt-2">
                      <span>Create Game</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'pin' && (
            <div className="glass-card p-8 md:p-10 max-w-md mx-auto animate-fadeIn">
              <form onSubmit={handlePinSubmit} className="space-y-6">
                <button
                  type="button"
                  onClick={resetToSelect}
                  className="text-slate-400 hover:text-white transition flex items-center gap-2 text-sm font-medium"
                  aria-label="Go back to menu"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Menu
                </button>

                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Enter Game PIN</h2>
                  <p className="text-sm text-slate-400">Enter the 6-digit code from your host</p>
                </div>

                <div>
                  <label htmlFor="game-pin" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Game PIN
                  </label>
                  <PinInput
                    length={6}
                    value={gamePin}
                    onChange={setGamePin}
                    autoFocus
                  />
                </div>

                <button type="submit" className="btn btn-primary w-full text-base py-4">
                  Next
                </button>
              </form>
            </div>
          )}

          {step === 'nickname' && (
            <div className="glass-card p-8 md:p-10 max-w-md mx-auto animate-fadeIn">
              <form onSubmit={handleNicknameSubmit} className="space-y-6">
                <button
                  type="button"
                  onClick={() => setStep('pin')}
                  className="text-slate-400 hover:text-white transition flex items-center gap-2 text-sm font-medium"
                  aria-label="Go back"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Enter Your Nickname</h2>
                  <p className="text-sm text-slate-400">Choose a name to display in the game</p>
                </div>

                <div>
                  <label htmlFor="username" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nickname
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your name"
                    className="input bg-black/30 h-12"
                    required
                    minLength={2}
                    maxLength={20}
                    autoFocus
                    aria-describedby="username-hint"
                  />
                  <p id="username-hint" className="text-xs text-slate-500 mt-1">
                    2-20 characters
                  </p>
                </div>

                <button type="submit" className="btn btn-primary w-full text-base py-4">
                  Enter Game Lobby
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      <section className="relative z-10 px-6 pb-20 w-full">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex flex-col items-center justify-center mb-8 gap-2 text-center">
            <h3 className="text-2xl font-semibold">Built for quick sessions</h3>
            <span className="text-sm text-slate-400">Fast, social, and reliable</span>
          </div>
          <div className="grid md:grid-cols-3 gap-6 justify-items-center max-w-4xl mx-auto">
            <FeatureCard 
              title="Zero Latency" 
              desc="Instant real-time communication over LAN." 
              icon="M13 10V3L4 14h7v7l9-11h-7z" 
              color="text-amber-300" 
            />
            <FeatureCard 
              title="Cross Platform" 
              desc="Play on any device with a web browser." 
              icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              color="text-cyan-300" 
            />
            <FeatureCard 
              title="Live Reporting" 
              desc="Track scores and leaderboards instantly." 
              icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
              color="text-emerald-300" 
            />
          </div>
        </div>
      </section>
    </main>
  );
}
