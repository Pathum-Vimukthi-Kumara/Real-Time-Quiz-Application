package com.lanquiz.controller;

import com.lanquiz.model.Quiz;
import com.lanquiz.service.GameService;
import com.lanquiz.exception.UnauthorizedException;
import com.lanquiz.exception.ResourceNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    private final GameService gameService;

    public QuizController(GameService gameService) {
        this.gameService = gameService;
    }
    
    private String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || 
            authentication.getPrincipal().equals("anonymousUser")) {
            throw new UnauthorizedException("User not authenticated");
        }
        return authentication.getName();
    }

    @GetMapping
    public ResponseEntity<List<Quiz>> getAllQuizzes() {
        return ResponseEntity.ok(gameService.getAllQuizzes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Quiz> getQuiz(@PathVariable String id) {
        Quiz quiz = gameService.getQuiz(id);
        if (quiz == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(quiz);
    }
    
    @GetMapping("/my")
    public ResponseEntity<List<Quiz>> getMyQuizzes() {
        String email = getCurrentUserEmail();
        List<Quiz> myQuizzes = gameService.getQuizzesByCreator(email);
        return ResponseEntity.ok(myQuizzes);
    }

    @PostMapping
    public ResponseEntity<Quiz> createQuiz(@RequestBody Quiz quiz) {
        String email = getCurrentUserEmail();
        quiz.setCreatedBy(email);
        quiz.setCreatedAt(System.currentTimeMillis());
        Quiz created = gameService.createQuiz(quiz);
        return ResponseEntity.ok(created);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Quiz> updateQuiz(@PathVariable String id, @RequestBody Quiz updatedQuiz) {
        String email = getCurrentUserEmail();
        
        Quiz existingQuiz = gameService.getQuiz(id);
        if (existingQuiz == null) {
            throw new ResourceNotFoundException("Quiz not found with id: " + id);
        }
        
        // Verify ownership
        if (!existingQuiz.getCreatedBy().equals(email)) {
            throw new UnauthorizedException("You don't have permission to update this quiz");
        }
        
        // Update quiz fields
        updatedQuiz.setId(id);
        updatedQuiz.setCreatedBy(email);
        updatedQuiz.setCreatedAt(existingQuiz.getCreatedAt());
        
        Quiz updated = gameService.updateQuiz(updatedQuiz);
        return ResponseEntity.ok(updated);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteQuiz(@PathVariable String id) {
        String email = getCurrentUserEmail();
        
        Quiz existingQuiz = gameService.getQuiz(id);
        if (existingQuiz == null) {
            throw new ResourceNotFoundException("Quiz not found with id: " + id);
        }
        
        // Verify ownership
        if (!existingQuiz.getCreatedBy().equals(email)) {
            throw new UnauthorizedException("You don't have permission to delete this quiz");
        }
        
        gameService.deleteQuiz(id);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Quiz deleted successfully");
        return ResponseEntity.ok(response);
    }
}
