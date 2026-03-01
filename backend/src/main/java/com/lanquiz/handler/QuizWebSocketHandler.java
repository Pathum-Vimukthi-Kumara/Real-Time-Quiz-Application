package com.lanquiz.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lanquiz.model.GameSession;
import com.lanquiz.model.Player;
import com.lanquiz.model.Quiz;
import com.lanquiz.model.WebSocketMessage;
import com.lanquiz.service.GameService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PingMessage;
import org.springframework.web.socket.PongMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class QuizWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(QuizWebSocketHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final GameService gameService;

    // Maps session pins to connected WebSocket sessions
    private final Map<String, Set<WebSocketSession>> gameSessions = new ConcurrentHashMap<>();
    // Maps WebSocket session IDs to game pins
    private final Map<String, String> sessionToGame = new ConcurrentHashMap<>();
    // Maps WebSocket session IDs to player IDs
    private final Map<String, String> sessionToPlayer = new ConcurrentHashMap<>();
    // Tracks last pong time for heartbeat monitoring
    private final Map<String, Long> lastPongTime = new ConcurrentHashMap<>();
    // Tracks sequence numbers for outgoing messages per session
    private final Map<String, Long> sequenceNumbers = new ConcurrentHashMap<>();
    // Flag to track if server is shutting down
    private volatile boolean isShuttingDown = false;

    public QuizWebSocketHandler(GameService gameService) {
        this.gameService = gameService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        logger.info("WebSocket connection established: {}", session.getId());
        lastPongTime.put(session.getId(), System.currentTimeMillis());
        sequenceNumbers.put(session.getId(), 0L);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            WebSocketMessage wsMessage = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);
            logger.debug("Received message: {}", wsMessage.getType());

            switch (wsMessage.getType()) {
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
            sendError(session, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void handleCreateGame(WebSocketSession session, WebSocketMessage wsMessage) throws IOException {
        // Verify host is authenticated
        String userEmail = (String) session.getAttributes().get("userEmail");
        if (userEmail == null) {
            sendError(session, "Authentication required");
            return;
        }
        
        Map<String, String> payload = (Map<String, String>) wsMessage.getPayload();
        String quizId = payload.get("quizId");
        String hostId = session.getId();

        GameSession gameSession = gameService.createGame(quizId, hostId);

        // Register host session
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
    private void handleJoinGame(WebSocketSession session, WebSocketMessage wsMessage) throws IOException {
        Map<String, String> payload = (Map<String, String>) wsMessage.getPayload();
        String pin = payload.get("pin");
        String username = payload.get("username");
        String playerId = session.getId();

        GameSession gameSession = gameService.joinGame(pin, playerId, username);
        Player player = gameSession.getPlayers().get(playerId);

        // Register player session
        gameSessions.computeIfAbsent(pin, k -> ConcurrentHashMap.newKeySet()).add(session);
        sessionToGame.put(session.getId(), pin);
        sessionToPlayer.put(session.getId(), playerId);

        // Notify the joining player with reconnection token
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

        // Broadcast to all players in the game
        broadcastToGame(pin, response);
    }

    @SuppressWarnings("unchecked")
    private void handleReconnectGame(WebSocketSession session, WebSocketMessage wsMessage) throws IOException {
        Map<String, String> payload = (Map<String, String>) wsMessage.getPayload();
        String pin = payload.get("pin");
        String reconnectionToken = payload.get("reconnectionToken");
        String newSessionId = session.getId();

        try {
            GameSession gameSession = gameService.reconnectPlayer(pin, reconnectionToken, newSessionId);
            Player player = gameSession.getPlayers().get(newSessionId);

            // Register player session
            gameSessions.computeIfAbsent(pin, k -> ConcurrentHashMap.newKeySet()).add(session);
            sessionToGame.put(session.getId(), pin);
            sessionToPlayer.put(session.getId(), newSessionId);

            // Get current game state
            Map<String, Object> responsePayload = new HashMap<>();
            responsePayload.put("playerId", newSessionId);
            responsePayload.put("username", player.getUsername());
            responsePayload.put("reconnectionToken", player.getReconnectionToken());
            responsePayload.put("players", gameSession.getPlayers().values());
            responsePayload.put("gameState", gameSession.getState());
            responsePayload.put("currentQuestionIndex", gameSession.getCurrentQuestionIndex());

            // If game is in progress, include current question
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

            // Notify the reconnected player
            WebSocketMessage response = new WebSocketMessage(
                    WebSocketMessage.MessageType.PLAYER_RECONNECTED,
                    responsePayload,
                    gameSession.getId(),
                    newSessionId);
            sendMessage(session, response);

            // Broadcast reconnection to other players
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

    private void handleStartGame(WebSocketSession session, WebSocketMessage wsMessage) throws IOException {
        String pin = sessionToGame.get(session.getId());
        if (pin == null) {
            sendError(session, "Not in a game");
            return;
        }

        GameSession gameSession = gameService.startGame(pin);
        Quiz.Question question = gameService.getCurrentQuestion(pin);

        // Build question payload without correct answer
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

    private void handleSubmitAnswer(WebSocketSession session, WebSocketMessage wsMessage) throws IOException {
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
            // Handle rate limiting and other submission errors
            logger.warn("Answer submission failed for player {}: {}", playerId, e.getMessage());
            sendError(session, e.getMessage());
        }
    }

    private void handleNextQuestion(WebSocketSession session, WebSocketMessage wsMessage) throws IOException {
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

    private void handleEndGame(WebSocketSession session, WebSocketMessage wsMessage) throws IOException {
        String pin = sessionToGame.get(session.getId());
        if (pin == null)
            return;

        // Persist game to database and get final leaderboard
        GameSession endedSession = gameService.endGame(pin);
        
        WebSocketMessage response = new WebSocketMessage(
                WebSocketMessage.MessageType.GAME_ENDED,
                Map.of("leaderboard", endedSession.getFinalLeaderboard()),
                null,
                null);
        broadcastToGame(pin, response);
    }

    @SuppressWarnings("unchecked")
    private void handleLatencyPing(WebSocketSession session, WebSocketMessage wsMessage) throws IOException {
        // Echo back the timestamp sent by client for latency calculation
        Map<String, Object> payload = (Map<String, Object>) wsMessage.getPayload();
        Long clientTimestamp = ((Number) payload.get("timestamp")).longValue();
        
        WebSocketMessage response = new WebSocketMessage(
                WebSocketMessage.MessageType.LATENCY_PONG,
                Map.of("clientTimestamp", clientTimestamp, "serverTimestamp", System.currentTimeMillis()),
                null,
                null);
        sendMessage(session, response);
    }

    @Override
    protected void handlePongMessage(WebSocketSession session, PongMessage message) throws Exception {
        lastPongTime.put(session.getId(), System.currentTimeMillis());
        logger.debug("Received pong from session: {}", session.getId());
    }

    @Scheduled(fixedRate = 15000) // Run every 15 seconds
    public void sendHeartbeat() {
        long currentTime = System.currentTimeMillis();
        Set<String> sessionsToRemove = new HashSet<>();

        // Send ping to all active sessions and check for stale connections
        for (Map.Entry<String, Set<WebSocketSession>> entry : gameSessions.entrySet()) {
            Set<WebSocketSession> sessions = entry.getValue();
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    Long lastPong = lastPongTime.get(session.getId());
                    
                    // Close connection if no pong received in 30 seconds
                    if (lastPong != null && (currentTime - lastPong) > 30000) {
                        logger.warn("Closing stale connection: {}", session.getId());
                        sessionsToRemove.add(session.getId());
                        try {
                            session.close(CloseStatus.SESSION_NOT_RELIABLE);
                        } catch (IOException e) {
                            logger.error("Error closing stale session", e);
                        }
                    } else {
                        // Send ping
                        try {
                            session.sendMessage(new PingMessage());
                            logger.debug("Sent ping to session: {}", session.getId());
                        } catch (IOException e) {
                            logger.error("Error sending ping to session: {}", session.getId(), e);
                        }
                    }
                }
            }
        }

        // Clean up stale session tracking data
        for (String sessionId : sessionsToRemove) {
            lastPongTime.remove(sessionId);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String pin = sessionToGame.remove(session.getId());
        String playerId = sessionToPlayer.remove(session.getId());
        lastPongTime.remove(session.getId());
        sequenceNumbers.remove(session.getId());

        if (pin != null) {
            Set<WebSocketSession> sessions = gameSessions.get(pin);
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

        logger.info("WebSocket connection closed: {}", session.getId());
    }

    private void broadcastToGame(String pin, WebSocketMessage message) {
        Set<WebSocketSession> sessions = gameSessions.get(pin);
        if (sessions == null)
            return;

        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    sendMessage(session, message);
                } catch (IOException e) {
                    logger.error("Error broadcasting to session", e);
                }
            }
        }
    }

    private void sendMessage(WebSocketSession session, WebSocketMessage message) throws IOException {
        // Only add sequence numbers to game-related messages, not control messages
        if (message.getType() != WebSocketMessage.MessageType.LATENCY_PONG && 
            message.getType() != WebSocketMessage.MessageType.ERROR) {
            Long seqNum = getNextSequenceNumber(session.getId());
            message.setSequenceNumber(seqNum);
        }
        
        String json = objectMapper.writeValueAsString(message);
        session.sendMessage(new TextMessage(json));
    }

    private Long getNextSequenceNumber(String sessionId) {
        return sequenceNumbers.compute(sessionId, (k, v) -> (v == null ? 0L : v) + 1);
    }

    private void sendError(WebSocketSession session, String errorMessage) throws IOException {
        logger.warn("Sending error to session {}: {}", session.getId(), errorMessage);
        WebSocketMessage error = new WebSocketMessage(
                WebSocketMessage.MessageType.ERROR,
                Map.of("message", errorMessage),
                null,
                null);
        sendMessage(session, error);
    }

    /**
     * Gracefully shutdown - notify all connected clients before server stops
     */
    public void shutdown() {
        if (isShuttingDown) {
            return; // Already shutting down
        }
        
        isShuttingDown = true;
        logger.info("Initiating graceful shutdown - notifying {} active sessions", 
                    gameSessions.values().stream().mapToInt(Set::size).sum());
        
        WebSocketMessage shutdownMessage = new WebSocketMessage(
                WebSocketMessage.MessageType.SERVER_SHUTDOWN,
                Map.of("message", "Server is shutting down for maintenance. Please reconnect in a few minutes."),
                null,
                null);
        
        // Broadcast to all active game sessions
        for (Map.Entry<String, Set<WebSocketSession>> entry : gameSessions.entrySet()) {
            for (WebSocketSession session : entry.getValue()) {
                if (session.isOpen()) {
                    try {
                        sendMessage(session, shutdownMessage);
                        // Give client time to receive the message before closing
                        Thread.sleep(100);
                        session.close(CloseStatus.GOING_AWAY);
                    } catch (IOException | InterruptedException e) {
                        logger.error("Error during graceful shutdown for session {}", session.getId(), e);
                    }
                }
            }
        }
        
        // Cleanup all tracking maps
        gameSessions.clear();
        sessionToGame.clear();
        sessionToPlayer.clear();
        lastPongTime.clear();
        sequenceNumbers.clear();
        
        logger.info("Graceful shutdown complete");
    }
}
