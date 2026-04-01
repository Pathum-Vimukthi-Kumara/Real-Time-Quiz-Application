package com.lanquiz.realtime;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class TcpQuizServer {

    private static final Logger logger = LoggerFactory.getLogger(TcpQuizServer.class);

    private final QuizRealtimeCoordinator coordinator;
    private final int port;
    private final String bindAddress;
    private final ExecutorService clientExecutor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "tcp-quiz-client");
        t.setDaemon(true);
        return t;
    });
    private final AtomicBoolean running = new AtomicBoolean(false);
    private ServerSocket serverSocket;
    private Thread acceptThread;

    public TcpQuizServer(
            QuizRealtimeCoordinator coordinator,
            @Value("${quiz.tcp.port:8082}") int port,
            @Value("${quiz.tcp.address:0.0.0.0}") String bindAddress) {
        this.coordinator = coordinator;
        this.port = port;
        this.bindAddress = bindAddress;
        start();
    }

    private void start() {
        if (!running.compareAndSet(false, true)) {
            return;
        }
        acceptThread = new Thread(this::acceptLoop, "tcp-quiz-accept");
        acceptThread.setDaemon(true);
        acceptThread.start();
    }

    private void acceptLoop() {
        try {
            InetAddress addr = InetAddress.getByName(bindAddress);
            serverSocket = new ServerSocket(port, 50, addr);
            logger.info("Quiz TCP server listening on {}:{}", bindAddress, port);

            while (running.get() && !serverSocket.isClosed()) {
                try {
                    Socket socket = serverSocket.accept();
                    socket.setTcpNoDelay(true);
                    clientExecutor.submit(() -> handleClient(socket));
                } catch (Exception e) {
                    if (running.get()) {
                        logger.error("Error accepting TCP connection", e);
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Quiz TCP server failed to start on port {}", port, e);
        }
    }

    private void handleClient(Socket rawSocket) {
        TcpQuizSession session;
        try {
            session = new TcpQuizSession(rawSocket);
        } catch (Exception e) {
            logger.error("Failed to create TCP session", e);
            try {
                rawSocket.close();
            } catch (Exception ignored) {
                // ignored
            }
            return;
        }

        coordinator.onOpen(session);
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(rawSocket.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while (running.get() && (line = reader.readLine()) != null) {
                coordinator.onMessage(session, line);
            }
        } catch (Exception e) {
            logger.debug("TCP client read ended: {}", e.getMessage());
        } finally {
            coordinator.onClose(session);
            session.close();
        }
    }

    @PreDestroy
    public void stopServer() {
        coordinator.shutdown();
        running.set(false);
        if (serverSocket != null && !serverSocket.isClosed()) {
            try {
                serverSocket.close();
            } catch (Exception e) {
                logger.debug("Closing server socket: {}", e.getMessage());
            }
        }
        clientExecutor.shutdown();
        try {
            if (!clientExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                clientExecutor.shutdownNow();
            }
        } catch (InterruptedException e) {
            clientExecutor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
