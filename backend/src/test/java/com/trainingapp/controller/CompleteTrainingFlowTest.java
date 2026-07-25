package com.trainingapp.controller;

import com.trainingapp.repository.ExerciseDefinitionRepository;
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

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CompleteTrainingFlowTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired WorkoutSessionRepository sessionRepository;
    @Autowired TrainingPlanRepository planRepository;
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
    void weeklyPlanRestActivitySessionSetVolumeAndHistory() throws Exception {
        JsonNode exercise = json(mockMvc.perform(post("/api/exercise-library")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Supino de teste",
                                  "description": "Exercício reutilizável",
                                  "primaryMuscleGroup": "Peitoral",
                                  "secondaryMuscleGroups": ["Tríceps"],
                                  "equipment": "Barra",
                                  "category": "STRENGTH",
                                  "difficulty": "Intermediário",
                                  "unilateral": false,
                                  "timed": false
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());

        JsonNode plan = json(mockMvc.perform(post("/api/training-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Semana completa",
                                  "description": "Plano de teste",
                                  "category": "Força",
                                  "difficulty": "Intermediário"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.days", hasSize(7)))
                .andReturn().getResponse().getContentAsString());

        long planId = plan.get("id").asLong();
        long mondayId = findDay(plan, "MONDAY").get("id").asLong();
        long thursdayId = findDay(plan, "THURSDAY").get("id").asLong();

        mockMvc.perform(put("/api/training-plans/{planId}/days/{dayId}", planId, thursdayId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Recuperação",
                                  "description": "Dia leve",
                                  "restDay": true,
                                  "estimatedDurationMinutes": 20,
                                  "notes": ""
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days[3].restDay").value(true));

        mockMvc.perform(post("/api/training-plans/{planId}/days/{dayId}/rest-activities", planId, thursdayId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Mobilidade opcional",
                                  "description": "Sem obrigação",
                                  "estimatedDurationMinutes": 10,
                                  "category": "Mobilidade",
                                  "optional": true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.days[3].restActivities", hasSize(1)));

        JsonNode configured = json(mockMvc.perform(post(
                                "/api/training-plans/{planId}/days/{dayId}/exercises", planId, mondayId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "exerciseDefinitionId": %d,
                                  "sets": 3,
                                  "minReps": 8,
                                  "maxReps": 12,
                                  "plannedLoad": 40,
                                  "restSeconds": 90,
                                  "plannedRpe": 8,
                                  "setType": "NORMAL",
                                  "notes": ""
                                }
                                """.formatted(exercise.get("id").asLong())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertEquals(1, findDay(configured, "MONDAY").get("exercises").size());

        JsonNode session = json(mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "trainingPlanId": %d,
                                  "planDayId": %d,
                                  "scheduledDate": "2026-07-25"
                                }
                                """.formatted(planId, mondayId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.exercises[0].sets", hasSize(3)))
                .andReturn().getResponse().getContentAsString());

        long sessionId = session.get("id").asLong();
        long sessionExerciseId = session.get("exercises").get(0).get("id").asLong();
        long setId = session.get("exercises").get(0).get("sets").get(0).get("id").asLong();

        mockMvc.perform(put("/api/sessions/{sessionId}/exercises/{exerciseId}/sets/{setId}",
                                sessionId, sessionExerciseId, setId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reps": 10,
                                  "load": 40,
                                  "durationSeconds": 0,
                                  "distance": 0,
                                  "rpe": 8,
                                  "completed": true,
                                  "notes": ""
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedSets").value(1))
                .andExpect(jsonPath("$.totalVolume").value(400));

        JsonNode addedSet = json(mockMvc.perform(post("/api/sessions/{sessionId}/exercises/{exerciseId}/sets",
                                sessionId, sessionExerciseId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises[0].sets", hasSize(4)))
                .andExpect(jsonPath("$.exercises[0].sets[3].manuallyAdded").value(true))
                .andReturn().getResponse().getContentAsString());
        long addedSetId = addedSet.get("exercises").get(0).get("sets").get(3).get("id").asLong();

        mockMvc.perform(delete("/api/sessions/{sessionId}/exercises/{exerciseId}/sets/{setId}",
                        sessionId, sessionExerciseId, addedSetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises[0].sets", hasSize(3)));

        mockMvc.perform(post("/api/sessions/{id}/pause", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAUSED"));
        mockMvc.perform(get("/api/sessions/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(sessionId))
                .andExpect(jsonPath("$.status").value("PAUSED"));
        mockMvc.perform(put("/api/sessions/{sessionId}/exercises/{exerciseId}/sets/{setId}",
                                sessionId, sessionExerciseId, setId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reps": 10,
                                  "load": 42,
                                  "durationSeconds": 0,
                                  "distance": 0,
                                  "rpe": 8,
                                  "completed": true,
                                  "notes": "editada durante pausa"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalVolume").value(420));
        mockMvc.perform(post("/api/sessions/{id}/resume", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        mockMvc.perform(post("/api/sessions/{id}/complete", sessionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"overallRpe": 8, "notes": "Boa sessão"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.totalVolume").value(420));

        mockMvc.perform(get("/api/sessions").param("planId", String.valueOf(planId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].notes").value("Boa sessão"));
        mockMvc.perform(get("/api/sessions/active")).andExpect(status().isNoContent());
    }

    @Test
    void preventsDuplicateNamesAndConcurrentSessionForSameDay() throws Exception {
        String exercise = """
                {
                  "name": "  Remada Única  ",
                  "primaryMuscleGroup": "Costas",
                  "secondaryMuscleGroups": [],
                  "equipment": "Barra",
                  "category": "STRENGTH",
                  "difficulty": "Iniciante",
                  "unilateral": false,
                  "timed": false
                }
                """;
        mockMvc.perform(post("/api/exercise-library").contentType(MediaType.APPLICATION_JSON).content(exercise))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/exercise-library").contentType(MediaType.APPLICATION_JSON)
                        .content(exercise.replace("Remada Única", "remada unica")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Já existe um exercício com este nome"));
    }

    @Test
    void preventsMoreThanOneGlobalActiveSessionAndPreservesAbandonedSession() throws Exception {
        JsonNode exercise = json(mockMvc.perform(post("/api/exercise-library")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Corrida global",
                                  "primaryMuscleGroup": "Cardiorrespiratório",
                                  "secondaryMuscleGroups": [],
                                  "equipment": "Esteira",
                                  "category": "CARDIO",
                                  "difficulty": "Iniciante",
                                  "unilateral": false,
                                  "timed": true
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
        JsonNode plan = json(mockMvc.perform(post("/api/training-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Plano global",
                                  "description": "",
                                  "category": "Cardio",
                                  "difficulty": "Iniciante"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString());
        long planId = plan.get("id").asLong();
        long mondayId = findDay(plan, "MONDAY").get("id").asLong();
        long tuesdayId = findDay(plan, "TUESDAY").get("id").asLong();
        String dayExercise = """
                {
                  "exerciseDefinitionId": %d,
                  "sets": 1,
                  "minReps": 0,
                  "maxReps": 0,
                  "plannedDurationSeconds": 600,
                  "plannedDistance": 2,
                  "restSeconds": 30,
                  "setType": "NORMAL",
                  "notes": ""
                }
                """.formatted(exercise.get("id").asLong());
        mockMvc.perform(post("/api/training-plans/{planId}/days/{dayId}/exercises", planId, mondayId)
                        .contentType(MediaType.APPLICATION_JSON).content(dayExercise))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/training-plans/{planId}/days/{dayId}/exercises", planId, tuesdayId)
                        .contentType(MediaType.APPLICATION_JSON).content(dayExercise))
                .andExpect(status().isCreated());

        JsonNode first = json(mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sessionRequest(planId, mondayId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.exercises[0].category").value("CARDIO"))
                .andExpect(jsonPath("$.exercises[0].timed").value(true))
                .andReturn().getResponse().getContentAsString());
        mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sessionRequest(planId, tuesdayId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Já existe uma sessão ativa"));

        long firstId = first.get("id").asLong();
        mockMvc.perform(post("/api/sessions/{id}/abandon", firstId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ABANDONED"))
                .andExpect(jsonPath("$.exercises[0].sets", hasSize(1)));
        mockMvc.perform(post("/api/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sessionRequest(planId, tuesdayId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    private JsonNode json(String value) throws Exception { return objectMapper.readTree(value); }

    private JsonNode findDay(JsonNode plan, String weekday) {
        for (JsonNode day : plan.get("days")) if (weekday.equals(day.get("weekday").asText())) return day;
        throw new IllegalArgumentException("Dia não encontrado");
    }

    private String sessionRequest(long planId, long dayId) {
        return """
                {
                  "trainingPlanId": %d,
                  "planDayId": %d,
                  "scheduledDate": "2026-07-25"
                }
                """.formatted(planId, dayId);
    }
}
