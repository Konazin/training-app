package com.trainingapp.umamusume.rules;

import com.trainingapp.model.ExerciseCategory;
import com.trainingapp.model.SessionExerciseStatus;
import com.trainingapp.model.WorkoutSession;
import com.trainingapp.model.WorkoutSessionExercise;
import com.trainingapp.model.WorkoutSetLog;
import com.trainingapp.umamusume.model.UmaEffects;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class UmaProgressionRulesTest {
    private final UmaProgressionRules rules = new UmaProgressionRules();

    @Test
    void calculatesCompletedTrainingFromCategoriesSetsAndRpe() {
        WorkoutSession session = session(ExerciseCategory.STRENGTH, 2, new BigDecimal("8"));
        UmaEffects effects = rules.training(session);

        assertEquals(2, effects.getStrengthDelta());
        assertEquals(2, effects.getDisciplineDelta());
        assertEquals(2, effects.getMoodDelta());
        assertEquals(2, effects.getConfidenceDelta());
        assertEquals(-10, effects.getEnergyDelta());
        assertEquals(14, effects.getFatigueDelta());
    }

    @Test
    void mapsEveryTrainingAndNormalizedRestCategory() {
        UmaEffects cardio = rules.training(session(ExerciseCategory.CARDIO, 1, null));
        assertEquals(2, cardio.getEnduranceDelta());
        assertEquals(1, cardio.getAgilityDelta());

        UmaEffects recovery = rules.training(session(ExerciseCategory.RECOVERY, 1, null));
        assertEquals(-5, recovery.getEnergyDelta());
        assertEquals(5, recovery.getFatigueDelta());

        assertEquals(2, rules.restActivity("CAMINHADA").getEnduranceDelta());
        assertEquals(2, rules.restActivity("Alongamento").getTechniqueDelta());
        assertEquals(5, rules.restActivity("Recuperação Ativa").getEnergyDelta());
        assertEquals(1, rules.restActivity("Categoria livre").getDisciplineDelta());
    }

    private WorkoutSession session(ExerciseCategory category, int completedSets, BigDecimal rpe) {
        WorkoutSession session = new WorkoutSession();
        session.setOverallRpe(rpe);
        WorkoutSessionExercise exercise = new WorkoutSessionExercise();
        exercise.setSession(session);
        exercise.setCategorySnapshot(category);
        exercise.setStatus(SessionExerciseStatus.COMPLETED);
        session.getExercises().add(exercise);
        for (int index = 0; index < completedSets; index++) {
            WorkoutSetLog set = new WorkoutSetLog();
            set.setSessionExercise(exercise);
            set.setCompleted(true);
            exercise.getSets().add(set);
        }
        return session;
    }
}
