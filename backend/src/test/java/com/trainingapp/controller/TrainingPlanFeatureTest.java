package com.trainingapp.controller;

import com.trainingapp.repository.ExerciseDefinitionRepository;
import com.trainingapp.repository.TrainingPlanDayRepository;
import com.trainingapp.repository.TrainingPlanRepository;
import com.trainingapp.repository.WorkoutSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.HashSet;
import java.util.Set;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TrainingPlanFeatureTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired WorkoutSessionRepository sessionRepository;
    @Autowired TrainingPlanRepository planRepository;
    @Autowired TrainingPlanDayRepository dayRepository;
    @Autowired ExerciseDefinitionRepository exerciseRepository;

    @BeforeEach
    void clean() {
        sessionRepository.deleteAll();
        planRepository.deleteAll();
        exerciseRepository.deleteAll();
    }

    @AfterEach
    void cleanSessions() {
        sessionRepository.deleteAll();
    }

    @Test
    void createsSevenUniqueDaysAndGetDoesNotRepairMissingDays() throws Exception {
        JsonNode plan = createPlan("Semana íntegra");
        assertEquals(7, plan.get("days").size());

        long removedDayId = plan.get("days").get(3).get("id").asLong();
        dayRepository.deleteById(removedDayId);

        JsonNode unchanged = json(mockMvc.perform(get("/api/training-plans/{id}", plan.get("id").asLong()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days", hasSize(6)))
                .andReturn().getResponse().getContentAsString());
        Set<String> weekdays = new HashSet<>();
        unchanged.get("days").forEach(day -> weekdays.add(day.get("weekday").asText()));
        assertEquals(6, weekdays.size());
        assertEquals(6, dayRepository.count());

        mockMvc.perform(post("/api/training-plans/{id}/duplicate", plan.get("id").asLong()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.days", hasSize(7)));
    }

    @Test
    void togglesRestWithoutLosingExercisesAndKeepsHistoricalSessionSnapshot() throws Exception {
        JsonNode definition = createExercise("Supino histórico", "STRENGTH", false);
        JsonNode plan = createPlan("Ficha histórica");
        long planId = plan.get("id").asLong();
        long dayId = day(plan, "MONDAY").get("id").asLong();
        JsonNode configured = addExercise(planId, dayId, definition.get("id").asLong(), 3, 40);
        long dayExerciseId = day(configured, "MONDAY").get("exercises").get(0).get("id").asLong();

        JsonNode session = json(mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"trainingPlanId": %d, "planDayId": %d, "scheduledDate": "2026-07-25"}
                                """.formatted(planId, dayId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
        long sessionId = session.get("id").asLong();
        long sessionExerciseId = session.get("exercises").get(0).get("id").asLong();
        long setId = session.get("exercises").get(0).get("sets").get(0).get("id").asLong();
        mockMvc.perform(put("/api/sessions/{sessionId}/exercises/{exerciseId}/sets/{setId}",
                                sessionId, sessionExerciseId, setId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reps": 10, "load": 40, "durationSeconds": 0, "distance": 0,
                                 "rpe": 8, "completed": true, "notes": ""}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/sessions/{id}/complete", sessionId)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/training-plans/{planId}/days/{dayId}", planId, dayId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dayRequest(true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].restDay").value(true))
                .andExpect(jsonPath("$.days[0].exercises", hasSize(1)));
        mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"trainingPlanId": %d, "planDayId": %d, "scheduledDate": "2026-07-26"}
                                """.formatted(planId, dayId)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/training-plans/{planId}/days/{dayId}/exercises/{exerciseId}",
                                planId, dayId, dayExerciseId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exerciseConfig(4, 99)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].exercises[0].plannedLoad").value(99));
        mockMvc.perform(get("/api/sessions/{id}", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises[0].sets[0].load").value(40));

        mockMvc.perform(put("/api/training-plans/{planId}/days/{dayId}", planId, dayId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dayRequest(false)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].restDay").value(false))
                .andExpect(jsonPath("$.days[0].exercises", hasSize(1)));
    }

    @Test
    void editsRemovesAndReordersExercisesAndRestActivities() throws Exception {
        JsonNode firstDefinition = createExercise("Agachamento A", "STRENGTH", false);
        JsonNode secondDefinition = createExercise("Agachamento B", "STRENGTH", false);
        JsonNode plan = createPlan("Ficha editável");
        long planId = plan.get("id").asLong();
        long dayId = day(plan, "MONDAY").get("id").asLong();
        JsonNode withFirst = addExercise(planId, dayId, firstDefinition.get("id").asLong(), 3, 30);
        JsonNode withBoth = addExercise(planId, dayId, secondDefinition.get("id").asLong(), 3, 35);
        long firstId = day(withFirst, "MONDAY").get("exercises").get(0).get("id").asLong();
        long secondId = day(withBoth, "MONDAY").get("exercises").get(1).get("id").asLong();

        mockMvc.perform(put("/api/training-plans/{planId}/days/{dayId}/exercises/{exerciseId}",
                                planId, dayId, firstId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exerciseConfig(5, 50)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].exercises[0].sets").value(5))
                .andExpect(jsonPath("$.days[0].exercises[0].exercise.id").value(firstDefinition.get("id").asLong()));
        mockMvc.perform(put("/api/training-plans/{planId}/days/{dayId}/exercises/order", planId, dayId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[%d,%d]".formatted(secondId, firstId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].exercises[0].id").value(secondId));
        mockMvc.perform(put("/api/training-plans/{planId}/days/{dayId}/exercises/order", planId, dayId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[%d,%d]".formatted(firstId, firstId)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/training-plans/{planId}/days/{dayId}/exercises/{exerciseId}",
                        planId, dayId, firstId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].exercises", hasSize(1)));

        mockMvc.perform(put("/api/training-plans/{planId}/days/{dayId}", planId, dayId)
                        .contentType(MediaType.APPLICATION_JSON).content(dayRequest(true)))
                .andExpect(status().isOk());
        JsonNode oneActivity = addActivity(planId, dayId, "Caminhada", "caminhada");
        JsonNode twoActivities = addActivity(planId, dayId, "Mobilidade", "mobilidade");
        long firstActivityId = day(oneActivity, "MONDAY").get("restActivities").get(0).get("id").asLong();
        long secondActivityId = day(twoActivities, "MONDAY").get("restActivities").get(1).get("id").asLong();

        mockMvc.perform(put("/api/training-plans/{planId}/days/{dayId}/rest-activities/{activityId}",
                                planId, dayId, firstActivityId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Caminhada leve","description":"Ao ar livre",
                                 "estimatedDurationMinutes":25,"category":"personalizada","optional":false}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].restActivities[0].name").value("Caminhada leve"));
        mockMvc.perform(put("/api/training-plans/{planId}/days/{dayId}/rest-activities/order", planId, dayId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[%d,%d]".formatted(secondActivityId, firstActivityId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].restActivities[0].id").value(secondActivityId));
        mockMvc.perform(delete("/api/training-plans/{planId}/days/{dayId}/rest-activities/{activityId}",
                        planId, dayId, firstActivityId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[0].restActivities", hasSize(1)));
    }

    private JsonNode createPlan(String name) throws Exception {
        return json(mockMvc.perform(post("/api/training-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","description":"","category":"Força","difficulty":"Intermediário"}
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.days", hasSize(7)))
                .andReturn().getResponse().getContentAsString());
    }

    private JsonNode createExercise(String name, String category, boolean timed) throws Exception {
        return json(mockMvc.perform(post("/api/exercise-library")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","primaryMuscleGroup":"Corpo inteiro","secondaryMuscleGroups":[],
                                 "equipment":"Livre","category":"%s","difficulty":"Intermediário",
                                 "unilateral":false,"timed":%s}
                                """.formatted(name, category, timed)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
    }

    private JsonNode addExercise(long planId, long dayId, long definitionId, int sets, int load) throws Exception {
        return json(mockMvc.perform(post("/api/training-plans/{planId}/days/{dayId}/exercises", planId, dayId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"exerciseDefinitionId":%d,"sets":%d,"minReps":8,"maxReps":12,
                                 "plannedLoad":%d,"plannedDurationSeconds":null,"plannedDistance":0,
                                 "restSeconds":60,"plannedRpe":8,"setType":"NORMAL","notes":"",
                                 "alternativeExerciseId":null}
                                """.formatted(definitionId, sets, load)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
    }

    private JsonNode addActivity(long planId, long dayId, String name, String category) throws Exception {
        return json(mockMvc.perform(post("/api/training-plans/{planId}/days/{dayId}/rest-activities", planId, dayId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","description":"","estimatedDurationMinutes":15,
                                 "category":"%s","optional":true}
                                """.formatted(name, category)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
    }

    private String exerciseConfig(int sets, int load) {
        return """
                {"sets":%d,"minReps":8,"maxReps":12,"plannedLoad":%d,
                 "plannedDurationSeconds":null,"plannedDistance":0,"restSeconds":60,
                 "plannedRpe":8,"setType":"NORMAL","notes":"","alternativeExerciseId":null}
                """.formatted(sets, load);
    }

    private String dayRequest(boolean restDay) {
        return """
                {"title":"Segunda","description":"Dia principal","restDay":%s,
                 "estimatedDurationMinutes":45,"notes":"preservar"}
                """.formatted(restDay);
    }

    private JsonNode day(JsonNode plan, String weekday) {
        for (JsonNode item : plan.get("days")) if (weekday.equals(item.get("weekday").asText())) return item;
        throw new IllegalArgumentException("Dia não encontrado");
    }

    private JsonNode json(String value) throws Exception {
        return objectMapper.readTree(value);
    }
}
