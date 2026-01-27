'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchQuizzes, createQuiz, Quiz, QuizQuestion } from '@/lib/api';

export default function HostPage() {
    const router = useRouter();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
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

    return (
        <main className="min-h-screen p-6">
            {/* Decorative Elements */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-20 w-72 h-72 bg-purple-500/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 rounded-lg hover:bg-white/10 transition"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-3xl font-bold">
                            <span className="text-gradient">Host a Game</span>
                        </h1>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Quiz
                    </button>
                </div>

                {/* Quiz List */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Loading quizzes...</p>
                    </div>
                ) : quizzes.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No Quizzes Yet</h3>
                        <p className="text-gray-400 mb-6">Create your first quiz to get started!</p>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="btn btn-primary"
                        >
                            Create Your First Quiz
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {quizzes.map((quiz, index) => (
                            <div
                                key={quiz.id || index}
                                className="glass-card p-6 flex items-center justify-between animate-fadeIn"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div>
                                    <h3 className="text-xl font-semibold mb-1">{quiz.title}</h3>
                                    <p className="text-gray-400 text-sm mb-2">{quiz.description}</p>
                                    <div className="flex gap-4 text-sm text-gray-500">
                                        <span>{quiz.questions.length} questions</span>
                                        <span>{quiz.timePerQuestion}s per question</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleStartGame(quiz.id!)}
                                    className="btn btn-primary flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Start
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Quiz Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="glass-card p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gradient">Create New Quiz</h2>
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Quiz Details */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Quiz Title</label>
                                    <input
                                        type="text"
                                        value={newQuiz.title}
                                        onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                                        placeholder="Enter quiz title"
                                        className="input"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                                    <input
                                        type="text"
                                        value={newQuiz.description}
                                        onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
                                        placeholder="Brief description"
                                        className="input"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Time per Question (seconds)</label>
                                    <input
                                        type="number"
                                        value={newQuiz.timePerQuestion}
                                        onChange={(e) => setNewQuiz({ ...newQuiz, timePerQuestion: parseInt(e.target.value) })}
                                        min={5}
                                        max={120}
                                        className="input"
                                    />
                                </div>

                                {/* Added Questions */}
                                {newQuiz.questions.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-3">Added Questions ({newQuiz.questions.length})</h3>
                                        <div className="space-y-2">
                                            {newQuiz.questions.map((q, i) => (
                                                <div key={i} className="glass p-3 flex items-center justify-between">
                                                    <span className="text-sm truncate flex-1">{i + 1}. {q.questionText}</span>
                                                    <button
                                                        onClick={() => setNewQuiz({
                                                            ...newQuiz,
                                                            questions: newQuiz.questions.filter((_, idx) => idx !== i)
                                                        })}
                                                        className="text-red-400 hover:text-red-300 p-1"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Add Question Form */}
                                <div className="glass p-4 space-y-4">
                                    <h3 className="font-semibold">Add Question</h3>

                                    <input
                                        type="text"
                                        value={currentQuestion.questionText}
                                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, questionText: e.target.value })}
                                        placeholder="Question text"
                                        className="input"
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        {currentQuestion.options.map((option, i) => (
                                            <div key={i} className="relative">
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(e) => updateOption(i, e.target.value)}
                                                    placeholder={`Option ${i + 1}`}
                                                    className={`input pr-10 ${currentQuestion.correctOptionIndex === i ? 'border-green-500' : ''}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentQuestion({ ...currentQuestion, correctOptionIndex: i })}
                                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${currentQuestion.correctOptionIndex === i ? 'text-green-500' : 'text-gray-500'
                                                        }`}
                                                >
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleAddQuestion}
                                        className="btn btn-secondary w-full"
                                    >
                                        Add Question
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCreateForm(false)}
                                        className="btn btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateQuiz}
                                        disabled={!newQuiz.title.trim() || newQuiz.questions.length === 0}
                                        className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Create Quiz
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
