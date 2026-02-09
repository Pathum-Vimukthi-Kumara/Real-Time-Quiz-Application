package com.lanquiz.service;

import com.lanquiz.model.*;
import com.lanquiz.repository.GameSessionRepository;
import com.lanquiz.repository.QuizRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameService {

    private final QuizRepository quizRepository;
    private final GameSessionRepository gameSessionRepository;
    private final Map<String, GameSession> activeSessions = new ConcurrentHashMap<>();

    public GameService(QuizRepository quizRepository, GameSessionRepository gameSessionRepository) {
        this.quizRepository = quizRepository;
        this.gameSessionRepository = gameSessionRepository;
    }

    public GameSession createGame(String quizId, String hostId) {
        // Verify quiz exists
        quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz not found"));

        GameSession session = new GameSession();
        session.setId(UUID.randomUUID().toString());
        session.setPin(generatePin());
        session.setQuizId(quizId);
        session.setState(GameSession.GameState.WAITING);
        session.setCurrentQuestionIndex(-1);
        session.setHostId(hostId);

        activeSessions.put(session.getPin(), session);
        gameSessionRepository.save(session);

        return session;
    }

    public GameSession joinGame(String pin, String playerId, String username) {
        GameSession session = activeSessions.get(pin);
        if (session == null) {
            throw new RuntimeException("Game not found");
        }

        if (session.getState() != GameSession.GameState.WAITING) {
            throw new RuntimeException("Game already started");
        }

        Player player = new Player(playerId, username, 0, 0, 0, 0);
        session.getPlayers().put(playerId, player);

        return session;
    }

    public GameSession startGame(String pin) {
        GameSession session = activeSessions.get(pin);
        if (session == null) {
            throw new RuntimeException("Game not found");
        }

        session.setState(GameSession.GameState.IN_PROGRESS);
        session.setCurrentQuestionIndex(0);
        session.setQuestionStartTime(System.currentTimeMillis());

        return session;
    }

    public Quiz.Question getCurrentQuestion(String pin) {
        GameSession session = activeSessions.get(pin);
        if (session == null) {
            throw new RuntimeException("Game not found");
        }

        Quiz quiz = quizRepository.findById(session.getQuizId())
                .orElseThrow(() -> new RuntimeException("Quiz not found"));

        int index = session.getCurrentQuestionIndex();
        if (index >= 0 && index < quiz.getQuestions().size()) {
            return quiz.getQuestions().get(index);
        }
        return null;
    }

    public boolean submitAnswer(String pin, String playerId, int answerIndex) {
        GameSession session = activeSessions.get(pin);
        if (session == null || session.getState() != GameSession.GameState.IN_PROGRESS) {
            return false;
        }

        Quiz quiz = quizRepository.findById(session.getQuizId())
                .orElseThrow(() -> new RuntimeException("Quiz not found"));

        Quiz.Question question = quiz.getQuestions().get(session.getCurrentQuestionIndex());
        Player player = session.getPlayers().get(playerId);

        if (player == null)
            return false;

        player.setTotalAnswers(player.getTotalAnswers() + 1);
        player.setLastAnswerTime(System.currentTimeMillis());

        boolean correct = answerIndex == question.getCorrectOptionIndex();
        if (correct) {
            // Calculate score based on time taken
            long timeTaken = System.currentTimeMillis() - session.getQuestionStartTime();
            int timeBonus = Math.max(0, (int) ((quiz.getTimePerQuestion() * 1000 - timeTaken) / 100));
            int points = question.getPoints() + timeBonus;

            player.setScore(player.getScore() + points);
            player.setCorrectAnswers(player.getCorrectAnswers() + 1);
        }

        return correct;
    }

    public GameSession nextQuestion(String pin) {
        GameSession session = activeSessions.get(pin);
        if (session == null) {
            throw new RuntimeException("Game not found");
        }

        Quiz quiz = quizRepository.findById(session.getQuizId())
                .orElseThrow(() -> new RuntimeException("Quiz not found"));

        int nextIndex = session.getCurrentQuestionIndex() + 1;
        if (nextIndex >= quiz.getQuestions().size()) {
            session.setState(GameSession.GameState.FINISHED);
        } else {
            session.setCurrentQuestionIndex(nextIndex);
            session.setQuestionStartTime(System.currentTimeMillis());
            session.setState(GameSession.GameState.IN_PROGRESS);
        }

        return session;
    }

    public List<Player> getLeaderboard(String pin) {
        GameSession session = activeSessions.get(pin);
        if (session == null) {
            return Collections.emptyList();
        }

        List<Player> players = new ArrayList<>(session.getPlayers().values());
        players.sort((a, b) -> {
            if (b.getScore() != a.getScore()) {
                return b.getScore() - a.getScore();
            }
            return Long.compare(a.getLastAnswerTime(), b.getLastAnswerTime());
        });

        return players;
    }

    public void removePlayer(String pin, String playerId) {
        GameSession session = activeSessions.get(pin);
        if (session != null) {
            session.getPlayers().remove(playerId);
        }
    }

    public GameSession getSession(String pin) {
        return activeSessions.get(pin);
    }

    public Quiz getQuiz(String quizId) {
        return quizRepository.findById(quizId).orElse(null);
    }

    public Quiz createQuiz(Quiz quiz) {
        quiz.setCreatedAt(System.currentTimeMillis());
        return quizRepository.save(quiz);
    }

    public List<Quiz> getAllQuizzes() {
        return quizRepository.findAll();
    }
    
    public List<Quiz> getQuizzesByCreator(String email) {
        return quizRepository.findByCreatedBy(email);
    }
    
    public Quiz updateQuiz(Quiz quiz) {
        return quizRepository.save(quiz);
    }
    
    public void deleteQuiz(String quizId) {
        quizRepository.deleteById(quizId);
    }

    private String generatePin() {
        Random random = new Random();
        int pin = 100000 + random.nextInt(900000);
        return String.valueOf(pin);
    }
}
