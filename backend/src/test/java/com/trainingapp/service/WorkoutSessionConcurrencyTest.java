package com.trainingapp.service;

import com.trainingapp.dto.StartSessionRequest;
import com.trainingapp.exception.DomainConflictException;
import com.trainingapp.repository.WorkoutSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class WorkoutSessionConcurrencyTest {
    private final WorkoutSessionService sessions;
    private final WorkoutSessionRepository repository;
    private final TrainingPlanService plans;

    @Autowired
    WorkoutSessionConcurrencyTest(WorkoutSessionService sessions, WorkoutSessionRepository repository,
                                  TrainingPlanService plans) {
        this.sessions = sessions;
        this.repository = repository;
        this.plans = plans;
    }

    @Test
    void databaseLockAllowsOnlyOneConcurrentActiveSession() throws Exception {
        repository.deleteAll();
        var plan = plans.findAll().stream()
                .filter(item -> item.days().stream().anyMatch(day -> !day.exercises().isEmpty()))
                .findFirst().orElseThrow();
        var day = plan.days().stream().filter(item -> !item.exercises().isEmpty()).findFirst().orElseThrow();
        var barrier = new CyclicBarrier(2);
        try {
            try (var executor = Executors.newFixedThreadPool(2)) {
                var first = executor.submit(() -> start(barrier, plan.id(), day.id()));
                var second = executor.submit(() -> start(barrier, plan.id(), day.id()));
                var results = java.util.List.of(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS));
                assertThat(results).containsExactlyInAnyOrder("CREATED", "CONFLICT");
                assertThat(repository.count()).isOne();
            }
        } finally {
            repository.deleteAll();
        }
    }

    private String start(CyclicBarrier barrier, Long planId, Long dayId) throws Exception {
        barrier.await(2, TimeUnit.SECONDS);
        try {
            sessions.start(new StartSessionRequest(planId, dayId, LocalDate.now()));
            return "CREATED";
        } catch (DomainConflictException exception) {
            return "CONFLICT";
        }
    }
}
