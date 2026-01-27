package com.lanquiz.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lanquiz.model.GameSession;
import com.lanquiz.model.Quiz;
import com.lanquiz.model.WebSocketMessage;
import com.lanquiz.service.GameService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
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

    public QuizWebSocketHandler(GameService gameService) {
        this.gameService = gameService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        logger.info("WebSocket connection established: {}", session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            WebSocketMessage wsMessage = objectMapper.readValue(message.getPayload(), WebSocketMessage.class);
            logger.debug("Received message: {}", wsMessage.getType());

            switch (wsMessage.getType()) {
                case CREATE_GAME -> handleCreateGame(session, wsMessage);
                case JOIN_GAME -> handleJoinGame(session, wsMessage);
                case START_GAME -> handleStartGame(session, wsMessage);
                case SUBMIT_ANSWER -> handleSubmitAnswer(session, wsMessage);
                case NEXT_QUESTION -> handleNextQuestion(session, wsMessage);
                case END_GAME -> handleEndGame(session, wsMessage);
                default -> sendError(session, "Unknown message type");
            }
        } catch (Exception e) {
            logger.error("Error handling message", e);
            sendError(session, e.getMessage());
        }
    }

    private void handleCreateGame(WebSocketSession session, WebSocketMessage wsMessage) throws IOException {
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

    private void handleJoinGame(WebSocketSession session, WebSocketMessage wsMessage) throws IOException {
        Map<String, String> payload = (Map<String, String>) wsMessage.getPayload();
        String pin = payload.get("pin");
        String username = payload.get("username");
        String playerId = session.getId();

        GameSession gameSession = gameService.joinGame(pin, playerId, username);

        // Register player session
        gameSessions.computeIfAbsent(pin, k -> ConcurrentHashMap.newKeySet()).add(session);
        sessionToGame.put(session.getId(), pin);
        sessionToPlayer.put(session.getId(), playerId);

        // Notify the joining player
        WebSocketMessage response = new WebSocketMessage(
                WebSocketMessage.MessageType.PLAYER_JOINED,
                Map.of(
                        "playerId", playerId,
                        "username", username,
                        "players", gameSession.getPlayers().values()),
                gameSession.getId(),
                playerId);
        sendMessage(session, response);

        // Broadcast to all players in the game
        broadcastToGame(pin, response);
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

        Map<String, Object> payload = (Map<String, Object>) wsMessage.getPayload();
        int answerIndex = (Integer) payload.get("answerIndex");

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

        WebSocketMessage response = new WebSocketMessage(
                WebSocketMessage.MessageType.GAME_ENDED,
                Map.of("leaderboard", gameService.getLeaderboard(pin)),
                null,
                null);
        broadcastToGame(pin, response);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String pin = sessionToGame.remove(session.getId());
        String playerId = sessionToPlayer.remove(session.getId());

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
        String json = objectMapper.writeValueAsString(message);
        session.sendMessage(new TextMessage(json));
    }

    private void sendError(WebSocketSession session, String errorMessage) throws IOException {
        WebSocketMessage error = new WebSocketMessage(
                WebSocketMessage.MessageType.ERROR,
                Map.of("message", errorMessage),
                null,
                null);
        sendMessage(session, error);
    }
}
