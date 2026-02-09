'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { quizSocket, Player, Question, getWebSocketUrl } from '@/lib/socket';

function PlayGameContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pin = searchParams.get('pin');
    const username = searchParams.get('username');

    const [gameState, setGameState] = useState<'connecting' | 'lobby' | 'playing' | 'result' | 'ended'>('connecting');
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [answerResult, setAnswerResult] = useState<{ correct: boolean; correctAnswer: number } | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [leaderboard, setLeaderboard] = useState<Player[]>([]);
    const [myScore, setMyScore] = useState(0);

    useEffect(() => {
        if (!pin || !username) { router.push('/'); return; }

        const serverUrl = getWebSocketUrl();

        quizSocket.connect(serverUrl).then(() => {
            quizSocket.send('JOIN_GAME', { pin, username });
            setGameState('lobby');
        }).catch(() => router.push('/'));

        quizSocket.on('GAME_STARTED', (p) => {
            const q = p as Question;
            setCurrentQuestion(q);
            setTimeLeft(q.timeLimit);
            setSelectedAnswer(null);
            setAnswerResult(null);
            setGameState('playing');
        });

        quizSocket.on('QUESTION', (p) => {
            const q = p as Question;
            setCurrentQuestion(q);
            setTimeLeft(q.timeLimit);
            setSelectedAnswer(null);
            setAnswerResult(null);
            setGameState('playing');
        });

        quizSocket.on('ANSWER_RESULT', (p) => {
            const r = p as { correct: boolean; correctAnswer: number; leaderboard: Player[] };
            setAnswerResult({ correct: r.correct, correctAnswer: r.correctAnswer });
            setLeaderboard(r.leaderboard);
            const me = r.leaderboard.find(x => x.username === username);
            if (me) setMyScore(me.score);
            setGameState('result');
        });

        quizSocket.on('GAME_ENDED', (p) => {
            setLeaderboard((p as { leaderboard: Player[] }).leaderboard);
            setGameState('ended');
        });

        return () => { quizSocket.disconnect(); };
    }, [pin, username, router]);

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            const t = setInterval(() => setTimeLeft(p => p <= 1 ? 0 : p - 1), 1000);
            return () => clearInterval(t);
        }
    }, [gameState, timeLeft]);

    const submitAnswer = (index: number) => {
        if (selectedAnswer !== null) return;
        setSelectedAnswer(index);
        quizSocket.send('SUBMIT_ANSWER', { answerIndex: index });
    };

    const optionColors = ['from-amber-400 to-orange-500', 'from-sky-400 to-cyan-500', 'from-emerald-400 to-lime-500', 'from-teal-400 to-emerald-500'];

    if (gameState === 'connecting') {
        return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-xl text-gray-400">Connecting...</p></div></div>;
    }

    return (
        <main className="min-h-screen p-4 flex flex-col">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-500/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                {gameState === 'lobby' && (
                    <div className="text-center animate-fadeIn">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-4xl font-bold text-slate-900">{username?.[0].toUpperCase()}</div>
                        <h1 className="text-3xl font-bold mb-2">{username}</h1>
                        <p className="text-gray-400 mb-8">You&apos;re in! Waiting for host to start...</p>
                        <div className="animate-bounce"><svg className="w-8 h-8 text-emerald-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></div>
                    </div>
                )}

                {gameState === 'playing' && currentQuestion && (
                    <div className="w-full max-w-2xl animate-fadeIn">
                        <div className="text-center mb-6">
                            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-br from-emerald-400 to-cyan-400'} mb-4 text-slate-900`}>
                                <span className="text-3xl font-bold">{timeLeft}</span>
                            </div>
                            <p className="text-gray-400 mb-2">Question {currentQuestion.questionIndex + 1} of {currentQuestion.totalQuestions}</p>
                            <h2 className="text-2xl font-bold">{currentQuestion.questionText}</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {currentQuestion.options.map((option, i) => (
                                <button key={i} onClick={() => submitAnswer(i)} disabled={selectedAnswer !== null}
                                    className={`p-6 rounded-2xl text-lg font-semibold transition-all ${selectedAnswer === i ? 'scale-95 ring-4 ring-white' : 'hover:scale-105'} bg-gradient-to-br ${optionColors[i]} disabled:opacity-70`}>
                                    <span className="block text-2xl mb-1">{String.fromCharCode(65 + i)}</span>
                                    <span>{option}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {gameState === 'result' && (
                    <div className="text-center animate-fadeIn">
                        <div className={`w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center ${answerResult?.correct ? 'bg-green-500 glow-success' : 'bg-red-500 glow-error'}`}>
                            {answerResult?.correct ? <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
                        </div>
                        <h2 className="text-3xl font-bold mb-2">{answerResult?.correct ? 'Correct!' : 'Wrong!'}</h2>
                        <p className="text-5xl font-bold text-gradient mb-4">{myScore} pts</p>
                        <p className="text-gray-400">Waiting for next question...</p>
                    </div>
                )}

                {gameState === 'ended' && (
                    <div className="w-full max-w-md animate-fadeIn">
                        <h1 className="text-4xl font-bold text-center mb-8 text-gradient">Game Over!</h1>
                        <div className="glass-card p-6 mb-6">
                            {leaderboard.slice(0, 5).map((p, i) => (
                                <div key={p.id} className={`leaderboard-item ${p.username === username ? 'ring-2 ring-emerald-400' : ''}`}>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-900 flex items-center justify-center font-bold mr-4">{i + 1}</div>
                                    <div className="flex-1"><p className="font-semibold">{p.username}</p></div>
                                    <p className="text-xl font-bold text-gradient">{p.score}</p>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => router.push('/')} className="btn btn-primary w-full">Play Again</button>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function PlayPage() {
    return <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" /></div>}><PlayGameContent /></Suspense>;
}
