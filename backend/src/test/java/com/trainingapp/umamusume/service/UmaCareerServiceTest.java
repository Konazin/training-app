package com.trainingapp.umamusume.service;

import com.trainingapp.dto.CompleteSessionRequest;
import com.trainingapp.dto.SetLogRequest;
import com.trainingapp.model.ExerciseCategory;
import com.trainingapp.model.ExerciseDefinition;
import com.trainingapp.model.RestDayActivity;
import com.trainingapp.model.TrainingDayExercise;
import com.trainingapp.model.TrainingPlan;
import com.trainingapp.model.TrainingPlanDay;
import com.trainingapp.model.WorkoutSession;
import com.trainingapp.repository.ExerciseDefinitionRepository;
import com.trainingapp.repository.TrainingPlanRepository;
import com.trainingapp.repository.WorkoutSessionRepository;
import com.trainingapp.service.WorkoutSessionService;
import com.trainingapp.umamusume.dto.CreateUmaCareerRequest;
import com.trainingapp.umamusume.dto.StartUmaTrainingResponse;
import com.trainingapp.umamusume.dto.UmaCareerResponse;
import com.trainingapp.umamusume.model.CareerStatus;
import com.trainingapp.umamusume.model.TurnStatus;
import com.trainingapp.umamusume.model.UmaCareer;
import com.trainingapp.umamusume.model.UmaEffects;
import com.trainingapp.umamusume.repository.UmaCareerRepository;
import jakarta.transaction.Transactional;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@Transactional
class UmaCareerServiceTest {
    @Autowired UmaCareerService service;
    @Autowired WorkoutSessionService sessions;
    @Autowired EntityManager entityManager;
    @Autowired JdbcTemplate jdbc;
    @Autowired UmaCareerRepository careerRepository;
    @Autowired WorkoutSessionRepository sessionRepository;
    @Autowired TrainingPlanRepository planRepository;
    @Autowired ExerciseDefinitionRepository exerciseRepository;

    @Test
    void createsMondayCareerAndValidatesDurationAndSingleActiveCareer() {
        TrainingPlan plan = createPlan(false, ExerciseCategory.STRENGTH);
        UmaCareerResponse career = service.create(new CreateUmaCareerRequest("Primeira carreira", plan.getId(), 8));

        assertEquals(1, career.currentWeek());
        assertEquals(DayOfWeek.MONDAY, career.currentWeekday());
        assertEquals(10, career.strength());
        assertEquals(100, career.energy());
        assertEquals(0, career.progressPercentage());
        assertThrows(IllegalArgumentException.class,
                () -> service.create(new CreateUmaCareerRequest("Inválida", plan.getId(), 9)));
        assertThrows(IllegalArgumentException.class,
                () -> service.create(new CreateUmaCareerRequest("Outra", plan.getId(), 8)));
    }

    @Test
    void completesStrengthSessionFromRealSetsAndIgnoresDuplicateOrUnlinkedEvents() {
        TrainingPlan plan = createPlan(false, ExerciseCategory.STRENGTH);
        UmaCareerResponse career = service.create(new CreateUmaCareerRequest("Força", plan.getId(), 8));
        assertThrows(IllegalArgumentException.class,
                () -> service.acceptRestActivity(career.id(), 999L));

        StartUmaTrainingResponse started = service.startTraining(career.id());
        assertNotNull(started.career().pendingTurn());
        assertEquals(started.session().id(), started.career().pendingTurn().workoutSessionId());
        assertThrows(IllegalArgumentException.class, () -> service.startTraining(career.id()));
        completeAllSets(started, new BigDecimal("7"));

        UmaCareerResponse completed = service.findById(career.id());
        assertEquals(12, completed.strength());
        assertEquals(2, completed.discipline() - 10);
        assertEquals(90, completed.energy());
        assertEquals(13, completed.fatigue());
        assertEquals(DayOfWeek.TUESDAY, completed.currentWeekday());
        assertNull(completed.pendingTurn());

        WorkoutSession linked = sessionRepository.findById(started.session().id()).orElseThrow();
        service.sessionCompleted(linked);
        assertEquals(12, service.findById(career.id()).strength());
        assertEquals(DayOfWeek.TUESDAY, service.findById(career.id()).currentWeekday());

        WorkoutSession unrelated = new WorkoutSession();
        unrelated.setWorkoutNameSnapshot("Sem carreira");
        unrelated.setScheduledDate(java.time.LocalDate.now());
        unrelated.setStartedAt(OffsetDateTime.now());
        unrelated = sessionRepository.save(unrelated);
        service.sessionCompleted(unrelated);
        assertEquals(12, service.findById(career.id()).strength());
    }

