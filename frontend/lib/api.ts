// API client for REST endpoints

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface Quiz {
    id?: string;
    title: string;
    description: string;
    questions: QuizQuestion[];
    createdBy?: string;
    createdAt?: number;
    timePerQuestion: number;
}

export interface QuizQuestion {
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    points: number;
}

export async function fetchQuizzes(): Promise<Quiz[]> {
    const response = await fetch(`${API_BASE_URL}/api/quizzes`);
    if (!response.ok) {
        throw new Error('Failed to fetch quizzes');
    }
    return response.json();
}

export async function fetchQuiz(id: string): Promise<Quiz> {
    const response = await fetch(`${API_BASE_URL}/api/quizzes/${id}`);
    if (!response.ok) {
        throw new Error('Failed to fetch quiz');
    }
    return response.json();
}

export async function createQuiz(quiz: Quiz): Promise<Quiz> {
    const response = await fetch(`${API_BASE_URL}/api/quizzes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(quiz),
    });
    if (!response.ok) {
        throw new Error('Failed to create quiz');
    }
    return response.json();
}
