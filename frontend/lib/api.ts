// API client for REST endpoints

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

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
    const res = await fetch(`${API_BASE_URL}/api/quizzes`);
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        const msg = `Failed to fetch quizzes: ${res.status} ${res.statusText}${text ? ' - ' + text : ''}`;
        throw new Error(msg);
    }
    try {
        return await res.json();
    } catch (err) {
        throw new Error('Failed to parse quizzes JSON: ' + String(err));
    }
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
