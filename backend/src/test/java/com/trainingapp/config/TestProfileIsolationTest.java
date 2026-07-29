package com.trainingapp.config;

import com.trainingapp.repository.ExerciseDefinitionRepository;
import com.trainingapp.repository.TrainingPlanRepository;
import com.trainingapp.repository.WorkoutRepository;
import com.trainingapp.repository.WorkoutSessionLockRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class TestProfileIsolationTest {
    @Autowired Environment environment;
    @Autowired DataSource dataSource;
    @Autowired WorkoutRepository workouts;
    @Autowired TrainingPlanRepository plans;
    @Autowired ExerciseDefinitionRepository exercises;
    @Autowired WorkoutSessionLockRepository lock;

    @Test
    void mavenTestsUseIsolatedInMemoryProfileWithoutDemoSeed() throws Exception {
        assertThat(Arrays.asList(environment.getActiveProfiles())).contains("test");
        assertThat(environment.getProperty("spring.h2.console.enabled")).isEqualTo("false");
        assertThat(environment.getProperty("spring.flyway.enabled")).isEqualTo("false");

        try (Connection connection = dataSource.getConnection()) {
            assertThat(connection.getMetaData().getURL()).startsWith("jdbc:h2:mem:");
        }

        assertThat(workouts.count()).isZero();
        assertThat(plans.count()).isZero();
        assertThat(exercises.count()).isZero();
        assertThat(lock.existsById(1)).isTrue();
    }
}
