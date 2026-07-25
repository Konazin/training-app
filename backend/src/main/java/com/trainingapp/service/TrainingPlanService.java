package com.trainingapp.service;

import com.trainingapp.dto.DayExerciseRequest;
import com.trainingapp.dto.ExerciseRequest;
import com.trainingapp.dto.PlanDayRequest;
import com.trainingapp.dto.PlanDayResponse;
import com.trainingapp.dto.PlanExerciseResponse;
import com.trainingapp.dto.RestActivityRequest;
import com.trainingapp.dto.TrainingPlanRequest;
import com.trainingapp.dto.TrainingPlanResponse;
import com.trainingapp.exception.ResourceNotFoundException;
import com.trainingapp.model.PlanExercise;
import com.trainingapp.model.RestDayActivity;
import com.trainingapp.model.TrainingDayExercise;
import com.trainingapp.model.TrainingPlan;
import com.trainingapp.model.TrainingPlanDay;
import com.trainingapp.repository.TrainingPlanDayRepository;
import com.trainingapp.repository.TrainingPlanRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;

@Service
@Transactional
public class TrainingPlanService {
    private final TrainingPlanRepository repository;
    private final TrainingPlanDayRepository dayRepository;
    private final ExerciseLibraryService exerciseLibrary;

    public TrainingPlanService(
            TrainingPlanRepository repository,
            TrainingPlanDayRepository dayRepository,
            ExerciseLibraryService exerciseLibrary
    ) {
        this.repository = repository;
        this.dayRepository = dayRepository;
        this.exerciseLibrary = exerciseLibrary;
    }

    public List<TrainingPlanResponse> findAll() {
        return repository.findAllByOrderByUpdatedAtDesc().stream().map(this::toResponse).toList();
    }

    public TrainingPlanResponse findById(Long id) { return toResponse(findPlan(id)); }

    public TrainingPlanResponse ensureWeek(Long id) {
        TrainingPlan plan = findPlan(id);
        if (plan.getDays().isEmpty()) {
            for (DayOfWeek weekday : DayOfWeek.values()) {
                TrainingPlanDay day = new TrainingPlanDay();
                day.setTrainingPlan(plan);
                day.setWeekday(weekday);
                day.setSortOrder(weekday.getValue());
                plan.getDays().add(day);
            }
            touch(plan);
            repository.save(plan);
        }
        return toResponse(plan);
    }

    public TrainingPlanResponse create(TrainingPlanRequest request) {
        validateDates(request);
        TrainingPlan plan = new TrainingPlan();
        applyRequest(plan, request);
        OffsetDateTime now = OffsetDateTime.now();
        plan.setCreatedAt(now);
        plan.setUpdatedAt(now);
        for (DayOfWeek weekday : DayOfWeek.values()) {
            TrainingPlanDay day = new TrainingPlanDay();
            day.setTrainingPlan(plan);
            day.setWeekday(weekday);
            day.setSortOrder(weekday.getValue());
            plan.getDays().add(day);
        }
        return toResponse(repository.save(plan));
    }

    public TrainingPlanResponse update(Long id, TrainingPlanRequest request) {
        validateDates(request);
        TrainingPlan plan = findPlan(id);
        applyRequest(plan, request);
        touch(plan);
        return toResponse(repository.save(plan));
    }

