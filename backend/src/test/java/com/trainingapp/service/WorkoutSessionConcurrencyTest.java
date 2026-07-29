package com.trainingapp.service;

import com.trainingapp.dto.StartSessionRequest;
import com.trainingapp.dto.DayExerciseRequest;
import com.trainingapp.dto.ExerciseDefinitionRequest;
import com.trainingapp.dto.TrainingPlanRequest;
import com.trainingapp.exception.DomainConflictException;
import com.trainingapp.model.ExerciseCategory;
import com.trainingapp.model.SetType;
import com.trainingapp.repository.WorkoutSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class WorkoutSessionConcurrencyTest {
    private final WorkoutSessionService sessions;
    private final WorkoutSessionRepository repository;
    private final TrainingPlanService plans;
    private final ExerciseLibraryService exerciseLibrary;

    @Autowired
    WorkoutSessionConcurrencyTest(WorkoutSessionService sessions, WorkoutSessionRepository repository,
                                  TrainingPlanService plans, ExerciseLibraryService exerciseLibrary) {
        this.sessions = sessions;
        this.repository = repository;
        this.plans = plans;
        this.exerciseLibrary = exerciseLibrary;
    }

    @Test
    void databaseLockAllowsOnlyOneConcurrentActiveSession() throws Exception {
        repository.deleteAll();
        var exercise = exerciseLibrary.create(new ExerciseDefinitionRequest(
                "Concorrência " + System.nanoTime(), "", "Core", List.of(), "Nenhum",
                ExerciseCategory.STRENGTH, "Teste", "", "", "", false, false
        ));
        var plan = plans.create(new TrainingPlanRequest(
                "Plano concorrente " + System.nanoTime(), "", "Teste", "Teste"
        ));
        var day = plan.days().getFirst();
        plans.addDayExercise(plan.id(), day.id(), new DayExerciseRequest(
                exercise.id(), 1, 8, 8, BigDecimal.ZERO, null, BigDecimal.ZERO,
                30, null, SetType.NORMAL, "", null
        ));
        Long planId = plan.id();
        Long dayId = day.id();
        var barrier = new CyclicBarrier(2);
        try {
            try (var executor = Executors.newFixedThreadPool(2)) {
                var first = executor.submit(() -> start(barrier, planId, dayId));
                var second = executor.submit(() -> start(barrier, planId, dayId));
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
