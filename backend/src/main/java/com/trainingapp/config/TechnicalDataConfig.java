package com.trainingapp.config;

import com.trainingapp.model.WorkoutSessionLock;
import com.trainingapp.repository.WorkoutSessionLockRepository;
import com.trainingapp.integration.wger.service.WgerSyncLock;
import com.trainingapp.integration.wger.service.WgerSyncLockRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

@Configuration
public class TechnicalDataConfig {

    @Bean
    @Order(0)
    CommandLineRunner initializeWorkoutSessionLock(WorkoutSessionLockRepository repository) {
        return args -> {
            if (!repository.existsById(1)) {
                repository.save(new WorkoutSessionLock(1));
            }
        };
    }

    @Bean
    @Order(0)
    CommandLineRunner initializeWgerSyncLock(WgerSyncLockRepository repository) {
        return args -> {
            if (!repository.existsById(1)) {
                repository.save(new WgerSyncLock(1));
            }
        };
    }
}
