package com.lanquiz.repository;

import com.lanquiz.model.GameSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GameSessionRepository extends MongoRepository<GameSession, String> {
    Optional<GameSession> findByPin(String pin);
}
