package com.trainingapp.umamusume.service;

import com.trainingapp.dto.StartSessionRequest;
import com.trainingapp.dto.WorkoutSessionResponse;
import com.trainingapp.exception.ResourceNotFoundException;
import com.trainingapp.model.RestDayActivity;
import com.trainingapp.model.TrainingPlan;
import com.trainingapp.model.TrainingPlanDay;
import com.trainingapp.model.WorkoutSession;
import com.trainingapp.service.TrainingPlanService;
import com.trainingapp.service.WorkoutSessionService;
import com.trainingapp.umamusume.dto.CreateUmaCareerRequest;
import com.trainingapp.umamusume.dto.StartUmaTrainingResponse;
import com.trainingapp.umamusume.dto.UmaCareerResponse;
import com.trainingapp.umamusume.dto.UmaTurnResponse;
import com.trainingapp.umamusume.model.CareerStatus;
import com.trainingapp.umamusume.model.TurnActionType;
import com.trainingapp.umamusume.model.TurnStatus;
import com.trainingapp.umamusume.model.UmaCareer;
import com.trainingapp.umamusume.model.UmaCareerTurn;
import com.trainingapp.umamusume.model.UmaEffects;
import com.trainingapp.umamusume.repository.UmaCareerRepository;
import com.trainingapp.umamusume.repository.UmaCareerTurnRepository;
import com.trainingapp.umamusume.rules.UmaProgressionRules;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class UmaCareerService {
    private static final Set<Integer> VALID_DURATIONS = Set.of(8, 12, 16);
    private final UmaCareerRepository careers;
    private final UmaCareerTurnRepository turns;
    private final TrainingPlanService trainingPlans;
    private final WorkoutSessionService sessions;
    private final UmaProgressionRules rules;

    public UmaCareerService(
            UmaCareerRepository careers,
            UmaCareerTurnRepository turns,
            TrainingPlanService trainingPlans,
            WorkoutSessionService sessions,
            UmaProgressionRules rules
    ) {
        this.careers = careers;
        this.turns = turns;
        this.trainingPlans = trainingPlans;
        this.sessions = sessions;
        this.rules = rules;
    }

    public List<UmaCareerResponse> findAll() {
        return careers.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    public UmaCareerResponse findActive() {
        return careers.findFirstByStatus(CareerStatus.ACTIVE).map(this::toResponse).orElse(null);
    }

    public UmaCareerResponse findById(Long id) {
        return toResponse(findCareer(id));
    }

    public List<UmaTurnResponse> findTurns(Long careerId) {
        findCareer(careerId);
        return turns.findByCareerIdOrderByCreatedAtDesc(careerId).stream().map(this::toTurnResponse).toList();
    }

    public UmaCareerResponse create(CreateUmaCareerRequest request) {
        if (!VALID_DURATIONS.contains(request.totalWeeks())) {
            throw new IllegalArgumentException("A carreira deve durar 8, 12 ou 16 semanas");
        }
        if (careers.existsByStatus(CareerStatus.ACTIVE)) {
            throw new IllegalArgumentException("Já existe uma carreira ativa");
        }
        TrainingPlan plan = trainingPlans.findPlan(request.trainingPlanId());
        currentDay(plan, DayOfWeek.MONDAY);
        OffsetDateTime now = OffsetDateTime.now();
        UmaCareer career = new UmaCareer();
        career.setName(request.name().trim());
        career.setTrainingPlan(plan);
        career.setTotalWeeks(request.totalWeeks());
        career.setCreatedAt(now);
        career.setUpdatedAt(now);
        return toResponse(careers.save(career));
    }

    public StartUmaTrainingResponse startTraining(Long careerId) {
        UmaCareer career = requireActive(careerId);
        TrainingPlanDay day = currentDay(career);
        if (day.isRestDay()) throw new IllegalArgumentException("Hoje é dia de descanso");
        ensureNoTurn(career);

        WorkoutSessionResponse session = sessions.start(new StartSessionRequest(
                career.getTrainingPlan().getId(),
                day.getId(),
                LocalDate.now()
        ));
        UmaCareerTurn turn = newTurn(career, day, TurnActionType.TRAINING, TurnStatus.IN_PROGRESS);
        turn.setWorkoutSessionId(session.id());
        turns.save(turn);
        touch(career);
        return new StartUmaTrainingResponse(toResponse(career), session);
    }

    public UmaCareerResponse acceptRestActivity(Long careerId, Long activityId) {
        UmaCareer career = requireActive(careerId);
        TrainingPlanDay day = requireRestDay(career);
        ensureNoTurn(career);
        RestDayActivity activity = findActivity(day, activityId);
        UmaCareerTurn turn = newTurn(career, day, TurnActionType.REST_ACTIVITY, TurnStatus.IN_PROGRESS);
        turn.setRestActivityId(activity.getId());
        turn.setActionTitleSnapshot(activity.getName());
        turn.setActivityCategorySnapshot(activity.getCategory());
        turn.setActivityDurationMinutesSnapshot(activity.getEstimatedDurationMinutes());
        turns.save(turn);
        touch(career);
        return toResponse(career);
    }

    public UmaCareerResponse completeRestActivity(Long careerId, Long activityId) {
        UmaCareer career = requireActive(careerId);
        UmaCareerTurn turn = currentTurn(career);
        if (turn.getActionType() != TurnActionType.REST_ACTIVITY
                || turn.getStatus() != TurnStatus.IN_PROGRESS
                || !activityId.equals(turn.getRestActivityId())) {
            throw new IllegalArgumentException("Esta atividade não está pendente");
        }
        completeTurn(career, turn, rules.restActivity(turn.getActivityCategorySnapshot()), TurnStatus.COMPLETED);
        return toResponse(career);
    }

    public UmaCareerResponse cancelRestActivity(Long careerId) {
        UmaCareer career = requireActive(careerId);
        UmaCareerTurn turn = currentTurn(career);
        if (turn.getActionType() != TurnActionType.REST_ACTIVITY
                || turn.getStatus() != TurnStatus.IN_PROGRESS) {
            throw new IllegalArgumentException("A ação atual não é uma atividade de descanso pendente");
        }
        turns.delete(turn);
        touch(career);
        return toResponse(career);
    }

    public UmaCareerResponse fullRest(Long careerId) {
        UmaCareer career = requireActive(careerId);
        TrainingPlanDay day = requireRestDay(career);
        ensureNoTurn(career);
        UmaCareerTurn turn = newTurn(career, day, TurnActionType.FULL_REST, TurnStatus.IN_PROGRESS);
        turn.setActionTitleSnapshot("Descanso completo");
        turns.save(turn);
        completeTurn(career, turn, UmaProgressionRules.FULL_REST, TurnStatus.COMPLETED);
        return toResponse(career);
    }

    public UmaCareerResponse abandon(Long careerId) {
        UmaCareer career = requireActive(careerId);
        UmaCareerTurn pending = pendingTurn(career);
        if (pending != null && pending.getActionType() == TurnActionType.TRAINING) {
            throw new IllegalArgumentException("Abandone a sessão de treino pela tela da sessão antes de encerrar a carreira");
        }
        if (pending != null) turns.delete(pending);
        career.setStatus(CareerStatus.ABANDONED);
        career.setCompletedAt(OffsetDateTime.now());
        touch(career);
        return toResponse(career);
    }

    public void sessionCompleted(WorkoutSession session) {
        turns.findByWorkoutSessionId(session.getId()).ifPresent(turn -> {
            if (turn.getStatus() != TurnStatus.IN_PROGRESS) return;
            completeTurn(turn.getCareer(), turn, rules.training(session), TurnStatus.COMPLETED);
        });
    }

    public void sessionAbandoned(WorkoutSession session) {
        turns.findByWorkoutSessionId(session.getId()).ifPresent(turn -> {
            if (turn.getStatus() != TurnStatus.IN_PROGRESS) return;
            completeTurn(turn.getCareer(), turn, UmaProgressionRules.ABANDONMENT, TurnStatus.ABANDONED);
        });
    }

    private void completeTurn(UmaCareer career, UmaCareerTurn turn, UmaEffects requested, TurnStatus status) {
        UmaEffects applied = applyAndReturnEffectiveEffects(career, requested);
        turn.setEffects(applied);
        turn.setStatus(status);
        turn.setResultText(resultText(turn, applied));
        turn.setCompletedAt(OffsetDateTime.now());
        advance(career);
        turns.save(turn);
        touch(career);
    }

    UmaEffects applyAndReturnEffectiveEffects(UmaCareer career, UmaEffects requested) {
        int strength = career.getStrength();
        int endurance = career.getEndurance();
        int agility = career.getAgility();
        int technique = career.getTechnique();
        int discipline = career.getDiscipline();
        int energy = career.getEnergy();
        int fatigue = career.getFatigue();
        int mood = career.getMood();
        int confidence = career.getConfidence();

        career.setStrength(clamp(strength + requested.getStrengthDelta(), 999));
        career.setEndurance(clamp(endurance + requested.getEnduranceDelta(), 999));
        career.setAgility(clamp(agility + requested.getAgilityDelta(), 999));
        career.setTechnique(clamp(technique + requested.getTechniqueDelta(), 999));
        career.setDiscipline(clamp(discipline + requested.getDisciplineDelta(), 999));
        career.setEnergy(clamp(energy + requested.getEnergyDelta(), 100));
        career.setFatigue(clamp(fatigue + requested.getFatigueDelta(), 100));
        career.setMood(clamp(mood + requested.getMoodDelta(), 100));
        career.setConfidence(clamp(confidence + requested.getConfidenceDelta(), 100));

        return new UmaEffects(
                career.getStrength() - strength,
                career.getEndurance() - endurance,
                career.getAgility() - agility,
                career.getTechnique() - technique,
                career.getDiscipline() - discipline,
                career.getEnergy() - energy,
                career.getFatigue() - fatigue,
                career.getMood() - mood,
                career.getConfidence() - confidence
        );
    }

    private int clamp(int value, int maximum) {
        return Math.max(0, Math.min(maximum, value));
    }

    private void advance(UmaCareer career) {
        if (career.getCurrentWeekday() == DayOfWeek.SUNDAY) {
            if (career.getCurrentWeek() == career.getTotalWeeks()) {
                career.setStatus(CareerStatus.COMPLETED);
                career.setCompletedAt(OffsetDateTime.now());
                return;
            }
            career.setCurrentWeek(career.getCurrentWeek() + 1);
            career.setCurrentWeekday(DayOfWeek.MONDAY);
            return;
        }
        career.setCurrentWeekday(career.getCurrentWeekday().plus(1));
    }

    private UmaCareerTurn newTurn(
            UmaCareer career,
            TrainingPlanDay day,
            TurnActionType actionType,
            TurnStatus status
    ) {
        UmaCareerTurn turn = new UmaCareerTurn();
        turn.setCareer(career);
        turn.setWeekNumber(career.getCurrentWeek());
        turn.setWeekday(career.getCurrentWeekday());
        turn.setActionType(actionType);
        turn.setStatus(status);
        turn.setTrainingPlanDay(day);
        turn.setActionTitleSnapshot(day.getTitle().isBlank() ? career.getTrainingPlan().getName() : day.getTitle());
        turn.setCreatedAt(OffsetDateTime.now());
        return turn;
    }

    private void ensureNoTurn(UmaCareer career) {
        if (turns.findByCareerIdAndWeekNumberAndWeekday(
                career.getId(), career.getCurrentWeek(), career.getCurrentWeekday()).isPresent()) {
            throw new IllegalArgumentException("Este turno já possui uma ação");
        }
    }

    private UmaCareerTurn currentTurn(UmaCareer career) {
        return turns.findByCareerIdAndWeekNumberAndWeekday(
                        career.getId(), career.getCurrentWeek(), career.getCurrentWeekday())
                .orElseThrow(() -> new IllegalArgumentException("Nenhuma ação pendente neste turno"));
    }

    private UmaCareerTurn pendingTurn(UmaCareer career) {
        return turns.findByCareerIdAndWeekNumberAndWeekday(
                        career.getId(), career.getCurrentWeek(), career.getCurrentWeekday())
                .filter(turn -> turn.getStatus() == TurnStatus.IN_PROGRESS)
                .orElse(null);
    }

    private TrainingPlanDay requireRestDay(UmaCareer career) {
        TrainingPlanDay day = currentDay(career);
        if (!day.isRestDay()) throw new IllegalArgumentException("Hoje é dia de treino");
        return day;
    }

    private TrainingPlanDay currentDay(UmaCareer career) {
        return currentDay(career.getTrainingPlan(), career.getCurrentWeekday());
    }

    private TrainingPlanDay currentDay(TrainingPlan plan, DayOfWeek weekday) {
        return plan.getDays().stream()
                .filter(day -> day.getWeekday() == weekday)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("A ficha não possui o dia " + weekday));
    }

    private RestDayActivity findActivity(TrainingPlanDay day, Long activityId) {
        return day.getRestActivities().stream()
                .filter(RestDayActivity::isOptional)
                .filter(activity -> activity.getId().equals(activityId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Atividade de descanso não encontrada neste dia"));
    }

    private UmaCareer requireActive(Long id) {
        UmaCareer career = findCareer(id);
        if (career.getStatus() != CareerStatus.ACTIVE) {
            throw new IllegalArgumentException("Esta carreira não está ativa");
        }
        return career;
    }

    private UmaCareer findCareer(Long id) {
        return careers.findById(id).orElseThrow(() -> new ResourceNotFoundException("Carreira não encontrada"));
    }

    private void touch(UmaCareer career) {
        career.setUpdatedAt(OffsetDateTime.now());
        careers.save(career);
    }

    private UmaCareerResponse toResponse(UmaCareer career) {
        List<UmaCareerTurn> history = turns.findByCareerIdOrderByCreatedAtDesc(career.getId());
        UmaCareerTurn pending = history.stream()
                .filter(turn -> turn.getStatus() == TurnStatus.IN_PROGRESS)
                .findFirst()
                .orElse(null);
        TrainingPlanDay day = currentDay(career);
        return new UmaCareerResponse(
                career.getId(), career.getName(), career.getStatus(), career.getTotalWeeks(),
                career.getCurrentWeek(), career.getCurrentWeekday(), career.getStrength(), career.getEndurance(),
                career.getAgility(), career.getTechnique(), career.getDiscipline(), career.getEnergy(),
                career.getFatigue(), career.getMood(), career.getConfidence(), career.getCreatedAt(),
                career.getUpdatedAt(), career.getCompletedAt(), career.getVersion(), progress(career),
                new UmaCareerResponse.TrainingPlanSummary(
                        career.getTrainingPlan().getId(), career.getTrainingPlan().getName()),
                new UmaCareerResponse.CurrentDaySummary(
                        day.getId(), day.getWeekday(), day.getTitle(), day.isRestDay(), day.getExercises().size(),
                        day.getEstimatedDurationMinutes(), day.getRestActivities().stream()
                        .filter(RestDayActivity::isOptional)
                        .map(activity -> new UmaCareerResponse.RestActivitySummary(
                                activity.getId(), activity.getName(), activity.getCategory(),
                                activity.getEstimatedDurationMinutes()))
                        .toList()),
                pending == null ? null : toTurnResponse(pending),
                history.stream()
                        .filter(turn -> turn.getStatus() != TurnStatus.IN_PROGRESS)
                        .limit(5)
                        .map(this::toTurnResponse)
                        .toList()
        );
    }

    private double progress(UmaCareer career) {
        if (career.getStatus() == CareerStatus.COMPLETED) return 100;
        int completedDays = (career.getCurrentWeek() - 1) * 7 + career.getCurrentWeekday().getValue() - 1;
        return Math.round(completedDays * 1000.0 / (career.getTotalWeeks() * 7)) / 10.0;
    }

    private UmaTurnResponse toTurnResponse(UmaCareerTurn turn) {
        return new UmaTurnResponse(
                turn.getId(), turn.getWeekNumber(), turn.getWeekday(), turn.getActionType(), turn.getStatus(),
                turn.getTrainingPlanDay() == null ? null : turn.getTrainingPlanDay().getId(),
                turn.getWorkoutSessionId(), turn.getRestActivityId(), turn.getActionTitleSnapshot(),
                turn.getActivityCategorySnapshot(), turn.getActivityDurationMinutesSnapshot(),
                turn.getResultText(), turn.getEffects(), turn.getCreatedAt(), turn.getCompletedAt()
        );
    }

    private String resultText(UmaCareerTurn turn, UmaEffects effects) {
        String prefix = turn.getStatus() == TurnStatus.ABANDONED
                ? "Sessão abandonada"
                : turn.getActionType() == TurnActionType.TRAINING ? "Treino concluído" : "Descanso concluído";
        List<String> changes = new ArrayList<>();
        addEffect(changes, "Força", effects.getStrengthDelta());
        addEffect(changes, "Resistência", effects.getEnduranceDelta());
        addEffect(changes, "Agilidade", effects.getAgilityDelta());
        addEffect(changes, "Técnica", effects.getTechniqueDelta());
        addEffect(changes, "Disciplina", effects.getDisciplineDelta());
        addEffect(changes, "Energia", effects.getEnergyDelta());
        addEffect(changes, "Fadiga", effects.getFatigueDelta());
        addEffect(changes, "Humor", effects.getMoodDelta());
        addEffect(changes, "Confiança", effects.getConfidenceDelta());
        return changes.isEmpty() ? prefix : prefix + ": " + String.join(" · ", changes);
    }

    private void addEffect(List<String> changes, String label, int value) {
        if (value != 0) changes.add(label + " " + (value > 0 ? "+" : "") + value);
    }
}
