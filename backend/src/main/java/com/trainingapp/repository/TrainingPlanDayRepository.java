package com.trainingapp.repository;

import com.trainingapp.model.TrainingPlanDay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrainingPlanDayRepository extends JpaRepository<TrainingPlanDay, Long> {
    @Override
    Optional<TrainingPlanDay> findById(Long id);
}
