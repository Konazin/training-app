package com.trainingapp.repository;

import com.trainingapp.model.TrainingPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrainingPlanRepository extends JpaRepository<TrainingPlan, Long> {

    @Override
    Optional<TrainingPlan> findById(Long id);

    List<TrainingPlan> findAllByOrderByUpdatedAtDesc();

    boolean existsByNameIgnoreCase(String name);
}
