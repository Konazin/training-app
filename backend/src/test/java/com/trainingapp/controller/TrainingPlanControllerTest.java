package com.trainingapp.controller;

import com.trainingapp.repository.TrainingPlanRepository;
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
class TrainingPlanControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TrainingPlanRepository repository;

    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
    }

    @Test
    void createsPlanAndManagesItsExercises() throws Exception {
        String planResponse = mockMvc.perform(post("/api/training-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Treino de calistenia",
                                  "description": "Peso corporal",
                                  "category": "Calistenia",
                                  "difficulty": "Intermediário"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Treino de calistenia"))
                .andExpect(jsonPath("$.exercises", hasSize(0)))
                .andReturn().getResponse().getContentAsString();

        long planId = objectMapper.readTree(planResponse).get("id").asLong();
        String exerciseResponse = mockMvc.perform(post("/api/training-plans/{id}/exercises", planId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Barra fixa",
                                  "muscleGroup": "Costas",
                                  "sets": 4,
                                  "reps": 8,
                                  "weightKg": 0,
                                  "restSeconds": 90,
                                  "customStats": {"tipo": "peso corporal"}
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.exercises", hasSize(1)))
                .andExpect(jsonPath("$.exercises[0].customStats.tipo").value("peso corporal"))
                .andReturn().getResponse().getContentAsString();

        long exerciseId = objectMapper.readTree(exerciseResponse)
                .get("exercises").get(0).get("id").asLong();

        mockMvc.perform(delete("/api/training-plans/{planId}/exercises/{exerciseId}", planId, exerciseId))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/training-plans/{id}", planId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises", hasSize(0)));
    }
}
