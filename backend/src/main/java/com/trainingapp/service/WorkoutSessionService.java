package com.trainingapp.service;

import com.trainingapp.dto.CompleteSessionRequest;
import com.trainingapp.dto.SetLogRequest;
import com.trainingapp.dto.StartSessionRequest;
import com.trainingapp.dto.WorkoutSessionResponse;
import com.trainingapp.event.TrainingDomainEvent;
import com.trainingapp.exception.ResourceNotFoundException;
import com.trainingapp.model.SessionExerciseStatus;
import com.trainingapp.model.SessionStatus;
import com.trainingapp.model.ExerciseCategory;
import com.trainingapp.model.TrainingDayExercise;
import com.trainingapp.model.TrainingPlan;
import com.trainingapp.model.TrainingPlanDay;
import com.trainingapp.model.WorkoutSession;
import com.trainingapp.model.WorkoutSessionExercise;
import com.trainingapp.model.WorkoutSetLog;
import com.trainingapp.repository.TrainingPlanDayRepository;
import com.trainingapp.repository.WorkoutSessionRepository;
import com.trainingapp.repository.WorkoutSessionLockRepository;
import com.trainingapp.exception.DomainConflictException;
import com.trainingapp.model.ExerciseMedia;
import com.trainingapp.model.ExerciseMediaSelector;
import com.trainingapp.model.ExerciseMediaType;
import jakarta.transaction.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@Transactional
public class WorkoutSessionService {
    private static final List<SessionStatus> ACTIVE = List.of(SessionStatus.IN_PROGRESS, SessionStatus.PAUSED);
    private final WorkoutSessionRepository repository;
    private final TrainingPlanService planService;
    private final TrainingPlanDayRepository dayRepository;
    private final ApplicationEventPublisher events;
    private final WorkoutSessionLockRepository sessionLock;

    public WorkoutSessionService(
            WorkoutSessionRepository repository,
            TrainingPlanService planService,
            TrainingPlanDayRepository dayRepository,
            ApplicationEventPublisher events,
            WorkoutSessionLockRepository sessionLock
    ) {
        this.repository = repository;
        this.planService = planService;
        this.dayRepository = dayRepository;
        this.events = events;
        this.sessionLock = sessionLock;
    }

    public WorkoutSessionResponse start(StartSessionRequest request) {
        lockSessionSlot();
        TrainingPlan plan = planService.findPlan(request.trainingPlanId());
        TrainingPlanDay day = dayRepository.findById(request.planDayId())
                .orElseThrow(() -> new ResourceNotFoundException("Dia da ficha não encontrado"));
        if (!day.getTrainingPlan().getId().equals(plan.getId())) throw new IllegalArgumentException("Dia não pertence à ficha informada");
        if (day.isRestDay()) throw new IllegalArgumentException("Um dia de descanso não inicia uma sessão convencional");
        if (day.getExercises().isEmpty()) throw new IllegalArgumentException("Adicione exercícios antes de iniciar o treino");
        if (repository.existsByStatusIn(ACTIVE)) {
            throw new DomainConflictException("Já existe uma sessão ativa");
        }
        WorkoutSession session = new WorkoutSession();
        session.setTrainingPlan(plan);
        session.setPlanDay(day);
        session.setWorkoutNameSnapshot(day.getTitle().isBlank() ? plan.getName() : day.getTitle());
        session.setScheduledDate(request.scheduledDate() == null ? LocalDate.now() : request.scheduledDate());
        session.setStartedAt(OffsetDateTime.now());
        for (TrainingDayExercise planned : day.getExercises()) {
            WorkoutSessionExercise exercise = new WorkoutSessionExercise();
            exercise.setSession(session);
            exercise.setExerciseDefinitionId(planned.getExercise().getId());
            exercise.setExerciseNameSnapshot(planned.getExercise().getName());
            exercise.setMuscleGroupSnapshot(planned.getExercise().getPrimaryMuscleGroup());
            exercise.setCategorySnapshot(planned.getExercise().getCategory());
            exercise.setTimedSnapshot(planned.getExercise().isTimed());
            ExerciseMedia primaryVideo = ExerciseMediaSelector
                    .primary(planned.getExercise().getMedia(), ExerciseMediaType.VIDEO).orElse(null);
            ExerciseMedia primaryImage = ExerciseMediaSelector
                    .primary(planned.getExercise().getMedia(), ExerciseMediaType.IMAGE).orElse(null);
            exercise.setPrimaryVideoUrl(primaryVideo == null ? null : primaryVideo.getUrl());
            exercise.setPrimaryImageUrl(primaryImage == null ? null : primaryImage.getUrl());
            exercise.setPrimaryVideoSourceUrl(value(primaryVideo, ExerciseMedia::getSourceUrl,
                    planned.getExercise().getSourceUrl()));
            exercise.setPrimaryVideoLicenseName(value(primaryVideo, ExerciseMedia::getLicenseName,
                    planned.getExercise().getLicenseName()));
            exercise.setPrimaryVideoLicenseUrl(value(primaryVideo, ExerciseMedia::getLicenseUrl,
                    planned.getExercise().getLicenseUrl()));
            exercise.setPrimaryVideoAuthor(value(primaryVideo, ExerciseMedia::getAuthor,
                    planned.getExercise().getAuthor()));
            exercise.setAttribution(attribution(exercise));
            exercise.setSortOrder(planned.getSortOrder());
            exercise.setPlannedSets(planned.getSets());
            exercise.setPlannedMinReps(planned.getMinReps());
            exercise.setPlannedMaxReps(planned.getMaxReps());
            exercise.setRestSeconds(planned.getRestSeconds());
            exercise.setNotes(planned.getNotes());
            for (int setNumber = 1; setNumber <= planned.getSets(); setNumber++) {
                WorkoutSetLog set = new WorkoutSetLog();
                set.setSessionExercise(exercise);
                set.setSetNumber(setNumber);
                set.setReps(planned.getMinReps());
                set.setLoad(planned.getPlannedLoad() == null ? BigDecimal.ZERO : planned.getPlannedLoad());
                set.setDurationSeconds(planned.getPlannedDurationSeconds() == null ? 0 : planned.getPlannedDurationSeconds());
                set.setDistance(planned.getPlannedDistance() == null ? BigDecimal.ZERO : planned.getPlannedDistance());
                set.setRpe(planned.getPlannedRpe());
                exercise.getSets().add(set);
            }
            session.getExercises().add(exercise);
        }
        WorkoutSession saved = repository.save(session);
        events.publishEvent(new TrainingDomainEvent.SessionStarted(saved.getId(), OffsetDateTime.now()));
        return toResponse(saved);
    }

