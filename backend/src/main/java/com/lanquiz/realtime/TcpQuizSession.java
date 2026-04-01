package com.lanquiz.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class TcpQuizSession implements QuizClientSession {

    private static final Logger logger = LoggerFactory.getLogger(TcpQuizSession.class);

    private final String id = UUID.randomUUID().toString();
    private final Socket socket;
    private final Map<String, Object> attributes = new ConcurrentHashMap<>();
    private final BufferedWriter writer;

    public TcpQuizSession(Socket socket) throws IOException {
        this.socket = socket;
        this.writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    @Override
    public synchronized void sendJson(String json) throws IOException {
        if (!isOpen()) {
            return;
        }
        writer.write(json);
        writer.write('\n');
        writer.flush();
    }

    @Override
    public boolean isOpen() {
        return socket.isConnected() && !socket.isClosed();
    }

    @Override
    public void close() {
        try {
            socket.close();
        } catch (IOException e) {
            logger.debug("Error closing socket: {}", e.getMessage());
        }
    }
}