    @Test
    void completesCardioAndClampsAttributes() {
        TrainingPlan plan = createPlan(false, ExerciseCategory.CARDIO);
        UmaCareerResponse response = service.create(new CreateUmaCareerRequest("Cardio", plan.getId(), 8));
        UmaCareer career = careerRepository.findById(response.id()).orElseThrow();
        career.setEndurance(999);
        career.setAgility(999);
        careerRepository.save(career);

        StartUmaTrainingResponse started = service.startTraining(career.getId());
        completeAllSets(started, null);

        UmaCareerResponse completed = service.findById(career.getId());
        assertEquals(999, completed.endurance());
        assertEquals(999, completed.agility());
        assertEquals(DayOfWeek.TUESDAY, completed.currentWeekday());
    }

    @Test
    void abandonsTrainingWithPenaltyAndAdvances() {
        TrainingPlan plan = createPlan(false, ExerciseCategory.STRENGTH);
        UmaCareerResponse career = service.create(new CreateUmaCareerRequest("Abandono", plan.getId(), 8));
        StartUmaTrainingResponse started = service.startTraining(career.id());

        sessions.abandon(started.session().id(), null);

        UmaCareerResponse abandoned = service.findById(career.id());
        assertEquals(8, abandoned.discipline());
        assertEquals(56, abandoned.mood());
        assertEquals(47, abandoned.confidence());
        assertEquals(95, abandoned.energy());
        assertEquals(2, abandoned.fatigue());
        assertEquals(DayOfWeek.TUESDAY, abandoned.currentWeekday());
        assertEquals(TurnStatus.ABANDONED, abandoned.lastResults().get(0).status());
    }

    @Test
    void acceptsAndCompletesRestOrTakesFullRestWithoutDoubleAction() {
        TrainingPlan plan = createPlan(true, ExerciseCategory.RECOVERY);
        UmaCareerResponse career = service.create(new CreateUmaCareerRequest("Descanso", plan.getId(), 8));
        Long activityId = career.currentDay().restActivities().get(0).id();
        assertThrows(IllegalArgumentException.class, () -> service.startTraining(career.id()));

        UmaCareerResponse accepted = service.acceptRestActivity(career.id(), activityId);
        assertEquals(DayOfWeek.MONDAY, accepted.currentWeekday());
        assertEquals(TurnStatus.IN_PROGRESS, accepted.pendingTurn().status());
        assertThrows(IllegalArgumentException.class, () -> service.fullRest(career.id()));

        UmaCareerResponse completed = service.completeRestActivity(career.id(), activityId);
        assertEquals(DayOfWeek.TUESDAY, completed.currentWeekday());
        assertEquals(0, completed.fatigue());
        assertEquals(100, completed.energy());

        UmaCareer entity = careerRepository.findById(career.id()).orElseThrow();
        entity.setCurrentWeekday(DayOfWeek.SUNDAY);
        entity.setFatigue(4);
        entity.setEnergy(99);
        careerRepository.save(entity);
        UmaCareerResponse nextWeek = service.fullRest(career.id());
        assertEquals(2, nextWeek.currentWeek());
        assertEquals(DayOfWeek.MONDAY, nextWeek.currentWeekday());
        assertEquals(0, nextWeek.fatigue());
        assertEquals(100, nextWeek.energy());
        assertEquals(1, nextWeek.lastResults().get(0).effects().getEnergyDelta());
        assertEquals(-4, nextWeek.lastResults().get(0).effects().getFatigueDelta());
        assertEquals("Descanso concluído: Disciplina -1 · Energia +1 · Fadiga -4",
                nextWeek.lastResults().get(0).resultText());
    }

    @Test
    void completesAcceptedActivityFromSnapshotAfterDayBecomesTraining() {
        TrainingPlan plan = createPlan(true, ExerciseCategory.RECOVERY);
        UmaCareerResponse response = service.create(new CreateUmaCareerRequest("Snapshot", plan.getId(), 8));
        UmaCareer career = careerRepository.findById(response.id()).orElseThrow();
        career.setEnergy(50);
        career.setFatigue(20);
        Long activityId = response.currentDay().restActivities().get(0).id();
        service.acceptRestActivity(career.getId(), activityId);

        TrainingPlanDay monday = day(plan, DayOfWeek.MONDAY);
        monday.setRestDay(false);
        monday.getRestActivities().get(0).setName("Caminhada editada");
        monday.getRestActivities().get(0).setCategory("Caminhada");
        planRepository.saveAndFlush(plan);

        UmaCareerResponse completed = service.completeRestActivity(career.getId(), activityId);
        assertEquals(55, completed.energy());
        assertEquals(12, completed.fatigue());
        assertEquals(0, completed.endurance() - 10);
        assertEquals("Recuperação ativa", completed.lastResults().get(0).actionTitle());
    }

