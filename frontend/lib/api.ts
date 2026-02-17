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

export interface AuthResponse {
    token: string;
    email: string;
    name: string;
    expiresIn: number;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    name: string;
    password: string;
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

// Authentication API functions
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(error.message || 'Invalid credentials');
    }
    
    return response.json();
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(error.message || 'Failed to create account');
    }
    
    return response.json();
}
