package com.lanquiz.model;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class WebSocketMessage {
    private MessageType type;
    private Object payload;
    private String sessionId;
    private String playerId;
    private Long sequenceNumber;

    public WebSocketMessage(MessageType type, Object payload, String sessionId, String playerId) {
        this.type = type;
        this.payload = payload;
        this.sessionId = sessionId;
        this.playerId = playerId;
        this.sequenceNumber = null;
    }

    public WebSocketMessage(MessageType type, Object payload, String sessionId, String playerId, Long sequenceNumber) {
        this.type = type;
        this.payload = payload;
        this.sessionId = sessionId;
        this.playerId = playerId;
        this.sequenceNumber = sequenceNumber;
    }

    public enum MessageType {
        // Client -> Server
        CREATE_GAME,
        JOIN_GAME,
        RECONNECT_GAME,
        START_GAME,
        SUBMIT_ANSWER,
        NEXT_QUESTION,
        END_GAME,
        LATENCY_PING,

        // Server -> Client
        GAME_CREATED,
        PLAYER_JOINED,
        PLAYER_RECONNECTED,
        PLAYER_LEFT,
        GAME_STARTED,
        QUESTION,
        ANSWER_RESULT,
        LEADERBOARD,
        GAME_ENDED,
        LATENCY_PONG,
        ERROR
    }
}
