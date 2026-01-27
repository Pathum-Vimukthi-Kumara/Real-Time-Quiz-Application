package com.lanquiz.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Player {
    private String id;
    private String username;
    private int score;
    private int correctAnswers;
    private int totalAnswers;
    private long lastAnswerTime;
}
