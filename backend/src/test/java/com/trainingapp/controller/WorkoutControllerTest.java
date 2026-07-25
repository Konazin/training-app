package com.trainingapp.controller;

import com.trainingapp.repository.WorkoutRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class WorkoutControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private WorkoutRepository workoutRepository;

    @BeforeEach
    void cleanDatabase() {
        workoutRepository.deleteAll();
    }

    @Test
    void createsWorkoutWithCustomJsonStatsAndExercise() throws Exception {
        String workoutPayload = """
                {
                  "name": "Treino A",
                  "description": "Força",
                  "scheduledDate": "2026-07-24",
                  "status": "PLANNED",
                  "durationMinutes": 45,
                  "calories": 250,
                  "customStats": {"humor": "ótimo", "energia": 9}
                }
                """;

        String response = mockMvc.perform(post("/api/workouts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workoutPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customStats.energia").value(9))
                .andReturn().getResponse().getContentAsString();

        long workoutId = objectMapper.readTree(response).get("id").asLong();
        String exercisePayload = """
                {
                  "name": "Agachamento",
                  "muscleGroup": "Pernas",
                  "sets": 4,
                  "reps": 8,
                  "weightKg": 80,
                  "restSeconds": 120,
                  "customStats": {"rir": 2}
                }
                """;

        String exerciseResponse = mockMvc.perform(post("/api/workouts/{id}/exercises", workoutId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(exercisePayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.exercises", hasSize(1)))
                .andExpect(jsonPath("$.exercises[0].customStats.rir").value(2))
                .andReturn().getResponse().getContentAsString();

        long exerciseId = objectMapper.readTree(exerciseResponse)
                .get("exercises").get(0).get("id").asLong();
        mockMvc.perform(delete("/api/workouts/{workoutId}/exercises/{exerciseId}", workoutId, exerciseId))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/workouts/{id}", workoutId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises", hasSize(0)));
    }

    @Test
    void validatesRequiredFieldsAndReturnsNotFound() throws Exception {
        mockMvc.perform(post("/api/workouts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").exists());

        mockMvc.perform(get("/api/workouts/999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletesWorkout() throws Exception {
        String payload = """
                {
                  "name": "Temporário",
                  "scheduledDate": "2026-07-24",
                  "status": "COMPLETED",
                  "durationMinutes": 30,
                  "calories": 180,
                  "customStats": {}
                }
                """;
        String response = mockMvc.perform(post("/api/workouts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andReturn().getResponse().getContentAsString();
        long id = objectMapper.readTree(response).get("id").asLong();

        mockMvc.perform(delete("/api/workouts/{id}", id))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/workouts/{id}", id))
                .andExpect(status().isNotFound());
    }
}
