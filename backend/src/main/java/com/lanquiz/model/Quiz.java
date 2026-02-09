package com.lanquiz.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "quizzes")
public class Quiz {
    @Id
    private String id;
    private String title;
    private String description;
    private List<Question> questions;
    
    @Indexed
    private String createdBy;
    
    private long createdAt;
    private int timePerQuestion; // in seconds

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Question {
        private String questionText;
        private List<String> options;
        private int correctOptionIndex;
        private int points;
    }
}
