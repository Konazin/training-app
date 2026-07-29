package com.trainingapp.config;

import com.trainingapp.dto.ExerciseRequest;
import com.trainingapp.dto.TrainingPlanRequest;
import com.trainingapp.dto.ExerciseDefinitionRequest;
import com.trainingapp.dto.DayExerciseRequest;
import com.trainingapp.dto.PlanDayRequest;
import com.trainingapp.dto.RestActivityRequest;
import com.trainingapp.model.ExerciseCategory;
import com.trainingapp.model.SetType;
import com.trainingapp.dto.WorkoutRequest;
import com.trainingapp.model.WorkoutStatus;
import com.trainingapp.repository.TrainingPlanRepository;
import com.trainingapp.repository.WorkoutRepository;
import com.trainingapp.repository.ExerciseDefinitionRepository;
import com.trainingapp.model.ExerciseSource;
import com.trainingapp.service.TrainingPlanService;
import com.trainingapp.service.ExerciseLibraryService;
import com.trainingapp.service.WorkoutService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Configuration
@Profile("dev")
public class SeedDataConfig {

    @Bean
    CommandLineRunner seedData(
            WorkoutRepository workoutRepository,
            WorkoutService workoutService,
            TrainingPlanRepository trainingPlanRepository,
            TrainingPlanService trainingPlanService,
            ExerciseLibraryService exerciseLibrary,
            ExerciseDefinitionRepository exerciseDefinitionRepository
    ) {
        return args -> {
            exerciseDefinitionRepository.findAll().stream()
                    .filter(item -> item.isCustom() && item.getSource() == ExerciseSource.SYSTEM)
                    .forEach(item -> {
                        item.setSource(ExerciseSource.CUSTOM);
                        exerciseDefinitionRepository.save(item);
                    });
            if (workoutRepository.count() == 0) {
                var workout = workoutService.create(new WorkoutRequest(
                        "Força — membros superiores",
                        "Treino base para peito, costas e braços.",
                        LocalDate.now(),
                        WorkoutStatus.PLANNED,
                        50,
                        320,
                        Map.of("intensidade", "moderada", "qualidadeSono", 8)
                ));
                workoutService.addExercise(workout.id(), new ExerciseRequest(
                        "Supino reto",
                        "Peitoral",
                        4,
                        10,
                        new BigDecimal("40.00"),
                        90,
                        Map.of("rir", 2, "cadencia", "3-1-1")
                ));
            }

            var pushUp = exerciseLibrary.createSystem(exercise(
                    "Flexão de braços", "Peitoral", "Peso corporal", ExerciseCategory.STRENGTH));
            var pullUp = exerciseLibrary.createSystem(exercise(
                    "Barra fixa", "Costas", "Barra fixa", ExerciseCategory.STRENGTH));
            var squat = exerciseLibrary.createSystem(exercise(
                    "Agachamento livre", "Pernas", "Barra", ExerciseCategory.STRENGTH));
            var row = exerciseLibrary.createSystem(exercise(
                    "Remada curvada", "Costas", "Barra", ExerciseCategory.HYPERTROPHY));
            var plank = exerciseLibrary.createSystem(exercise(
                    "Prancha", "Core", "Peso corporal", ExerciseCategory.ENDURANCE));
            var walk = exerciseLibrary.createSystem(exercise(
                    "Caminhada", "Cardiorrespiratório", "Nenhum", ExerciseCategory.CARDIO));

            if (!trainingPlanRepository.existsByNameIgnoreCase("Treino de calistenia")) {
                var plan = trainingPlanService.create(new TrainingPlanRequest(
                        "Treino de calistenia",
                        "Força e controle corporal sem equipamentos.",
                        "Calistenia",
                        "Intermediário"
                ));
                trainingPlanService.addExercise(plan.id(), new ExerciseRequest(
                        "Barra fixa",
                        "Costas",
                        4,
                        8,
                        BigDecimal.ZERO,
                        90,
                        Map.of("tipo", "peso corporal")
                ));
                trainingPlanService.addExercise(plan.id(), new ExerciseRequest(
                        "Flexão de braços",
                        "Peitoral",
                        4,
                        12,
                        BigDecimal.ZERO,
                        60,
                        Map.of("tipo", "peso corporal")
                ));
            }

            if (!trainingPlanRepository.existsByNameIgnoreCase("Base de força e condicionamento")) {
                var plan = trainingPlanService.create(new TrainingPlanRequest(
                        "Base de força e condicionamento",
                        "Semana equilibrada entre força, cardio e recuperação.",
                        "Força e condicionamento",
                        "Intermediário"
                ));
                var monday = plan.days().stream().filter(day -> day.weekday() == java.time.DayOfWeek.MONDAY).findFirst().orElseThrow();
                var tuesday = plan.days().stream().filter(day -> day.weekday() == java.time.DayOfWeek.TUESDAY).findFirst().orElseThrow();
                var wednesday = plan.days().stream().filter(day -> day.weekday() == java.time.DayOfWeek.WEDNESDAY).findFirst().orElseThrow();
                var thursday = plan.days().stream().filter(day -> day.weekday() == java.time.DayOfWeek.THURSDAY).findFirst().orElseThrow();
                var friday = plan.days().stream().filter(day -> day.weekday() == java.time.DayOfWeek.FRIDAY).findFirst().orElseThrow();
                var saturday = plan.days().stream().filter(day -> day.weekday() == java.time.DayOfWeek.SATURDAY).findFirst().orElseThrow();
                var sunday = plan.days().stream().filter(day -> day.weekday() == java.time.DayOfWeek.SUNDAY).findFirst().orElseThrow();

                trainingPlanService.updateDay(plan.id(), monday.id(), new PlanDayRequest(
                        "Membros superiores", "Força de empurrar e puxar.", false, 50, ""));
                addDayExercise(trainingPlanService, plan.id(), monday.id(), pushUp.id(), 4, 8, 12, 75);
                addDayExercise(trainingPlanService, plan.id(), monday.id(), pullUp.id(), 4, 6, 10, 90);
                trainingPlanService.updateDay(plan.id(), tuesday.id(), new PlanDayRequest(
                        "Cardio leve", "Caminhada em ritmo confortável.", false, 35, ""));
                addDayExercise(trainingPlanService, plan.id(), tuesday.id(), walk.id(), 1, 0, 0, 0);
                trainingPlanService.updateDay(plan.id(), wednesday.id(), new PlanDayRequest(
                        "Membros inferiores", "Base de força para pernas.", false, 50, ""));
                addDayExercise(trainingPlanService, plan.id(), wednesday.id(), squat.id(), 4, 6, 10, 120);
                trainingPlanService.updateDay(plan.id(), thursday.id(), new PlanDayRequest(
                        "Recuperação", "Atividades leves e totalmente opcionais.", true, 20, ""));
                trainingPlanService.addRestActivity(plan.id(), thursday.id(), new RestActivityRequest(
                        "Caminhada opcional", "Ritmo leve.", 20, "Recuperação ativa", true));
                trainingPlanService.addRestActivity(plan.id(), thursday.id(), new RestActivityRequest(
                        "Mobilidade opcional", "Mobilidade geral.", 10, "Mobilidade", true));
                trainingPlanService.updateDay(plan.id(), friday.id(), new PlanDayRequest(
                        "Corpo inteiro", "Sessão integrada.", false, 55, ""));
                addDayExercise(trainingPlanService, plan.id(), friday.id(), row.id(), 4, 8, 12, 90);
                addDayExercise(trainingPlanService, plan.id(), friday.id(), plank.id(), 3, 0, 0, 60);
                trainingPlanService.updateDay(plan.id(), saturday.id(), new PlanDayRequest(
                        "Atividade livre", "Cardio ou esporte de preferência.", false, 40, ""));
                addDayExercise(trainingPlanService, plan.id(), saturday.id(), walk.id(), 1, 0, 0, 0);
                trainingPlanService.updateDay(plan.id(), sunday.id(), new PlanDayRequest(
                        "Descanso completo", "Recupere-se para a próxima semana.", true, 0, ""));
                trainingPlanService.addRestActivity(plan.id(), sunday.id(), new RestActivityRequest(
                        "Alongamento opcional", "Alongamento leve.", 10, "Alongamento", true));
                trainingPlanService.setActive(plan.id());
            }
        };
    }

    private ExerciseDefinitionRequest exercise(String name, String muscle, String equipment, ExerciseCategory category) {
        return new ExerciseDefinitionRequest(
                name, "", muscle, java.util.List.of(), equipment, category, "Intermediário",
                "", "", "", false, category == ExerciseCategory.CARDIO || category == ExerciseCategory.ENDURANCE);
    }

    private void addDayExercise(
            TrainingPlanService service,
            Long planId,
            Long dayId,
            Long exerciseId,
            int sets,
            int minReps,
            int maxReps,
            int restSeconds
    ) {
        service.addDayExercise(planId, dayId, new DayExerciseRequest(
                exerciseId, sets, minReps, maxReps, BigDecimal.ZERO,
                minReps == 0 && maxReps == 0 ? 1200 : null, BigDecimal.ZERO, restSeconds,
                null, SetType.NORMAL, "", null));
    }
}
