package com.lanquiz.realtime;

import java.io.IOException;
import java.util.Map;

/**
 * One quiz realtime client connection (TCP). Same lifecycle semantics as the former WebSocket session.
 */
public interface QuizClientSession {

    String getId();

    Map<String, Object> getAttributes();

    void sendJson(String json) throws IOException;

    boolean isOpen();

    void close();
}