    public List<WorkoutSessionResponse> history(Long planId, Long exerciseId, SessionStatus status) {
        return repository.findAllByOrderByStartedAtDesc().stream()
                .filter(item -> planId == null || item.getTrainingPlan() != null && item.getTrainingPlan().getId().equals(planId))
                .filter(item -> status == null || item.getStatus() == status)
                .filter(item -> exerciseId == null || item.getExercises().stream()
                        .anyMatch(exercise -> exerciseId.equals(exercise.getExerciseDefinitionId())))
                .map(this::toResponse).toList();
    }

    public WorkoutSessionResponse findById(Long id) { return toResponse(findSession(id)); }

    public WorkoutSessionResponse active() {
        return repository.findFirstByStatusInOrderByStartedAtDesc(ACTIVE).map(this::toResponse).orElse(null);
    }

    public WorkoutSessionResponse updateSet(Long sessionId, Long exerciseId, Long setId, SetLogRequest request) {
        WorkoutSession session = requireEditable(sessionId);
        WorkoutSessionExercise exercise = findExercise(session, exerciseId);
        WorkoutSetLog set = exercise.getSets().stream().filter(item -> item.getId().equals(setId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Série não encontrada"));
        boolean wasCompleted = set.isCompleted();
        set.setReps(request.reps());
        set.setLoad(request.load() == null ? BigDecimal.ZERO : request.load());
        set.setDurationSeconds(request.durationSeconds());
        set.setDistance(request.distance() == null ? BigDecimal.ZERO : request.distance());
        set.setRpe(request.rpe());
        set.setNotes(request.notes() == null ? "" : request.notes().trim());
        set.setCompleted(request.completed());
        set.setCompletedAt(request.completed() ? OffsetDateTime.now() : null);
        if (request.completed() && !wasCompleted) {
            exercise.setStatus(SessionExerciseStatus.IN_PROGRESS);
            events.publishEvent(new TrainingDomainEvent.SetCompleted(set.getId(), OffsetDateTime.now()));
        }
        if (exercise.getSets().stream().allMatch(WorkoutSetLog::isCompleted)) {
            exercise.setStatus(SessionExerciseStatus.COMPLETED);
            events.publishEvent(new TrainingDomainEvent.ExerciseCompleted(exercise.getId(), OffsetDateTime.now()));
        } else if (!request.completed() && exercise.getStatus() == SessionExerciseStatus.COMPLETED) {
            exercise.setStatus(SessionExerciseStatus.IN_PROGRESS);
        }
        return toResponse(repository.save(session));
    }

    public WorkoutSessionResponse addSet(Long sessionId, Long exerciseId) {
        WorkoutSession session = requireEditable(sessionId);
        WorkoutSessionExercise exercise = findExercise(session, exerciseId);
        WorkoutSetLog set = new WorkoutSetLog();
        set.setSessionExercise(exercise);
        set.setSetNumber(exercise.getSets().size() + 1);
        set.setManuallyAdded(true);
        if (!exercise.getSets().isEmpty()) {
            WorkoutSetLog previous = exercise.getSets().get(exercise.getSets().size() - 1);
            set.setReps(previous.getReps());
            set.setLoad(previous.getLoad());
            set.setDurationSeconds(previous.getDurationSeconds());
            set.setDistance(previous.getDistance());
            set.setRpe(previous.getRpe());
        }
        exercise.getSets().add(set);
        return toResponse(repository.save(session));
    }

    public WorkoutSessionResponse removeSet(Long sessionId, Long exerciseId, Long setId) {
        WorkoutSession session = requireEditable(sessionId);
        WorkoutSessionExercise exercise = findExercise(session, exerciseId);
        WorkoutSetLog set = exercise.getSets().stream().filter(item -> item.getId().equals(setId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Série não encontrada"));
        if (!set.isManuallyAdded()) throw new IllegalArgumentException("Apenas séries adicionadas manualmente podem ser removidas");
        exercise.getSets().remove(set);
        for (int index = 0; index < exercise.getSets().size(); index++) {
            exercise.getSets().get(index).setSetNumber(index + 1);
        }
        return toResponse(repository.save(session));
    }

    public WorkoutSessionResponse setExerciseStatus(Long sessionId, Long exerciseId, SessionExerciseStatus status) {
        WorkoutSession session = requireEditable(sessionId);
        WorkoutSessionExercise exercise = findExercise(session, exerciseId);
        exercise.setStatus(status);
        return toResponse(repository.save(session));
    }

    public WorkoutSessionResponse pause(Long id) {
        WorkoutSession session = findSession(id);
        if (session.getStatus() != SessionStatus.IN_PROGRESS) throw new IllegalArgumentException("A sessão não está em andamento");
        session.setStatus(SessionStatus.PAUSED);
        session.setPausedAt(OffsetDateTime.now());
        return toResponse(repository.save(session));
    }

    public WorkoutSessionResponse resume(Long id) {
        WorkoutSession session = findSession(id);
        if (session.getStatus() != SessionStatus.PAUSED) throw new IllegalArgumentException("A sessão não está pausada");
        session.setPausedDurationSeconds(session.getPausedDurationSeconds()
                + Duration.between(session.getPausedAt(), OffsetDateTime.now()).getSeconds());
        session.setPausedAt(null);
        session.setStatus(SessionStatus.IN_PROGRESS);
        return toResponse(repository.save(session));
    }

    public WorkoutSessionResponse complete(Long id, CompleteSessionRequest request) {
        lockSessionSlot();
        WorkoutSession session = requireEditable(id);
        if (session.getExercises().stream().flatMap(item -> item.getSets().stream()).noneMatch(WorkoutSetLog::isCompleted)) {
            throw new IllegalArgumentException("Registre ao menos uma série antes de concluir");
        }
        finalizeSession(session, SessionStatus.COMPLETED, request);
        WorkoutSession saved = repository.save(session);
        events.publishEvent(new TrainingDomainEvent.SessionCompleted(saved.getId(), OffsetDateTime.now()));
        return toResponse(saved);
    }

    public WorkoutSessionResponse abandon(Long id, CompleteSessionRequest request) {
        lockSessionSlot();
        WorkoutSession session = requireEditable(id);
        finalizeSession(session, SessionStatus.ABANDONED, request);
        WorkoutSession saved = repository.save(session);
        events.publishEvent(new TrainingDomainEvent.SessionAbandoned(saved.getId(), OffsetDateTime.now()));
        return toResponse(saved);
    }

    private void finalizeSession(WorkoutSession session, SessionStatus status, CompleteSessionRequest request) {
        OffsetDateTime now = OffsetDateTime.now();
        long paused = session.getPausedDurationSeconds();
        if (session.getStatus() == SessionStatus.PAUSED && session.getPausedAt() != null) {
            paused += Duration.between(session.getPausedAt(), now).getSeconds();
        }
        session.setTotalDurationSeconds((int) Math.max(0, Duration.between(session.getStartedAt(), now).getSeconds() - paused));
        session.setPausedAt(null);
        session.setCompletedAt(now);
        session.setStatus(status);
        session.setOverallRpe(request == null ? null : request.overallRpe());
        session.setNotes(request == null || request.notes() == null ? "" : request.notes().trim());
    }

    private WorkoutSession requireEditable(Long id) {
        WorkoutSession session = findSession(id);
        if (!ACTIVE.contains(session.getStatus())) throw new IllegalArgumentException("Esta sessão já foi encerrada");
        return session;
    }

    private WorkoutSession findSession(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada"));
    }

    private WorkoutSessionExercise findExercise(WorkoutSession session, Long id) {
        return session.getExercises().stream().filter(item -> item.getId().equals(id)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Exercício não encontrado na sessão"));
    }

    public WorkoutSessionResponse toResponse(WorkoutSession session) {
        int completedSets = session.getExercises().stream().flatMap(item -> item.getSets().stream())
                .mapToInt(item -> item.isCompleted() ? 1 : 0).sum();
        int plannedSets = session.getExercises().stream().mapToInt(WorkoutSessionExercise::getPlannedSets).sum();
        BigDecimal volume = session.getExercises().stream().flatMap(item -> item.getSets().stream())
                .filter(WorkoutSetLog::isCompleted)
                .map(item -> item.getLoad().multiply(BigDecimal.valueOf(item.getReps())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long currentPause = session.getStatus() == SessionStatus.PAUSED && session.getPausedAt() != null
                ? Duration.between(session.getPausedAt(), OffsetDateTime.now()).getSeconds() : 0;
        int duration = ACTIVE.contains(session.getStatus())
                ? (int) Math.max(0, Duration.between(session.getStartedAt(), OffsetDateTime.now()).getSeconds()
                        - session.getPausedDurationSeconds() - currentPause)
                : session.getTotalDurationSeconds();
        return new WorkoutSessionResponse(
                session.getId(), session.getTrainingPlan() == null ? null : session.getTrainingPlan().getId(),
                session.getPlanDay() == null ? null : session.getPlanDay().getId(), session.getWorkoutNameSnapshot(),
                session.getScheduledDate(), session.getStartedAt(), session.getCompletedAt(), session.getPausedAt(),
                session.getStatus(), duration, session.getOverallRpe(), session.getNotes(), completedSets, plannedSets,
                volume, session.getExercises().stream().map(exercise -> new WorkoutSessionResponse.SessionExerciseResponse(
                        exercise.getId(), exercise.getExerciseDefinitionId(), exercise.getExerciseNameSnapshot(),
                        exercise.getMuscleGroupSnapshot(),
                        exercise.getCategorySnapshot() == null ? ExerciseCategory.STRENGTH : exercise.getCategorySnapshot(),
                        exercise.isTimedSnapshot(), exercise.getPrimaryVideoUrl(), exercise.getPrimaryImageUrl(),
                        exercise.getPrimaryVideoSourceUrl(), exercise.getPrimaryVideoLicenseName(),
                        exercise.getPrimaryVideoLicenseUrl(), exercise.getPrimaryVideoAuthor(),
                        exercise.getAttribution(), exercise.getSortOrder(), exercise.getPlannedSets(),
                        exercise.getPlannedMinReps(), exercise.getPlannedMaxReps(), exercise.getRestSeconds(),
                        exercise.getStatus(), exercise.getNotes(), exercise.getSets().stream().map(set ->
                                new WorkoutSessionResponse.SetLogResponse(
                                        set.getId(), set.getSetNumber(), set.getReps(), set.getLoad(), set.getDurationSeconds(),
                                        set.getDistance(), set.getRpe(), set.isCompleted(), set.getCompletedAt(),
                                        set.isManuallyAdded(), set.getNotes(),
                                        set.getLoad().multiply(BigDecimal.valueOf(set.getReps())))).toList())).toList());
    }

    private void lockSessionSlot() {
        if (sessionLock.lock() == null) throw new IllegalStateException("Controle de sessão ativa não inicializado");
    }

    private String value(
            ExerciseMedia media,
            java.util.function.Function<ExerciseMedia, String> getter,
            String fallback
    ) {
        if (media == null) return fallback;
        String value = getter.apply(media);
        return value == null || value.isBlank() ? fallback : value;
    }

    private String attribution(WorkoutSessionExercise exercise) {
        return java.util.stream.Stream.of(
                        exercise.getPrimaryVideoAuthor(),
                        exercise.getPrimaryVideoLicenseName(),
                        exercise.getPrimaryVideoSourceUrl())
                .filter(value -> value != null && !value.isBlank()).reduce((a, b) -> a + " • " + b).orElse(null);
    }
}
