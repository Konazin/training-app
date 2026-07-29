package com.trainingapp.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.Map;

@RestController
public class HealthController {
    private final JdbcTemplate database;
    private final String version;

    public HealthController(JdbcTemplate database, @Value("${app.version:unknown}") String version) {
        this.database = database;
        this.version = version;
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        database.queryForObject("select 1", Integer.class);
        return Map.of("status", "UP", "database", "UP", "version", version, "timestamp", OffsetDateTime.now());
    }
}
