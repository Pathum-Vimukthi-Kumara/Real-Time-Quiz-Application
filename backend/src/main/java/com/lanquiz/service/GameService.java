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
        session.setCreatedAt(System.currentTimeMillis());

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
        
        // Generate reconnection token
        String reconnectionToken = UUID.randomUUID().toString();
        player.setReconnectionToken(reconnectionToken);
        
        session.getPlayers().put(playerId, player);
        session.getReconnectionTokens().put(reconnectionToken, playerId);

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

        int currentQuestionIndex = session.getCurrentQuestionIndex();
        Quiz.Question question = quiz.getQuestions().get(currentQuestionIndex);
        Player player = session.getPlayers().get(playerId);

        if (player == null)
            return false;

        // Rate limiting: Check if player already answered this question
        if (player.getLastAnsweredQuestionIndex() == currentQuestionIndex) {
            throw new RuntimeException("You have already answered this question");
        }

        // Rate limiting: Prevent rapid submissions (minimum 300ms between attempts)
        long currentTime = System.currentTimeMillis();
        long timeSinceLastAttempt = currentTime - player.getLastSubmissionAttemptTime();
        if (player.getLastSubmissionAttemptTime() > 0 && timeSinceLastAttempt < 300) {
            throw new RuntimeException("Please wait before submitting again");
        }

        // Update rate limit tracking
        player.setLastSubmissionAttemptTime(currentTime);
        player.setLastAnsweredQuestionIndex(currentQuestionIndex);
        
        player.incrementTotalAnswers();
        player.setLastAnswerTime(currentTime);

        boolean correct = answerIndex == question.getCorrectOptionIndex();
        if (correct) {
            // Calculate score based on time taken
            long timeTaken = currentTime - session.getQuestionStartTime();
            int timeBonus = Math.max(0, (int) ((quiz.getTimePerQuestion() * 1000 - timeTaken) / 100));
            int points = question.getPoints() + timeBonus;

            player.addScore(points);
            player.incrementCorrectAnswers();
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

    public GameSession endGame(String pin) {
        GameSession session = activeSessions.get(pin);
        if (session == null) {
            throw new RuntimeException("Game not found");
        }

        // Mark game as finished
        session.setState(GameSession.GameState.FINISHED);
        session.setCompletedAt(System.currentTimeMillis());
        
        // Save final leaderboard
        List<Player> finalLeaderboard = getLeaderboard(pin);
        session.setFinalLeaderboard(finalLeaderboard);
        
        // Persist to database
        gameSessionRepository.save(session);
        
        // Remove from active sessions
        activeSessions.remove(pin);
        
        return session;
    }

    public void removePlayer(String pin, String playerId) {
        GameSession session = activeSessions.get(pin);
        if (session != null) {
            Player player = session.getPlayers().get(playerId);
            if (player != null && player.getReconnectionToken() != null) {
                // Keep player in session for potential reconnection, just mark as disconnected
                // Don't remove from session.getPlayers() or reconnectionTokens map
            }
        }
    }

    public GameSession reconnectPlayer(String pin, String reconnectionToken, String newSessionId) {
        GameSession session = activeSessions.get(pin);
        if (session == null) {
            throw new RuntimeException("Game not found");
        }

        String playerId = session.getReconnectionTokens().get(reconnectionToken);
        if (playerId == null) {
            throw new RuntimeException("Invalid reconnection token");
        }

        Player player = session.getPlayers().get(playerId);
        if (player == null) {
            throw new RuntimeException("Player not found in session");
        }

        // Update player ID to new session ID
        session.getPlayers().remove(playerId);
        player.setId(newSessionId);
        session.getPlayers().put(newSessionId, player);
        session.getReconnectionTokens().put(reconnectionToken, newSessionId);

        return session;
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

    public List<GameSession> getCompletedGamesByHost(String hostId) {
        return gameSessionRepository.findByHostIdAndStateOrderByCompletedAtDesc(hostId, GameSession.GameState.FINISHED);
    }

    private String generatePin() {
        Random random = new Random();
        int pin = 100000 + random.nextInt(900000);
        return String.valueOf(pin);
    }
}