    public TrainingPlanResponse duplicate(Long id) {
        TrainingPlan source = findPlan(id);
        TrainingPlan copy = new TrainingPlan();
        copy.setName(source.getName() + " — cópia");
        copy.setDescription(source.getDescription());
        copy.setCategory(source.getCategory());
        copy.setDifficulty(source.getDifficulty());
        copy.setStartDate(source.getStartDate());
        copy.setEndDate(source.getEndDate());
        OffsetDateTime now = OffsetDateTime.now();
        copy.setCreatedAt(now);
        copy.setUpdatedAt(now);
        for (TrainingPlanDay sourceDay : source.getDays()) {
            TrainingPlanDay day = new TrainingPlanDay();
            day.setTrainingPlan(copy);
            copyDayFields(sourceDay, day);
            for (TrainingDayExercise sourceExercise : sourceDay.getExercises()) {
                TrainingDayExercise exercise = cloneExercise(sourceExercise, day);
                day.getExercises().add(exercise);
            }
            for (RestDayActivity sourceActivity : sourceDay.getRestActivities()) {
                RestDayActivity activity = new RestDayActivity();
                activity.setPlanDay(day);
                activity.setName(sourceActivity.getName());
                activity.setDescription(sourceActivity.getDescription());
                activity.setEstimatedDurationMinutes(sourceActivity.getEstimatedDurationMinutes());
                activity.setCategory(sourceActivity.getCategory());
                activity.setOptional(sourceActivity.isOptional());
                activity.setSortOrder(sourceActivity.getSortOrder());
                day.getRestActivities().add(activity);
            }
            copy.getDays().add(day);
        }
        return toResponse(repository.save(copy));
    }

    public TrainingPlanResponse setActive(Long id) {
        repository.findAll().forEach(plan -> plan.setActive(plan.getId().equals(id)));
        TrainingPlan selected = findPlan(id);
        selected.setArchived(false);
        touch(selected);
        return toResponse(selected);
    }

    public TrainingPlanResponse archive(Long id, boolean archived) {
        TrainingPlan plan = findPlan(id);
        plan.setArchived(archived);
        if (archived) plan.setActive(false);
        touch(plan);
        return toResponse(plan);
    }

    public void delete(Long id) { repository.delete(findPlan(id)); }

    public TrainingPlanResponse updateDay(Long planId, Long dayId, PlanDayRequest request) {
        TrainingPlanDay day = findDay(planId, dayId);
        if (request.restDay() && !day.getExercises().isEmpty() && !day.isRestDay()) {
            throw new IllegalArgumentException("Este dia possui exercícios. Confirme a remoção ou mantenha-os antes de marcar descanso");
        }
        day.setTitle(clean(request.title()));
        day.setDescription(clean(request.description()));
        day.setRestDay(request.restDay());
        day.setEstimatedDurationMinutes(request.estimatedDurationMinutes());
        day.setNotes(clean(request.notes()));
        touch(day.getTrainingPlan());
        return persist(day.getTrainingPlan());
    }

    public TrainingPlanResponse addDayExercise(Long planId, Long dayId, DayExerciseRequest request) {
        TrainingPlanDay day = findDay(planId, dayId);
        if (day.isRestDay()) throw new IllegalArgumentException("Transforme o dia em treino antes de adicionar exercícios");
        if (request.maxReps() < request.minReps()) throw new IllegalArgumentException("A repetição máxima deve ser maior ou igual à mínima");
        TrainingDayExercise item = new TrainingDayExercise();
        item.setPlanDay(day);
        item.setExercise(exerciseLibrary.findEntity(request.exerciseDefinitionId()));
        item.setSortOrder(day.getExercises().size() + 1);
        applyExercise(item, request);
        day.getExercises().add(item);
        touch(day.getTrainingPlan());
        return persist(day.getTrainingPlan());
    }

    public TrainingPlanResponse removeDayExercise(Long planId, Long dayId, Long exerciseId) {
        TrainingPlanDay day = findDay(planId, dayId);
        boolean removed = day.getExercises().removeIf(item -> item.getId().equals(exerciseId));
        if (!removed) throw new ResourceNotFoundException("Exercício não encontrado neste dia");
        reorder(day);
        touch(day.getTrainingPlan());
        return persist(day.getTrainingPlan());
    }

    public TrainingPlanResponse reorderDayExercises(Long planId, Long dayId, List<Long> ids) {
        TrainingPlanDay day = findDay(planId, dayId);
        if (ids.size() != day.getExercises().size()) throw new IllegalArgumentException("A ordem deve conter todos os exercícios do dia");
        for (int index = 0; index < ids.size(); index++) {
            long id = ids.get(index);
            TrainingDayExercise item = day.getExercises().stream().filter(value -> value.getId().equals(id))
                    .findFirst().orElseThrow(() -> new IllegalArgumentException("Exercício inválido na ordenação"));
            item.setSortOrder(index + 1);
        }
        day.getExercises().sort(java.util.Comparator.comparingInt(TrainingDayExercise::getSortOrder));
        touch(day.getTrainingPlan());
        return persist(day.getTrainingPlan());
    }