    @Test
    void completesAcceptedActivityAfterItIsRemovedFromPlan() {
        TrainingPlan plan = createPlan(true, ExerciseCategory.RECOVERY);
        UmaCareerResponse response = service.create(new CreateUmaCareerRequest("Remoção", plan.getId(), 8));
        Long activityId = response.currentDay().restActivities().get(0).id();
        service.acceptRestActivity(response.id(), activityId);

        jdbc.update("delete from rest_day_activities where id = ?", activityId);
        entityManager.clear();

        assertEquals(DayOfWeek.TUESDAY,
                service.completeRestActivity(response.id(), activityId).currentWeekday());
    }

    @Test
    void cancelsRestAndAllowsAnotherChoiceOrCareerAbandonment() {
        TrainingPlan plan = createPlan(true, ExerciseCategory.RECOVERY);
        UmaCareerResponse response = service.create(new CreateUmaCareerRequest("Cancelamento", plan.getId(), 8));
        Long activityId = response.currentDay().restActivities().get(0).id();
        service.acceptRestActivity(response.id(), activityId);

        UmaCareerResponse canceled = service.cancelRestActivity(response.id());
        assertEquals(DayOfWeek.MONDAY, canceled.currentWeekday());
        assertNull(canceled.pendingTurn());
        assertEquals(0, service.findTurns(response.id()).size());

        service.acceptRestActivity(response.id(), activityId);
        UmaCareerResponse abandoned = service.abandon(response.id());
        assertEquals(CareerStatus.ABANDONED, abandoned.status());
        assertNotNull(abandoned.completedAt());
        assertEquals(0, service.findTurns(response.id()).size());
    }

    @Test
    void refusesDirectCareerAbandonmentWhileTrainingIsPending() {
        TrainingPlan plan = createPlan(false, ExerciseCategory.STRENGTH);
        UmaCareerResponse response = service.create(new CreateUmaCareerRequest("Treino pendente", plan.getId(), 8));
        service.startTraining(response.id());

        IllegalArgumentException error = assertThrows(
                IllegalArgumentException.class,
                () -> service.abandon(response.id())
        );
        assertEquals("Abandone a sessão de treino pela tela da sessão antes de encerrar a carreira",
                error.getMessage());
    }

