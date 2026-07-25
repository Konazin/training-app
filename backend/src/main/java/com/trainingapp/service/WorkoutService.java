package com.trainingapp.service;

import com.trainingapp.dto.DashboardResponse;
import com.trainingapp.dto.ExerciseRequest;
import com.trainingapp.dto.ExerciseResponse;
import com.trainingapp.dto.WorkoutRequest;
import com.trainingapp.dto.WorkoutResponse;
import com.trainingapp.exception.ResourceNotFoundException;
import com.trainingapp.model.Exercise;
import com.trainingapp.model.Workout;
import com.trainingapp.model.WorkoutStatus;
import com.trainingapp.model.SessionStatus;
import com.trainingapp.model.WorkoutSetLog;
import com.trainingapp.repository.TrainingPlanRepository;
import com.trainingapp.repository.WorkoutRepository;
import com.trainingapp.repository.WorkoutSessionRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;

@Service
@Transactional
public class WorkoutService {

    private final WorkoutRepository workoutRepository;
    private final WorkoutSessionRepository sessionRepository;
    private final TrainingPlanRepository planRepository;

    public WorkoutService(
            WorkoutRepository workoutRepository,
            WorkoutSessionRepository sessionRepository,
            TrainingPlanRepository planRepository
    ) {
        this.workoutRepository = workoutRepository;
        this.sessionRepository = sessionRepository;
        this.planRepository = planRepository;
    }

    public List<WorkoutResponse> findAll() {
        return workoutRepository.findAllByOrderByScheduledDateDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public WorkoutResponse findById(Long id) {
        return toResponse(findWorkout(id));
    }

    public WorkoutResponse create(WorkoutRequest request) {
        Workout workout = new Workout();
        applyRequest(workout, request);
        OffsetDateTime now = OffsetDateTime.now();
        workout.setCreatedAt(now);
        workout.setUpdatedAt(now);
        return toResponse(workoutRepository.save(workout));
    }

    public WorkoutResponse update(Long id, WorkoutRequest request) {
        Workout workout = findWorkout(id);
        applyRequest(workout, request);
        workout.setUpdatedAt(OffsetDateTime.now());
        return toResponse(workoutRepository.save(workout));
    }

    public void delete(Long id) {
        Workout workout = findWorkout(id);
        workoutRepository.delete(workout);
    }

    public WorkoutResponse addExercise(Long workoutId, ExerciseRequest request) {
        Workout workout = findWorkout(workoutId);
        Exercise exercise = new Exercise();
        exercise.setWorkout(workout);
        exercise.setName(request.name().trim());
        exercise.setMuscleGroup(request.muscleGroup().trim());
        exercise.setSets(request.sets());
        exercise.setReps(request.reps());
        exercise.setWeightKg(request.weightKg());
        exercise.setRestSeconds(request.restSeconds());
        exercise.setCustomStats(new LinkedHashMap<>(
                request.customStats() == null ? java.util.Map.of() : request.customStats()));
        exercise.setCreatedAt(OffsetDateTime.now());
        workout.getExercises().add(exercise);
        workout.setUpdatedAt(OffsetDateTime.now());
        return toResponse(workoutRepository.save(workout));
    }

    public void deleteExercise(Long workoutId, Long exerciseId) {
        Workout workout = findWorkout(workoutId);
        Exercise exercise = workout.getExercises().stream()
                .filter(item -> item.getId().equals(exerciseId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Exercício não encontrado neste treino"));
        workout.getExercises().remove(exercise);
        workout.setUpdatedAt(OffsetDateTime.now());
        workoutRepository.save(workout);
    }

    public DashboardResponse dashboard() {
        List<WorkoutResponse> workouts = findAll();
        long completed = workouts.stream().filter(item -> item.status() == WorkoutStatus.COMPLETED).count();
        long exerciseCount = workouts.stream().mapToLong(item -> item.exercises().size()).sum();
        long minutes = workouts.stream().mapToLong(WorkoutResponse::durationMinutes).sum();
        long calories = workouts.stream().mapToLong(WorkoutResponse::calories).sum();
        var sessions = sessionRepository.findAllByOrderByStartedAtDesc();
        long completedSessions = sessions.stream().filter(item -> item.getStatus() == SessionStatus.COMPLETED).count();
        java.time.LocalDate weekStart = java.time.LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        long weeklySessions = sessions.stream().filter(item -> item.getStatus() == SessionStatus.COMPLETED)
                .filter(item -> !item.getScheduledDate().isBefore(weekStart)).count();
        java.math.BigDecimal volume = sessions.stream().flatMap(item -> item.getExercises().stream())
                .flatMap(item -> item.getSets().stream()).filter(WorkoutSetLog::isCompleted)
                .map(item -> item.getLoad().multiply(java.math.BigDecimal.valueOf(item.getReps())))
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        var activePlan = planRepository.findAllByOrderByUpdatedAtDesc().stream()
                .filter(item -> item.isActive() && !item.isArchived()).findFirst().orElse(null);
        var nextDay = activePlan == null ? null : activePlan.getDays().stream()
                .filter(item -> !item.isRestDay() && !item.getExercises().isEmpty())
                .filter(item -> item.getSortOrder() >= java.time.LocalDate.now().getDayOfWeek().getValue())
                .findFirst().orElseGet(() -> activePlan.getDays().stream()
                        .filter(item -> !item.isRestDay() && !item.getExercises().isEmpty()).findFirst().orElse(null));
        int adherence = sessions.isEmpty() ? 0 : (int) Math.round(completedSessions * 100.0 / sessions.size());
        return new DashboardResponse(
                workouts.size(),
                completed,
                exerciseCount,
                minutes,
                calories,
                workouts.stream().limit(3).toList(),
                activePlan == null ? null : activePlan.getName(),
                nextDay == null ? null : (nextDay.getTitle().isBlank() ? activePlan.getName() : nextDay.getTitle()),
                nextDay == null ? null : nextDay.getId(),
                completedSessions,
                weeklySessions,
                volume,
                adherence
        );
    }

    private Workout findWorkout(Long id) {
        return workoutRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Treino não encontrado"));
    }

    private void applyRequest(Workout workout, WorkoutRequest request) {
        workout.setName(request.name().trim());
        workout.setDescription(request.description() == null ? "" : request.description().trim());
        workout.setScheduledDate(request.scheduledDate());
        workout.setStatus(request.status());
        workout.setDurationMinutes(request.durationMinutes());
        workout.setCalories(request.calories());
        workout.setCustomStats(new LinkedHashMap<>(
                request.customStats() == null ? java.util.Map.of() : request.customStats()));
    }

    private WorkoutResponse toResponse(Workout workout) {
        return new WorkoutResponse(
                workout.getId(),
                workout.getName(),
                workout.getDescription(),
                workout.getScheduledDate(),
                workout.getStatus(),
                workout.getDurationMinutes(),
                workout.getCalories(),
                workout.getCustomStats(),
                workout.getExercises().stream().map(this::toResponse).toList(),
                workout.getCreatedAt(),
                workout.getUpdatedAt()
        );
    }

    private ExerciseResponse toResponse(Exercise exercise) {
        return new ExerciseResponse(
                exercise.getId(),
                exercise.getName(),
                exercise.getMuscleGroup(),
                exercise.getSets(),
                exercise.getReps(),
                exercise.getWeightKg(),
                exercise.getRestSeconds(),
                exercise.getCustomStats(),
                exercise.getCreatedAt()
        );
    }
}
