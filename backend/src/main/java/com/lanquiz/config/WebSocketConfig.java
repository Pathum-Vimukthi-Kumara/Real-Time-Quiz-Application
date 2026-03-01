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
            
            if (query != null && query.contains("token=")) {
                String token = extractToken(query);
                
                if (token != null) {
                    try {
                        if (jwtUtil.validateToken(token)) {
                            String userEmail = jwtUtil.extractEmail(token);
                            attributes.put("userEmail", userEmail);
                            logger.info("WebSocket authentication successful for user: {}", userEmail);
                            return true;
                        }
                    } catch (Exception e) {
                        logger.warn("Invalid JWT token: {}", e.getMessage());
                    }
                }
            }
            
            // No token or invalid token - reject handshake
            logger.warn("WebSocket authentication failed - invalid or missing token");
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
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