    public TrainingPlanResponse addRestActivity(Long planId, Long dayId, RestActivityRequest request) {
        TrainingPlanDay day = findDay(planId, dayId);
        if (!day.isRestDay()) throw new IllegalArgumentException("Atividades opcionais só podem ser adicionadas a dias de descanso");
        RestDayActivity activity = new RestDayActivity();
        activity.setPlanDay(day);
        activity.setName(request.name().trim());
        activity.setDescription(clean(request.description()));
        activity.setEstimatedDurationMinutes(request.estimatedDurationMinutes());
        activity.setCategory(request.category().trim());
        activity.setOptional(request.optional());
        activity.setSortOrder(day.getRestActivities().size() + 1);
        day.getRestActivities().add(activity);
        touch(day.getTrainingPlan());
        return persist(day.getTrainingPlan());
    }

    public TrainingPlanResponse removeRestActivity(Long planId, Long dayId, Long activityId) {
        TrainingPlanDay day = findDay(planId, dayId);
        boolean removed = day.getRestActivities().removeIf(item -> item.getId().equals(activityId));
        if (!removed) throw new ResourceNotFoundException("Atividade não encontrada neste dia");
        touch(day.getTrainingPlan());
        return persist(day.getTrainingPlan());
    }

    // Compatibilidade com a primeira versão da API.
    public TrainingPlanResponse addExercise(Long planId, ExerciseRequest request) {
        TrainingPlan plan = findPlan(planId);
        PlanExercise exercise = new PlanExercise();
        exercise.setTrainingPlan(plan);
        exercise.setName(request.name().trim());
        exercise.setMuscleGroup(request.muscleGroup().trim());
        exercise.setSets(request.sets());
        exercise.setReps(request.reps());
        exercise.setWeightKg(request.weightKg());
        exercise.setRestSeconds(request.restSeconds());
        exercise.setCustomStats(new LinkedHashMap<>(request.customStats() == null ? java.util.Map.of() : request.customStats()));
        exercise.setCreatedAt(OffsetDateTime.now());
        plan.getExercises().add(exercise);
        touch(plan);
        return toResponse(repository.save(plan));
    }

    public void deleteExercise(Long planId, Long exerciseId) {
        TrainingPlan plan = findPlan(planId);
        boolean removed = plan.getExercises().removeIf(item -> item.getId().equals(exerciseId));
        if (!removed) throw new ResourceNotFoundException("Exercício não encontrado nesta ficha");
        touch(plan);
        repository.save(plan);
    }

    public TrainingPlan findPlan(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Ficha de treino não encontrada"));
    }

    private TrainingPlanDay findDay(Long planId, Long dayId) {
        TrainingPlanDay day = dayRepository.findById(dayId)
                .orElseThrow(() -> new ResourceNotFoundException("Dia da ficha não encontrado"));
        if (!day.getTrainingPlan().getId().equals(planId)) throw new ResourceNotFoundException("Dia não pertence a esta ficha");
        return day;
    }

    private void applyRequest(TrainingPlan plan, TrainingPlanRequest request) {
        plan.setName(request.name().trim());
        plan.setDescription(clean(request.description()));
        plan.setCategory(request.category().trim());
        plan.setDifficulty(request.difficulty().trim());
        plan.setStartDate(request.startDate());
        plan.setEndDate(request.endDate());
    }

    private void applyExercise(TrainingDayExercise item, DayExerciseRequest request) {
        item.setSets(request.sets());
        item.setMinReps(request.minReps());
        item.setMaxReps(request.maxReps());
        item.setPlannedLoad(request.plannedLoad());
        item.setPlannedDurationSeconds(request.plannedDurationSeconds());
        item.setPlannedDistance(request.plannedDistance());
        item.setRestSeconds(request.restSeconds());
        item.setPlannedRpe(request.plannedRpe());
        item.setSetType(request.setType() == null ? com.trainingapp.model.SetType.NORMAL : request.setType());
        item.setNotes(clean(request.notes()));
        item.setAlternativeExercise(request.alternativeExerciseId() == null ? null : exerciseLibrary.findEntity(request.alternativeExerciseId()));
    }

