package com.lanquiz.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "game_sessions")
public class GameSession {
    @Id
    private String id;
    private String pin;
    private String quizId;
    private GameState state;
    private int currentQuestionIndex;
    private Map<String, Player> players = new ConcurrentHashMap<>();
    private long questionStartTime;
    private String hostId;

    public Map<String, Player> getPlayers() {
        return players;
    }

    public void setPlayers(Map<String, Player> players) {
        this.players = players;
    }

    public enum GameState {
        WAITING, // Waiting for players to join
        IN_PROGRESS, // Quiz is running
        SHOWING_ANSWER, // Showing correct answer
        LEADERBOARD, // Showing leaderboard between questions
        FINISHED // Quiz completed
    }
}
