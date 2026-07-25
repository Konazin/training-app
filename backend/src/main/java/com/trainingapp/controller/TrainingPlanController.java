package com.trainingapp.controller;

import com.trainingapp.dto.ExerciseRequest;
import com.trainingapp.dto.DayExerciseRequest;
import com.trainingapp.dto.DayExerciseConfigRequest;
import com.trainingapp.dto.PlanDayRequest;
import com.trainingapp.dto.RestActivityRequest;
import com.trainingapp.dto.TrainingPlanRequest;
import com.trainingapp.dto.TrainingPlanResponse;
import com.trainingapp.service.TrainingPlanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/training-plans")
public class TrainingPlanController {

    private final TrainingPlanService service;

    public TrainingPlanController(TrainingPlanService service) {
        this.service = service;
    }

    @GetMapping
    public List<TrainingPlanResponse> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public TrainingPlanResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<TrainingPlanResponse> create(@Valid @RequestBody TrainingPlanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public TrainingPlanResponse update(@PathVariable Long id, @Valid @RequestBody TrainingPlanRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<TrainingPlanResponse> duplicate(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.duplicate(id));
    }

    @PostMapping("/{id}/activate")
    public TrainingPlanResponse activate(@PathVariable Long id) { return service.setActive(id); }

    @PatchMapping("/{id}/archive")
    public TrainingPlanResponse archive(@PathVariable Long id, @RequestParam(defaultValue = "true") boolean archived) {
        return service.archive(id, archived);
    }

    @PutMapping("/{planId}/days/{dayId}")
    public TrainingPlanResponse updateDay(
            @PathVariable Long planId,
            @PathVariable Long dayId,
            @Valid @RequestBody PlanDayRequest request
    ) { return service.updateDay(planId, dayId, request); }

    @PostMapping("/{planId}/days/{dayId}/exercises")
    public ResponseEntity<TrainingPlanResponse> addDayExercise(
            @PathVariable Long planId,
            @PathVariable Long dayId,
            @Valid @RequestBody DayExerciseRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addDayExercise(planId, dayId, request));
    }

    @DeleteMapping("/{planId}/days/{dayId}/exercises/{exerciseId}")
    public TrainingPlanResponse removeDayExercise(
            @PathVariable Long planId,
            @PathVariable Long dayId,
            @PathVariable Long exerciseId
    ) { return service.removeDayExercise(planId, dayId, exerciseId); }

    @PutMapping("/{planId}/days/{dayId}/exercises/{exerciseId}")
    public TrainingPlanResponse updateDayExercise(
            @PathVariable Long planId,
            @PathVariable Long dayId,
            @PathVariable Long exerciseId,
            @Valid @RequestBody DayExerciseConfigRequest request
    ) { return service.updateDayExercise(planId, dayId, exerciseId, request); }

    @PutMapping("/{planId}/days/{dayId}/exercises/order")
    public TrainingPlanResponse reorderDayExercises(
            @PathVariable Long planId,
            @PathVariable Long dayId,
            @RequestBody List<Long> exerciseIds
    ) { return service.reorderDayExercises(planId, dayId, exerciseIds); }

    @PostMapping("/{planId}/days/{dayId}/rest-activities")
    public ResponseEntity<TrainingPlanResponse> addRestActivity(
            @PathVariable Long planId,
            @PathVariable Long dayId,
            @Valid @RequestBody RestActivityRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addRestActivity(planId, dayId, request));
    }

    @PutMapping("/{planId}/days/{dayId}/rest-activities/{activityId}")
    public TrainingPlanResponse updateRestActivity(
            @PathVariable Long planId,
            @PathVariable Long dayId,
            @PathVariable Long activityId,
            @Valid @RequestBody RestActivityRequest request
    ) { return service.updateRestActivity(planId, dayId, activityId, request); }

    @DeleteMapping("/{planId}/days/{dayId}/rest-activities/{activityId}")
    public TrainingPlanResponse removeRestActivity(
            @PathVariable Long planId,
            @PathVariable Long dayId,
            @PathVariable Long activityId
    ) { return service.removeRestActivity(planId, dayId, activityId); }

    @PutMapping("/{planId}/days/{dayId}/rest-activities/order")
    public TrainingPlanResponse reorderRestActivities(
            @PathVariable Long planId,
            @PathVariable Long dayId,
            @RequestBody List<Long> activityIds
    ) { return service.reorderRestActivities(planId, dayId, activityIds); }

    @PostMapping("/{id}/exercises")
    public ResponseEntity<TrainingPlanResponse> addExercise(
            @PathVariable Long id,
            @Valid @RequestBody ExerciseRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addExercise(id, request));
    }

    @DeleteMapping("/{planId}/exercises/{exerciseId}")
    public ResponseEntity<Void> deleteExercise(
            @PathVariable Long planId,
            @PathVariable Long exerciseId
    ) {
        service.deleteExercise(planId, exerciseId);
        return ResponseEntity.noContent().build();
    }
}