    private TrainingDayExercise cloneExercise(TrainingDayExercise source, TrainingPlanDay day) {
        TrainingDayExercise item = new TrainingDayExercise();
        item.setPlanDay(day);
        item.setExercise(source.getExercise());
        item.setSortOrder(source.getSortOrder());
        item.setSets(source.getSets());
        item.setMinReps(source.getMinReps());
        item.setMaxReps(source.getMaxReps());
        item.setPlannedLoad(source.getPlannedLoad());
        item.setPlannedDurationSeconds(source.getPlannedDurationSeconds());
        item.setPlannedDistance(source.getPlannedDistance());
        item.setRestSeconds(source.getRestSeconds());
        item.setPlannedRpe(source.getPlannedRpe());
        item.setSetType(source.getSetType());
        item.setNotes(source.getNotes());
        item.setAlternativeExercise(source.getAlternativeExercise());
        return item;
    }

    private void copyDayFields(TrainingPlanDay source, TrainingPlanDay target) {
        target.setWeekday(source.getWeekday());
        target.setTitle(source.getTitle());
        target.setDescription(source.getDescription());
        target.setSortOrder(source.getSortOrder());
        target.setRestDay(source.isRestDay());
        target.setEstimatedDurationMinutes(source.getEstimatedDurationMinutes());
        target.setNotes(source.getNotes());
    }

    private void reorder(TrainingPlanDay day) {
        for (int index = 0; index < day.getExercises().size(); index++) day.getExercises().get(index).setSortOrder(index + 1);
    }

    private void validateDates(TrainingPlanRequest request) {
        if (request.startDate() != null && request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw new IllegalArgumentException("A data final não pode ser anterior à data inicial");
        }
    }

    private void touch(TrainingPlan plan) { plan.setUpdatedAt(OffsetDateTime.now()); }
    private TrainingPlanResponse persist(TrainingPlan plan) { return toResponse(repository.saveAndFlush(plan)); }
    private String clean(String value) { return value == null ? "" : value.trim(); }

    public TrainingPlanResponse toResponse(TrainingPlan plan) {
        return new TrainingPlanResponse(
                plan.getId(), plan.getName(), plan.getDescription(), plan.getCategory(), plan.getDifficulty(),
                plan.isActive(), plan.isArchived(), plan.getStartDate(), plan.getEndDate(),
                plan.getExercises().stream().map(item -> new PlanExerciseResponse(
                        item.getId(), item.getName(), item.getMuscleGroup(), item.getSets(), item.getReps(),
                        item.getWeightKg(), item.getRestSeconds(), item.getCustomStats(), item.getCreatedAt())).toList(),
                plan.getDays().stream().map(this::toResponse).toList(),
                plan.getCreatedAt(), plan.getUpdatedAt());
    }

    private PlanDayResponse toResponse(TrainingPlanDay day) {
        return new PlanDayResponse(
                day.getId(), day.getWeekday(), day.getTitle(), day.getDescription(), day.getSortOrder(),
                day.isRestDay(), day.getEstimatedDurationMinutes(), day.getNotes(),
                day.getExercises().stream().map(item -> new PlanDayResponse.DayExerciseResponse(
                        item.getId(), exerciseLibrary.toResponse(item.getExercise()), item.getSortOrder(), item.getSets(),
                        item.getMinReps(), item.getMaxReps(), item.getPlannedLoad(), item.getPlannedDurationSeconds(),
                        item.getPlannedDistance(), item.getRestSeconds(), item.getPlannedRpe(), item.getSetType(),
                        item.getNotes(), item.getAlternativeExercise() == null ? null : item.getAlternativeExercise().getId())).toList(),
                day.getRestActivities().stream().map(item -> new PlanDayResponse.RestActivityResponse(
                        item.getId(), item.getName(), item.getDescription(), item.getEstimatedDurationMinutes(),
                        item.getCategory(), item.isOptional(), item.getSortOrder())).toList());
    }
}
