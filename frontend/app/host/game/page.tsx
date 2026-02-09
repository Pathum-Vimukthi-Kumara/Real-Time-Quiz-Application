'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { quizSocket, Player, Question, getWebSocketUrl } from '@/lib/socket';

function HostGameContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const quizId = searchParams.get('quizId');

    const [gamePin, setGamePin] = useState<string>('');
    const [players, setPlayers] = useState<Player[]>([]);
    const [gameState, setGameState] = useState<'lobby' | 'playing' | 'ended'>('lobby');
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [leaderboard, setLeaderboard] = useState<Player[]>([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!quizId) { router.push('/host'); return; }

        const serverUrl = getWebSocketUrl();

        quizSocket.connect(serverUrl).then(() => {
            setConnected(true);
            quizSocket.send('CREATE_GAME', { quizId });
        }).catch(console.error);

        quizSocket.on('GAME_CREATED', (p) => setGamePin((p as { pin: string }).pin));
        quizSocket.on('PLAYER_JOINED', (p) => setPlayers(Object.values((p as { players: Player[] }).players)));
        quizSocket.on('PLAYER_LEFT', (p) => setPlayers(prev => prev.filter(x => x.id !== (p as { playerId: string }).playerId)));
        quizSocket.on('GAME_STARTED', (p) => { setCurrentQuestion(p as Question); setTimeLeft((p as Question).timeLimit); setGameState('playing'); });
        quizSocket.on('QUESTION', (p) => { setCurrentQuestion(p as Question); setTimeLeft((p as Question).timeLimit); setGameState('playing'); });
        quizSocket.on('GAME_ENDED', (p) => { setLeaderboard((p as { leaderboard: Player[] }).leaderboard); setGameState('ended'); });

        return () => { quizSocket.disconnect(); };
    }, [quizId, router]);

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            const t = setInterval(() => setTimeLeft(p => p <= 1 ? 0 : p - 1), 1000);
            return () => clearInterval(t);
        }
    }, [gameState, timeLeft]);

    if (!connected) return <div className="min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <main className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto relative z-10">
                {gameState === 'lobby' && (
                    <div className="animate-fadeIn text-center">
                        <h1 className="text-4xl font-bold mb-4 text-gradient">Join the Game</h1>
                        <div className="glass-card inline-block px-12 py-8 mb-8">
                            <p className="text-gray-400 mb-2">Game PIN</p>
                            <p className="text-6xl font-bold tracking-widest text-gradient animate-pulse">{gamePin || '------'}</p>
                        </div>
                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold">Players ({players.length})</h2>
                                <button onClick={() => quizSocket.send('START_GAME', {})} disabled={players.length === 0} className="btn btn-primary disabled:opacity-50">Start Game</button>
                            </div>
                            {players.length === 0 ? <p className="text-gray-400 py-8">Waiting for players...</p> : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{players.map((p, i) => <div key={p.id} className="glass p-3 rounded-xl text-center"><div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-900 flex items-center justify-center text-xl font-bold">{p.username[0].toUpperCase()}</div><p className="font-medium truncate">{p.username}</p></div>)}</div>
                            )}
                        </div>
                    </div>
                )}
                {gameState === 'playing' && currentQuestion && (
                    <div className="animate-fadeIn">
                        <div className="flex justify-between mb-6"><div><p className="text-gray-400">Q{currentQuestion.questionIndex + 1}/{currentQuestion.totalQuestions}</p><h2 className="text-2xl font-bold">{currentQuestion.questionText}</h2></div><div className={`text-5xl font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gradient'}`}>{timeLeft}</div></div>
                        <div className="grid grid-cols-2 gap-4 mb-6">{currentQuestion.options.map((o, i) => <div key={i} className="answer-option"><span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold">{String.fromCharCode(65 + i)}</span><span>{o}</span></div>)}</div>
                        <div className="flex gap-4"><button onClick={() => quizSocket.send('NEXT_QUESTION', {})} className="btn btn-primary flex-1">Next</button><button onClick={() => quizSocket.send('END_GAME', {})} className="btn btn-error">End</button></div>
                    </div>
                )}
                {gameState === 'ended' && (
                    <div className="animate-fadeIn text-center">
                        <h1 className="text-4xl font-bold mb-4 text-gradient">Game Over!</h1>
                        <div className="glass-card p-6 mb-6">{leaderboard.map((p, i) => <div key={p.id} className="leaderboard-item"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-900 flex items-center justify-center font-bold mr-4">{i + 1}</div><div className="flex-1 text-left"><p className="font-semibold">{p.username}</p><p className="text-sm text-gray-400">{p.correctAnswers} correct</p></div><p className="text-2xl font-bold text-gradient">{p.score}</p></div>)}</div>
                        <button onClick={() => router.push('/host')} className="btn btn-primary w-full">Back</button>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function HostGamePage() {
    return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" /></div>}><HostGameContent /></Suspense>;
}
