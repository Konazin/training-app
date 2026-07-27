package com.trainingapp.umamusume.repository;

import com.trainingapp.umamusume.model.CareerStatus;
import com.trainingapp.umamusume.model.UmaCareer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UmaCareerRepository extends JpaRepository<UmaCareer, Long> {
    List<UmaCareer> findAllByOrderByCreatedAtDesc();
    Optional<UmaCareer> findFirstByStatus(CareerStatus status);
    boolean existsByStatus(CareerStatus status);
}
