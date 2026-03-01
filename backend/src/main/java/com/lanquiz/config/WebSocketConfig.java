package com.lanquiz.config;

import com.lanquiz.handler.QuizWebSocketHandler;
import com.lanquiz.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.util.Map;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketConfig.class);
    private final QuizWebSocketHandler quizWebSocketHandler;
    private final JwtUtil jwtUtil;

    public WebSocketConfig(QuizWebSocketHandler quizWebSocketHandler, JwtUtil jwtUtil) {
        this.quizWebSocketHandler = quizWebSocketHandler;
        this.jwtUtil = jwtUtil;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(quizWebSocketHandler, "/ws/quiz")
                .setAllowedOrigins("*") // Allow all origins for LAN access
                .addInterceptors(new JwtHandshakeInterceptor(jwtUtil));
    }

    private static class JwtHandshakeInterceptor implements HandshakeInterceptor {
        
        private final JwtUtil jwtUtil;
        
        public JwtHandshakeInterceptor(JwtUtil jwtUtil) {
            this.jwtUtil = jwtUtil;
        }

        @Override
        public boolean beforeHandshake(
                ServerHttpRequest request, 
                ServerHttpResponse response,
                WebSocketHandler wsHandler, 
                Map<String, Object> attributes) throws Exception {
            
            URI uri = request.getURI();
            String query = uri.getQuery();
            
            // Optional JWT authentication: hosts provide tokens, players don't
            if (query != null && query.contains("token=")) {
                String token = extractToken(query);
                
                if (token != null) {
                    try {
                        if (jwtUtil.validateToken(token)) {
                            String userEmail = jwtUtil.extractEmail(token);
                            attributes.put("userEmail", userEmail);
                            attributes.put("authenticated", true);
                            logger.info("WebSocket authenticated connection for user: {}", userEmail);
                            return true;
                        } else {
                            // Invalid token provided - reject
                            logger.warn("Invalid JWT token");
                            response.setStatusCode(HttpStatus.UNAUTHORIZED);
                            return false;
                        }
                    } catch (Exception e) {
                        logger.warn("JWT token validation error: {}", e.getMessage());
                        response.setStatusCode(HttpStatus.UNAUTHORIZED);
                        return false;
                    }
                }
            }
            
            // No token provided - allow connection (for players joining games)
            logger.debug("WebSocket unauthenticated connection allowed");
            attributes.put("authenticated", false);
            return true;
        }
        
        private String extractToken(String query) {
            String[] params = query.split("&");
            for (String param : params) {
                if (param.startsWith("token=")) {
                    return param.substring(6); // "token=".length() == 6
                }
            }
            return null;
        }

        @Override
        public void afterHandshake(
                ServerHttpRequest request, 
                ServerHttpResponse response,
                WebSocketHandler wsHandler, 
                Exception exception) {
            // Nothing to do after handshake
        }
    }
}
