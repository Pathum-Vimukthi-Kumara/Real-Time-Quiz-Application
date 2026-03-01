package com.lanquiz;

import com.lanquiz.handler.QuizWebSocketHandler;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class QuizApplication {
    public static void main(String[] args) {
        ConfigurableApplicationContext context = SpringApplication.run(QuizApplication.class, args);
        
        // Register shutdown hook for graceful WebSocket cleanup
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("Shutdown hook triggered - closing WebSocket connections gracefully...");
            QuizWebSocketHandler handler = context.getBean(QuizWebSocketHandler.class);
            handler.shutdown();
        }));
    }
}
