package com.lanquiz.service;

import com.lanquiz.dto.ChangePasswordRequest;
import com.lanquiz.dto.UpdateProfileRequest;
import com.lanquiz.dto.UserProfileResponse;
import com.lanquiz.exception.InvalidCredentialsException;
import com.lanquiz.exception.ResourceNotFoundException;
import com.lanquiz.exception.UserAlreadyExistsException;
import com.lanquiz.model.User;
import com.lanquiz.repository.QuizRepository;
import com.lanquiz.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private QuizRepository quizRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    public UserProfileResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        return new UserProfileResponse(user.getEmail(), user.getName(), user.getCreatedAt());
    }
    
    public UserProfileResponse updateProfile(String currentEmail, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Check if new email is already taken by another user
        if (!currentEmail.equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email " + request.getEmail() + " is already taken");
        }
        
        // Update user profile
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        
        // If email changed, update all quizzes createdBy field
        if (!currentEmail.equals(request.getEmail())) {
            quizRepository.findByCreatedBy(currentEmail).forEach(quiz -> {
                quiz.setCreatedBy(request.getEmail());
                quizRepository.save(quiz);
            });
        }
        
        userRepository.save(user);
        
        return new UserProfileResponse(user.getEmail(), user.getName(), user.getCreatedAt());
    }
    
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Verify old password
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Current password is incorrect");
        }
        
        // Validate new password
        if (request.getNewPassword().length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters long");
        }
        
        // Update password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
    
    @Transactional
    public void deleteAccount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Delete all quizzes created by this user
        quizRepository.deleteAll(quizRepository.findByCreatedBy(email));
        
        // Delete user account
        userRepository.delete(user);
    }
}