    @Test
    void recordsEffectiveDeltasAtEveryUpperAndLowerLimit() {
        UmaCareer career = new UmaCareer();
        career.setStrength(998);
        career.setEndurance(998);
        career.setAgility(998);
        career.setTechnique(998);
        career.setDiscipline(998);
        career.setEnergy(99);
        career.setFatigue(1);
        career.setMood(99);
        career.setConfidence(99);

        UmaEffects upper = service.applyAndReturnEffectiveEffects(
                career,
                new UmaEffects(2, 2, 2, 2, 2, 2, -2, 2, 2)
        );
        assertEffects(upper, 1, 1, 1, 1, 1, 1, -1, 1, 1);

        career.setStrength(0);
        career.setEndurance(0);
        career.setAgility(0);
        career.setTechnique(0);
        career.setDiscipline(0);
        career.setEnergy(0);
        career.setFatigue(0);
        career.setMood(0);
        career.setConfidence(0);
        UmaEffects lower = service.applyAndReturnEffectiveEffects(
                career,
                new UmaEffects(-2, -2, -2, -2, -2, -2, -2, -2, -2)
        );
        assertEffects(lower, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    @Test
    void completesCareerOnLastSundayAndCanAbandonWithoutPendingAction() {
        TrainingPlan plan = createPlan(true, ExerciseCategory.RECOVERY);
        UmaCareerResponse response = service.create(new CreateUmaCareerRequest("Final", plan.getId(), 8));
        UmaCareer career = careerRepository.findById(response.id()).orElseThrow();
        career.setCurrentWeek(8);
        career.setCurrentWeekday(DayOfWeek.SUNDAY);
        careerRepository.save(career);

        UmaCareerResponse completed = service.fullRest(career.getId());
        assertEquals(CareerStatus.COMPLETED, completed.status());
        assertEquals(100, completed.progressPercentage());
        assertNotNull(completed.completedAt());
        assertThrows(IllegalArgumentException.class, () -> service.fullRest(career.getId()));

        career.setStatus(CareerStatus.ACTIVE);
        career.setCompletedAt(null);
        career.setCurrentWeek(7);
        career.setCurrentWeekday(DayOfWeek.MONDAY);
        careerRepository.save(career);
        UmaCareerResponse abandoned = service.abandon(career.getId());
        assertEquals(CareerStatus.ABANDONED, abandoned.status());
    }

    private void assertEffects(
            UmaEffects effects,
            int strength,
            int endurance,
            int agility,
            int technique,
            int discipline,
            int energy,
            int fatigue,
            int mood,
            int confidence
    ) {
        assertEquals(strength, effects.getStrengthDelta());
        assertEquals(endurance, effects.getEnduranceDelta());
        assertEquals(agility, effects.getAgilityDelta());
        assertEquals(technique, effects.getTechniqueDelta());
        assertEquals(discipline, effects.getDisciplineDelta());
        assertEquals(energy, effects.getEnergyDelta());
        assertEquals(fatigue, effects.getFatigueDelta());
        assertEquals(mood, effects.getMoodDelta());
        assertEquals(confidence, effects.getConfidenceDelta());
    }

    private void completeAllSets(StartUmaTrainingResponse started, BigDecimal overallRpe) {
        var exercise = started.session().exercises().get(0);
        for (var set : exercise.sets()) {
            sessions.updateSet(started.session().id(), exercise.id(), set.id(),
                    new SetLogRequest(10, BigDecimal.ZERO, 0, BigDecimal.ZERO, overallRpe, true, ""));
        }
        sessions.complete(started.session().id(), new CompleteSessionRequest(overallRpe, ""));
    }

    private TrainingPlan createPlan(boolean restDays, ExerciseCategory category) {
        OffsetDateTime now = OffsetDateTime.now();
        TrainingPlan plan = new TrainingPlan();
        plan.setName("Ficha " + category + " " + System.nanoTime());
        plan.setDescription("");
        plan.setCategory("Teste");
        plan.setDifficulty("Inicial");
        plan.setCreatedAt(now);
        plan.setUpdatedAt(now);
        for (DayOfWeek weekday : DayOfWeek.values()) {
            TrainingPlanDay day = new TrainingPlanDay();
            day.setTrainingPlan(plan);
            day.setWeekday(weekday);
            day.setSortOrder(weekday.getValue());
            day.setTitle(weekday.name());
            day.setRestDay(restDays);
            if (restDays) {
                RestDayActivity activity = new RestDayActivity();
                activity.setPlanDay(day);
                activity.setName("Recuperação ativa");
                activity.setCategory("Recuperação Ativa");
                activity.setEstimatedDurationMinutes(20);
                activity.setSortOrder(1);
                day.getRestActivities().add(activity);
            }
            plan.getDays().add(day);
        }
        plan = planRepository.saveAndFlush(plan);
        if (!restDays) {
            ExerciseDefinition definition = new ExerciseDefinition();
            definition.setNormalizedName(plan.getName().toLowerCase());
            definition.setName(plan.getName());
            definition.setPrimaryMuscleGroup("Corpo inteiro");
            definition.setEquipment("Nenhum");
            definition.setCategory(category);
            definition.setDifficulty("Inicial");
            definition.setCreatedAt(now);
            definition.setUpdatedAt(now);
            definition = exerciseRepository.saveAndFlush(definition);

            TrainingPlanDay monday = plan.getDays().stream()
                    .filter(day -> day.getWeekday() == DayOfWeek.MONDAY)
                    .findFirst().orElseThrow();
            TrainingDayExercise exercise = new TrainingDayExercise();
            exercise.setPlanDay(monday);
            exercise.setExercise(definition);
            exercise.setSortOrder(1);
            exercise.setSets(2);
            exercise.setMinReps(10);
            exercise.setMaxReps(10);
            exercise.setRestSeconds(60);
            monday.getExercises().add(exercise);
            plan = planRepository.saveAndFlush(plan);
        }
        return plan;
    }

    private TrainingPlanDay day(TrainingPlan plan, DayOfWeek weekday) {
        return plan.getDays().stream()
                .filter(item -> item.getWeekday() == weekday)
                .findFirst()
                .orElseThrow();
    }
}
