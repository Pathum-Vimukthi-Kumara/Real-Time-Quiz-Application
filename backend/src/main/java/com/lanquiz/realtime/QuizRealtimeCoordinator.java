package com.lanquiz.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lanquiz.model.GameSession;
import com.lanquiz.model.Player;
import com.lanquiz.model.Quiz;
import com.lanquiz.model.WebSocketMessage;
import com.lanquiz.security.JwtUtil;
import com.lanquiz.service.GameService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class QuizRealtimeCoordinator {

    private static final Logger logger = LoggerFactory.getLogger(QuizRealtimeCoordinator.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final GameService gameService;
    private final JwtUtil jwtUtil;

    private final Map<String, Set<QuizClientSession>> gameSessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToGame = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToPlayer = new ConcurrentHashMap<>();
    private final Map<String, Long> lastActivityTime = new ConcurrentHashMap<>();
    private final Map<String, Long> sequenceNumbers = new ConcurrentHashMap<>();
    private final Set<QuizClientSession> allSessions = ConcurrentHashMap.newKeySet();
    private volatile boolean isShuttingDown = false;

    public QuizRealtimeCoordinator(GameService gameService, JwtUtil jwtUtil) {
        this.gameService = gameService;
        this.jwtUtil = jwtUtil;
    }

    public void onOpen(QuizClientSession session) {
        logger.info("TCP quiz connection established: {}", session.getId());
        allSessions.add(session);
        lastActivityTime.put(session.getId(), System.currentTimeMillis());
        sequenceNumbers.put(session.getId(), 0L);
    }

    public void onMessage(QuizClientSession session, String line) {
        lastActivityTime.put(session.getId(), System.currentTimeMillis());
        try {
            WebSocketMessage wsMessage = objectMapper.readValue(line, WebSocketMessage.class);
            logger.debug("Received message: {}", wsMessage.getType());

            switch (wsMessage.getType()) {
                case AUTH -> handleAuth(session, wsMessage);
                case CREATE_GAME -> handleCreateGame(session, wsMessage);
                case JOIN_GAME -> handleJoinGame(session, wsMessage);
                case RECONNECT_GAME -> handleReconnectGame(session, wsMessage);
                case START_GAME -> handleStartGame(session, wsMessage);
                case SUBMIT_ANSWER -> handleSubmitAnswer(session, wsMessage);
                case NEXT_QUESTION -> handleNextQuestion(session, wsMessage);
                case END_GAME -> handleEndGame(session, wsMessage);
                case LATENCY_PING -> handleLatencyPing(session, wsMessage);
                default -> sendError(session, "Unknown message type");
            }
        } catch (Exception e) {
            logger.error("Error handling message", e);
            try {
                sendError(session, e.getMessage() != null ? e.getMessage() : "Invalid message");
            } catch (IOException ignored) {
                // ignored
            }
        }
    }

    public void onClose(QuizClientSession session) {
        String pin = sessionToGame.remove(session.getId());
        String playerId = sessionToPlayer.remove(session.getId());
        lastActivityTime.remove(session.getId());
        sequenceNumbers.remove(session.getId());
        allSessions.remove(session);

        if (pin != null) {
            Set<QuizClientSession> sessions = gameSessions.get(pin);
            if (sessions != null) {
                sessions.remove(session);
            }

            if (playerId != null) {
                gameService.removePlayer(pin, playerId);

                WebSocketMessage notification = new WebSocketMessage(
                        WebSocketMessage.MessageType.PLAYER_LEFT,
                        Map.of("playerId", playerId),
                        null,
                        null);
                broadcastToGame(pin, notification);
            }
        }

        logger.info("TCP quiz connection closed: {}", session.getId());
    }

    @SuppressWarnings("unchecked")
    private void handleAuth(QuizClientSession session, WebSocketMessage wsMessage) throws IOException {
        Map<String, Object> payload = (Map<String, Object>) wsMessage.getPayload();
        if (payload == null) {
            sendError(session, "Invalid auth payload");
            return;
        }
        String token = (String) payload.get("token");
        if (token == null || token.isBlank()) {
            sendError(session, "Token required for AUTH");
            return;
        }
        try {
            if (jwtUtil.validateToken(token)) {
                session.getAttributes().put("userEmail", jwtUtil.extractEmail(token));
                logger.info("TCP authenticated connection for user: {}", jwtUtil.extractEmail(token));
            } else {
                sendError(session, "Invalid JWT token");
            }
        } catch (Exception e) {
            logger.warn("JWT token validation error: {}", e.getMessage());
            sendError(session, "Invalid JWT token");
        }
    }

    @SuppressWarnings("unchecked")
    private void handleCreateGame(QuizClientSession session, WebSocketMessage wsMessage) throws IOException {
        String userEmail = (String) session.getAttributes().get("userEmail");
        if (userEmail == null) {
            sendError(session, "Authentication required");
            return;
        }

        Map<String, String> payload = (Map<String, String>) wsMessage.getPayload();
        String quizId = payload.get("quizId");
        String hostId = session.getId();

        GameSession gameSession = gameService.createGame(quizId, hostId);

        String pin = gameSession.getPin();
        gameSessions.computeIfAbsent(pin, k -> ConcurrentHashMap.newKeySet()).add(session);
        sessionToGame.put(session.getId(), pin);
        sessionToPlayer.put(session.getId(), hostId);

        WebSocketMessage response = new WebSocketMessage(
                WebSocketMessage.MessageType.GAME_CREATED,
                Map.of("pin", pin, "sessionId", gameSession.getId()),
                gameSession.getId(),
                hostId);
        sendMessage(session, response);
    }

    @SuppressWarnings("unchecked")
    private void handleJoinGame(QuizClientSession session, WebSocketMessage wsMessage) throws IOException {
        Map<String, String> payload = (Map<String, String>) wsMessage.getPayload();
        String pin = payload.get("pin");
        String username = payload.get("username");
        String playerId = session.getId();

        GameSession gameSession = gameService.joinGame(pin, playerId, username);
        Player player = gameSession.getPlayers().get(playerId);

        gameSessions.computeIfAbsent(pin, k -> ConcurrentHashMap.newKeySet()).add(session);
        sessionToGame.put(session.getId(), pin);
        sessionToPlayer.put(session.getId(), playerId);

        WebSocketMessage response = new WebSocketMessage(
                WebSocketMessage.MessageType.PLAYER_JOINED,
                Map.of(
                        "playerId", playerId,
                        "username", username,
                        "reconnectionToken", player.getReconnectionToken(),
                        "players", gameSession.getPlayers().values()),
                gameSession.getId(),
                playerId);
        sendMessage(session, response);

        broadcastToGame(pin, response);
    }

    @SuppressWarnings("unchecked")
    private void handleReconnectGame(QuizClientSession session, WebSocketMessage wsMessage) throws IOException {
        Map<String, String> payload = (Map<String, String>) wsMessage.getPayload();
        String pin = payload.get("pin");
        String reconnectionToken = payload.get("reconnectionToken");
        String newSessionId = session.getId();

        try {
            GameSession gameSession = gameService.reconnectPlayer(pin, reconnectionToken, newSessionId);
            Player player = gameSession.getPlayers().get(newSessionId);

            gameSessions.computeIfAbsent(pin, k -> ConcurrentHashMap.newKeySet()).add(session);
            sessionToGame.put(session.getId(), pin);
            sessionToPlayer.put(session.getId(), newSessionId);

            Map<String, Object> responsePayload = new HashMap<>();
            responsePayload.put("playerId", newSessionId);
            responsePayload.put("username", player.getUsername());
            responsePayload.put("reconnectionToken", player.getReconnectionToken());
            responsePayload.put("players", gameSession.getPlayers().values());
            responsePayload.put("gameState", gameSession.getState());
            responsePayload.put("currentQuestionIndex", gameSession.getCurrentQuestionIndex());

            if (gameSession.getState() == GameSession.GameState.IN_PROGRESS) {
                Quiz.Question question = gameService.getCurrentQuestion(pin);
                Quiz quiz = gameService.getQuiz(gameSession.getQuizId());
                if (question != null && quiz != null) {
                    responsePayload.put("questionText", question.getQuestionText());
                    responsePayload.put("options", question.getOptions());
                    responsePayload.put("points", question.getPoints());
                    responsePayload.put("timeLimit", quiz.getTimePerQuestion());
                    responsePayload.put("totalQuestions", quiz.getQuestions().size());
                }
            }

            WebSocketMessage response = new WebSocketMessage(
                    WebSocketMessage.MessageType.PLAYER_RECONNECTED,
                    responsePayload,
                    gameSession.getId(),
                    newSessionId);
            sendMessage(session, response);

            WebSocketMessage notification = new WebSocketMessage(
                    WebSocketMessage.MessageType.PLAYER_RECONNECTED,
                    Map.of(
                            "playerId", newSessionId,
                            "username", player.getUsername(),
                            "players", gameSession.getPlayers().values()),
                    gameSession.getId(),
                    null);
            broadcastToGame(pin, notification);

            logger.info("Player {} reconnected to game {}", player.getUsername(), pin);
        } catch (Exception e) {
            logger.error("Error reconnecting player: {}", e.getMessage());
            sendError(session, "Failed to reconnect: " + e.getMessage());
        }
    }

    private void handleStartGame(QuizClientSession session, WebSocketMessage wsMessage) throws IOException {
        String pin = sessionToGame.get(session.getId());
        if (pin == null) {
            sendError(session, "Not in a game");
            return;
        }

        GameSession gameSession = gameService.startGame(pin);
        Quiz.Question question = gameService.getCurrentQuestion(pin);

        Map<String, Object> questionPayload = new HashMap<>();
        questionPayload.put("questionIndex", gameSession.getCurrentQuestionIndex());
        questionPayload.put("questionText", question.getQuestionText());
        questionPayload.put("options", question.getOptions());
        questionPayload.put("points", question.getPoints());

        Quiz quiz = gameService.getQuiz(gameSession.getQuizId());
        questionPayload.put("timeLimit", quiz.getTimePerQuestion());
        questionPayload.put("totalQuestions", quiz.getQuestions().size());

        WebSocketMessage response = new WebSocketMessage(
                WebSocketMessage.MessageType.GAME_STARTED,
                questionPayload,
                gameSession.getId(),
                null);

        broadcastToGame(pin, response);
    }

    private void handleSubmitAnswer(QuizClientSession session, WebSocketMessage wsMessage) throws IOException {
        String pin = sessionToGame.get(session.getId());
        String playerId = sessionToPlayer.get(session.getId());

        if (pin == null || playerId == null) {
            sendError(session, "Not in a game");
            return;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) wsMessage.getPayload();
        int answerIndex = (Integer) payload.get("answerIndex");

        try {
            boolean correct = gameService.submitAnswer(pin, playerId, answerIndex);
            Quiz.Question question = gameService.getCurrentQuestion(pin);

            WebSocketMessage response = new WebSocketMessage(
                    WebSocketMessage.MessageType.ANSWER_RESULT,
                    Map.of(
                            "correct", correct,
                            "correctAnswer", question.getCorrectOptionIndex(),
                            "leaderboard", gameService.getLeaderboard(pin)),
                    null,
                    playerId);
            sendMessage(session, response);
        } catch (RuntimeException e) {
            logger.warn("Answer submission failed for player {}: {}", playerId, e.getMessage());
            sendError(session, e.getMessage());
        }
    }

    private void handleNextQuestion(QuizClientSession session, WebSocketMessage wsMessage) throws IOException {
        String pin = sessionToGame.get(session.getId());
        if (pin == null) {
            sendError(session, "Not in a game");
            return;
        }

        GameSession gameSession = gameService.nextQuestion(pin);

        if (gameSession.getState() == GameSession.GameState.FINISHED) {
            WebSocketMessage response = new WebSocketMessage(
                    WebSocketMessage.MessageType.GAME_ENDED,
                    Map.of("leaderboard", gameService.getLeaderboard(pin)),
                    gameSession.getId(),
                    null);
            broadcastToGame(pin, response);
        } else {
            Quiz.Question question = gameService.getCurrentQuestion(pin);
            Quiz quiz = gameService.getQuiz(gameSession.getQuizId());

            Map<String, Object> questionPayload = new HashMap<>();
            questionPayload.put("questionIndex", gameSession.getCurrentQuestionIndex());
            questionPayload.put("questionText", question.getQuestionText());
            questionPayload.put("options", question.getOptions());
            questionPayload.put("points", question.getPoints());
            questionPayload.put("timeLimit", quiz.getTimePerQuestion());
            questionPayload.put("totalQuestions", quiz.getQuestions().size());

            WebSocketMessage response = new WebSocketMessage(
                    WebSocketMessage.MessageType.QUESTION,
                    questionPayload,
                    gameSession.getId(),
                    null);
            broadcastToGame(pin, response);
        }
    }

    private void handleEndGame(QuizClientSession session, WebSocketMessage wsMessage) throws IOException {
        String pin = sessionToGame.get(session.getId());
        if (pin == null)
            return;

        GameSession endedSession = gameService.endGame(pin);

        WebSocketMessage response = new WebSocketMessage(
                WebSocketMessage.MessageType.GAME_ENDED,
                Map.of("leaderboard", endedSession.getFinalLeaderboard()),
                null,
                null);
        broadcastToGame(pin, response);
    }

    @SuppressWarnings("unchecked")
    private void handleLatencyPing(QuizClientSession session, WebSocketMessage wsMessage) throws IOException {
        Map<String, Object> payload = (Map<String, Object>) wsMessage.getPayload();
        Long clientTimestamp = ((Number) payload.get("timestamp")).longValue();

        WebSocketMessage response = new WebSocketMessage(
                WebSocketMessage.MessageType.LATENCY_PONG,
                Map.of("clientTimestamp", clientTimestamp, "serverTimestamp", System.currentTimeMillis()),
                null,
                null);
        sendMessage(session, response);
    }

    @Scheduled(fixedRate = 15000)
    public void monitorStaleConnections() {
        long currentTime = System.currentTimeMillis();
        Set<String> sessionsToDrop = new HashSet<>();

        for (QuizClientSession session : allSessions) {
            if (!session.isOpen()) {
                continue;
            }
            Long last = lastActivityTime.get(session.getId());
            if (last != null && (currentTime - last) > 45000) {
                logger.warn("Closing stale TCP connection: {}", session.getId());
                sessionsToDrop.add(session.getId());
                session.close();
            }
        }

        for (String id : sessionsToDrop) {
            lastActivityTime.remove(id);
        }
    }

    private void broadcastToGame(String pin, WebSocketMessage message) {
        Set<QuizClientSession> sessions = gameSessions.get(pin);
        if (sessions == null)
            return;

        for (QuizClientSession session : sessions) {
            if (session.isOpen()) {
                try {
                    sendMessage(session, message);
                } catch (IOException e) {
                    logger.error("Error broadcasting to session", e);
                }
            }
        }
    }

    private void sendMessage(QuizClientSession session, WebSocketMessage message) throws IOException {
        if (message.getType() != WebSocketMessage.MessageType.LATENCY_PONG &&
                message.getType() != WebSocketMessage.MessageType.ERROR) {
            Long seqNum = getNextSequenceNumber(session.getId());
            message.setSequenceNumber(seqNum);
        }

        String json = objectMapper.writeValueAsString(message);
        session.sendJson(json);
    }

    private Long getNextSequenceNumber(String sessionId) {
        return sequenceNumbers.compute(sessionId, (k, v) -> (v == null ? 0L : v) + 1);
    }

    private void sendError(QuizClientSession session, String errorMessage) throws IOException {
        logger.warn("Sending error to session {}: {}", session.getId(), errorMessage);
        WebSocketMessage error = new WebSocketMessage(
                WebSocketMessage.MessageType.ERROR,
                Map.of("message", errorMessage),
                null,
                null);
        sendMessage(session, error);
    }

    public void shutdown() {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        logger.info("Initiating graceful shutdown - notifying {} TCP sessions", allSessions.size());

        WebSocketMessage shutdownMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.SERVER_SHUTDOWN,
                Map.of("message", "Server is shutting down for maintenance. Please reconnect in a few minutes."),
                null,
                null);

        for (QuizClientSession session : new ArrayList<>(allSessions)) {
            if (session.isOpen()) {
                try {
                    sendMessage(session, shutdownMessage);
                    Thread.sleep(100);
                    session.close();
                } catch (IOException | InterruptedException e) {
                    logger.error("Error during graceful shutdown for session {}", session.getId(), e);
                    Thread.currentThread().interrupt();
                }
            }
        }

        gameSessions.clear();
        sessionToGame.clear();
        sessionToPlayer.clear();
        lastActivityTime.clear();
        sequenceNumbers.clear();
        allSessions.clear();

        logger.info("Graceful shutdown complete");
    }
}
