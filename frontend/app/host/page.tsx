'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchQuizzes, createQuiz, Quiz, QuizQuestion } from '@/lib/api';

export default function HostPage() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Quiz Creation State
    const [newQuiz, setNewQuiz] = useState<Quiz>({
        title: '',
        description: '',
        questions: [],
        timePerQuestion: 20,
    });

    const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion>({
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        points: 100,
    });

    useEffect(() => {
        loadQuizzes();
    }, []);

    const loadQuizzes = async () => {
        try {
            const data = await fetchQuizzes();
            setQuizzes(data);
        } catch (error) {
            console.error('Failed to load quizzes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddQuestion = () => {
        if (currentQuestion.questionText.trim() && currentQuestion.options.every(o => o.trim())) {
            setNewQuiz({
                ...newQuiz,
                questions: [...newQuiz.questions, { ...currentQuestion }],
            });
            setCurrentQuestion({
                questionText: '',
                options: ['', '', '', ''],
                correctOptionIndex: 0,
                points: 100,
            });
        }
    };

    const handleCreateQuiz = async () => {
        if (newQuiz.title.trim() && newQuiz.questions.length > 0) {
            try {
                const created = await createQuiz(newQuiz);
                setQuizzes([...quizzes, created]);
                setShowCreateForm(false);
                setNewQuiz({
                    title: '',
                    description: '',
                    questions: [],
                    timePerQuestion: 20,
                });
            } catch (error) {
                console.error('Failed to create quiz:', error);
            }
        }
    };

    const handleStartGame = (quizId: string) => {
        router.push(`/host/game?quizId=${quizId}`);
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...currentQuestion.options];
        newOptions[index] = value;
        setCurrentQuestion({ ...currentQuestion, options: newOptions });
    };

    // Decorative colors for quiz avatars
    const avatarColors = [
        'from-emerald-400 to-lime-400',
        'from-cyan-400 to-sky-500',
        'from-amber-400 to-orange-500',
        'from-teal-400 to-emerald-500',
        'from-slate-400 to-slate-600'
    ];

    return (
        <main className="min-h-screen p-6 md:p-12 relative overflow-hidden">
            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/25 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/20 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6 animate-fadeIn">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4 text-sm font-medium text-gray-400">
                            <button
                                onClick={() => router.push('/')}
                                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition border border-white/10 hover:text-white"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <span>/</span>
                            <span className="text-emerald-300 tracking-wide uppercase text-xs font-bold">Host Dashboard</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                            Manage Your <span className="text-gradient">Quizzes</span>
                        </h1>
                        <p className="text-gray-400 mt-2 text-lg max-w-xl font-light">Create, edit, and host real-time quizzes for your local network.</p>
                    </div>

                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="btn btn-primary shadow-lg whitespace-nowrap px-6 py-3 text-sm"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Create New Quiz
                    </button>
                </header>

                {/* Content Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 animate-pulse">
                        <div className="w-16 h-16 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mb-4" />
                        <p className="text-gray-400 text-lg">Loading your library...</p>
                    </div>
                ) : quizzes.length === 0 ? (
                    <div className="glass-card p-16 text-center max-w-2xl mx-auto animate-fadeIn mt-8 bg-gradient-to-br from-gray-900/50 to-black/50 border border-white/5">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center shadow-xl">
                            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-white">No Quizzes Found</h3>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">It looks like you haven't created any quizzes yet. Start by creating a quiz to host a game.</p>
                        <button onClick={() => setShowCreateForm(true)} className="btn btn-primary px-8 py-3 transform transition hover:scale-105 active:scale-95">
                            Create First Quiz
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn pb-12">
                        {quizzes.map((quiz, index) => {
                            const colorClass = avatarColors[index % avatarColors.length];
                            return (
                                <div
                                    key={quiz.id || index}
                                    className="glass-card flex flex-col group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-5">
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-xl shadow-lg ring-1 ring-white/20`}>
                                                {quiz.title.substring(0, 1).toUpperCase()}
                                            </div>
                                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-400">
                                                {quiz.questions.length} Qs
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-bold mb-2 text-white group-hover:text-emerald-300 transition-colors truncate w-full">{quiz.title}</h3>
                                        <p className="text-gray-400 text-sm truncate-2 min-h-[40px] mb-4 leading-relaxed">{quiz.description || 'No description provided.'}</p>

                                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500 border-t border-white/5 pt-4 mt-auto">
                                            <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                {quiz.timePerQuestion}s / Q
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-black/20 border-t border-white/5">
                                        <button
                                            onClick={() => handleStartGame(quiz.id!)}
                                            className="btn btn-primary w-full justify-center transition-all font-bold tracking-wide"
                                        >
                                            Start Game
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Create Quiz Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                        <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border-2 border-emerald-400/20">
                            {/* Modal Header */}
                            <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                                <div>
                                    <h2 className="text-2xl font-bold">Create New Quiz</h2>
                                    <p className="text-sm text-gray-400">Design your quiz questions and settings</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {/* Quiz Details Grid */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Quiz Title</label>
                                            <input
                                                type="text"
                                                value={newQuiz.title}
                                                onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                                                placeholder="e.g., General Knowledge Trivia"
                                                className="input text-lg font-semibold"
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Time limit (seconds)</label>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="range"
                                                    min="5"
                                                    max="120"
                                                    step="5"
                                                    value={newQuiz.timePerQuestion}
                                                    onChange={(e) => setNewQuiz({ ...newQuiz, timePerQuestion: parseInt(e.target.value) })}
                                                    className="w-full accent-emerald-400 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                                />
                                                <span className="text-xl font-bold w-12 text-right">{newQuiz.timePerQuestion}s</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Description <span className="text-gray-500">(Optional)</span></label>
                                        <textarea
                                            value={newQuiz.description}
                                            onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
                                            placeholder="What is this quiz about?"
                                            className="input h-[132px] resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-white/10 my-6"></div>

                                <div className="grid lg:grid-cols-3 gap-8">
                                    {/* Question Form */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-emerald-400/15 text-emerald-300 flex items-center justify-center text-xs">?</div>
                                            Add Question
                                        </h3>

                                        <div className="glass p-6 space-y-6 bg-black/20 w-full max-w-3xl mx-auto">
                                            <input
                                                type="text"
                                                value={currentQuestion.questionText}
                                                onChange={(e) => setCurrentQuestion({ ...currentQuestion, questionText: e.target.value })}
                                                placeholder="Type your question here..."
                                                className="input text-lg"
                                            />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
                                                {currentQuestion.options.map((option, i) => (
                                                    <div key={i} className={`relative group transition-all ${currentQuestion.correctOptionIndex === i ? 'scale-[1.02]' : ''}`}>
                                                        <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-colors ${currentQuestion.correctOptionIndex === i
                                                            ? 'border-green-500 bg-green-500/20 text-green-500'
                                                            : 'border-gray-600 text-gray-500 group-hover:border-gray-400'
                                                            }`}>
                                                            {String.fromCharCode(65 + i)}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={option}
                                                            onChange={(e) => updateOption(i, e.target.value)}
                                                            placeholder={`Option ${i + 1}`}
                                                            className={`input pl-14 ${currentQuestion.correctOptionIndex === i ? '!border-green-500 !bg-green-500/5' : ''}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setCurrentQuestion({ ...currentQuestion, correctOptionIndex: i })}
                                                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/10 transition ${currentQuestion.correctOptionIndex === i ? 'text-green-500 opacity-100' : 'text-gray-500 opacity-0 group-hover:opacity-100'
                                                                }`}
                                                            title="Mark as correct"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                onClick={handleAddQuestion}
                                                disabled={!currentQuestion.questionText.trim() || !currentQuestion.options.every(o => o.trim())}
                                                className="btn btn-secondary w-full py-3 border-dashed border-2 hover:border-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-50 disabled:hover:border-gray-600 disabled:hover:text-gray-500"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                                Add This Question
                                            </button>
                                        </div>
                                    </div>

                                    {/* Questions Sidebar */}
                                    <div className="lg:col-span-1 border-l border-white/10 pl-6 lg:block flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-gray-300">Questions ({newQuiz.questions.length})</h3>
                                            {newQuiz.questions.length > 0 && <button onClick={() => setNewQuiz({ ...newQuiz, questions: [] })} className="text-xs text-red-400 hover:text-red-300">Clear All</button>}
                                        </div>

                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {newQuiz.questions.length === 0 ? (
                                                <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-xl text-gray-500">
                                                    <p className="text-sm">No questions added yet.</p>
                                                </div>
                                            ) : (
                                                newQuiz.questions.map((q, i) => (
                                                    <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5 group hover:border-white/20 transition-colors">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div className="flex gap-2">
                                                                <span className="text-gray-500 text-xs font-mono mt-1">{(i + 1).toString().padStart(2, '0')}</span>
                                                                <span className="text-sm font-medium line-clamp-2">{q.questionText}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => setNewQuiz({
                                                                    ...newQuiz,
                                                                    questions: newQuiz.questions.filter((_, idx) => idx !== i)
                                                                })}
                                                                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                        <div className="mt-2 text-xs text-gray-500 pl-6">
                                                            Correct: <span className="text-green-400">{q.options[q.correctOptionIndex]}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="btn btn-secondary px-6"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateQuiz}
                                    disabled={!newQuiz.title.trim() || newQuiz.questions.length === 0}
                                    className="btn btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save Quiz
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
