import { useState, useCallback } from 'react';
import { fetchQuizzes, fetchQuiz, createQuiz, Quiz } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export function useQuizApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const getQuizzes = useCallback(async (): Promise<Quiz[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuizzes();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch quizzes';
      setError(message);
      addToast(message, 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const getQuiz = useCallback(
    async (id: string): Promise<Quiz | null> => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchQuiz(id);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch quiz';
        setError(message);
        addToast(message, 'error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  const createNewQuiz = useCallback(
    async (quiz: Quiz): Promise<Quiz | null> => {
      setLoading(true);
      setError(null);
      try {
        const data = await createQuiz(quiz);
        addToast('Quiz created successfully!', 'success');
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create quiz';
        setError(message);
        addToast(message, 'error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  return {
    loading,
    error,
    getQuizzes,
    getQuiz,
    createNewQuiz,
  };
}
