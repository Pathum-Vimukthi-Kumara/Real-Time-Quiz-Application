package com.lanquiz.controller;

import com.lanquiz.dto.ChangePasswordRequest;
import com.lanquiz.dto.UpdateProfileRequest;
import com.lanquiz.dto.UserProfileResponse;
import com.lanquiz.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "*")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    private String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getName();
    }
    
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile() {
        String email = getCurrentUserEmail();
        UserProfileResponse profile = userService.getProfile(email);
        return ResponseEntity.ok(profile);
    }
    
    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        String email = getCurrentUserEmail();
        UserProfileResponse profile = userService.updateProfile(email, request);
        return ResponseEntity.ok(profile);
    }
    
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        String email = getCurrentUserEmail();
        userService.changePassword(email, request);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password changed successfully");
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/account")
    public ResponseEntity<Map<String, String>> deleteAccount() {
        String email = getCurrentUserEmail();
        userService.deleteAccount(email);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Account deleted successfully");
        return ResponseEntity.ok(response);
    }
}
