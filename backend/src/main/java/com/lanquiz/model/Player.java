package com.lanquiz.model;

import java.util.concurrent.atomic.AtomicInteger;

public class Player {
    private String id;
    private String username;
    private AtomicInteger score;
    private AtomicInteger correctAnswers;
    private AtomicInteger totalAnswers;
    private long lastAnswerTime;
    private String reconnectionToken;

    public Player() {
        this.score = new AtomicInteger(0);
        this.correctAnswers = new AtomicInteger(0);
        this.totalAnswers = new AtomicInteger(0);
    }

    public Player(String id, String username, int score, int correctAnswers, int totalAnswers, long lastAnswerTime) {
        this.id = id;
        this.username = username;
        this.score = new AtomicInteger(score);
        this.correctAnswers = new AtomicInteger(correctAnswers);
        this.totalAnswers = new AtomicInteger(totalAnswers);
        this.lastAnswerTime = lastAnswerTime;
        this.reconnectionToken = null;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public int getScore() {
        return score.get();
    }

    public void setScore(int score) {
        this.score.set(score);
    }

    public void addScore(int points) {
        this.score.addAndGet(points);
    }

    public int getCorrectAnswers() {
        return correctAnswers.get();
    }

    public void setCorrectAnswers(int correctAnswers) {
        this.correctAnswers.set(correctAnswers);
    }

    public void incrementCorrectAnswers() {
        this.correctAnswers.incrementAndGet();
    }

    public int getTotalAnswers() {
        return totalAnswers.get();
    }

    public void setTotalAnswers(int totalAnswers) {
        this.totalAnswers.set(totalAnswers);
    }

    public void incrementTotalAnswers() {
        this.totalAnswers.incrementAndGet();
    }

    public long getLastAnswerTime() {
        return lastAnswerTime;
    }

    public void setLastAnswerTime(long lastAnswerTime) {
        this.lastAnswerTime = lastAnswerTime;
    }

    public String getReconnectionToken() {
        return reconnectionToken;
    }

    public void setReconnectionToken(String reconnectionToken) {
        this.reconnectionToken = reconnectionToken;
    }
}
