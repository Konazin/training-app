package com.trainingapp.umamusume.rules;

import com.trainingapp.model.ExerciseCategory;
import com.trainingapp.model.SessionExerciseStatus;
import com.trainingapp.model.WorkoutSession;
import com.trainingapp.model.WorkoutSetLog;
import com.trainingapp.umamusume.model.UmaEffects;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Locale;

@Component
public class UmaProgressionRules {
    public static final UmaEffects ABANDONMENT = new UmaEffects(0, 0, 0, 0, -2, -5, 2, -4, -3);
    public static final UmaEffects FULL_REST = new UmaEffects(0, 0, 0, 0, -1, 18, -12, 0, 0);

    public UmaEffects training(WorkoutSession session) {
        int strength = 0;
        int endurance = 0;
        int agility = 0;
        int technique = 0;
        int confidence = 2;

        for (var exercise : session.getExercises()) {
            if (exercise.getStatus() != SessionExerciseStatus.COMPLETED) continue;
            ExerciseCategory category = exercise.getCategorySnapshot();
            if (category == null) category = ExerciseCategory.STRENGTH;
            switch (category) {
                case STRENGTH, HYPERTROPHY -> strength += 2;
                case ENDURANCE, CARDIO -> {
                    endurance += 2;
                    agility += 1;
                }
                case MOBILITY, STRETCHING -> technique += 2;
                case TECHNIQUE -> {
                    technique += 2;
                    confidence += 1;
                }
                case RECOVERY -> {}
            }
        }

        int completedSets = session.getExercises().stream()
                .flatMap(exercise -> exercise.getSets().stream())
                .mapToInt(set -> set.isCompleted() ? 1 : 0)
                .sum();
        int rpe = session.getOverallRpe() == null ? 5 : Math.round(session.getOverallRpe().floatValue());
        int energy = -Math.min(30, 8 + completedSets);
        int fatigue = Math.min(25, 5 + rpe + completedSets / 2);

        for (var exercise : session.getExercises()) {
            if (exercise.getStatus() != SessionExerciseStatus.COMPLETED) continue;
            if (exercise.getCategorySnapshot() == ExerciseCategory.MOBILITY
                    || exercise.getCategorySnapshot() == ExerciseCategory.STRETCHING) fatigue -= 2;
            if (exercise.getCategorySnapshot() == ExerciseCategory.RECOVERY) {
                energy += 4;
                fatigue -= 5;
            }
        }
        return new UmaEffects(strength, endurance, agility, technique, 2, energy, fatigue, 2, confidence);
    }

    public UmaEffects restActivity(String category) {
        String normalized = normalize(category);
        if (normalized.contains("caminhada")) {
            return new UmaEffects(0, 2, 0, 0, 2, -5, -1, 3, 0);
        }
        if (normalized.contains("mobilidade") || normalized.contains("alongamento")) {
            return new UmaEffects(0, 0, 0, 2, 1, -2, -5, 0, 0);
        }
        if (normalized.contains("recuperacao ativa")) {
            return new UmaEffects(0, 0, 0, 0, 0, 5, -8, 1, 0);
        }
        return new UmaEffects(0, 0, 0, 0, 1, -3, 0, 1, 0);
    }

    private String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
