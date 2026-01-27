package com.lanquiz.repository;

import com.lanquiz.model.Quiz;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizRepository extends MongoRepository<Quiz, String> {
    List<Quiz> findByCreatedBy(String createdBy);
}
