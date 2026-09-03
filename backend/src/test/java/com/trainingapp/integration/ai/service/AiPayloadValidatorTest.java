package com.trainingapp.integration.ai.service;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AiPayloadValidatorTest {
    private final JsonMapper json = JsonMapper.builder().build();

    @Test
    void acceptsSemanticMealWithoutNutrients() throws Exception {
        assertDoesNotThrow(() -> AiPayloadValidator.validate("meal-parse", json.readTree("{\"items\":[{\"query\":\"arroz\",\"quantity\":150,\"unit\":\"g\"}]}"), 1024));
    }

    @Test
    void rejectsTrainingExerciseOutsideClientSideCandidateBoundaryLater() throws Exception {
        assertDoesNotThrow(() -> AiPayloadValidator.validate("training-plan", json.readTree("{\"days\":[{\"name\":\"A\",\"exercises\":[{\"exerciseId\":\"candidate-only\",\"sets\":3,\"repetitions\":\"8-10\",\"restSeconds\":90}]}],\"incompatibilities\":[]}"), 1024));
    }

    @Test
    void rejectsInvalidVisionConfidenceAndImageSize() throws Exception {
        assertThrows(AiGatewayException.class, () -> AiPayloadValidator.validate("meal-vision", json.readTree("{\"items\":[{\"query\":\"frango\",\"quantity\":160,\"unit\":\"g\",\"confidence\":2,\"estimated\":true}],\"uncertainties\":[]}"), 1024));
        assertThrows(AiGatewayException.class, () -> AiPayloadValidator.validateRequest("meal-vision", json.readTree("{\"context\":{},\"image\":{\"mimeType\":\"image/jpeg\",\"base64\":\"aaaaaaaaaaaaaaaa\"}}"), 2));
    }
}
