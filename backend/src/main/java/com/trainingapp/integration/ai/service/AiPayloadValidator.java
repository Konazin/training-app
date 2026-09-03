package com.trainingapp.integration.ai.service;

import tools.jackson.databind.JsonNode;

import java.util.HashSet;
import java.util.Set;

/** Second validation boundary: structured output is useful but never trusted by itself. */
final class AiPayloadValidator {
    private AiPayloadValidator() {}

    static JsonNode validate(String task, JsonNode value, int maxImageBytes) {
        if (!value.isObject()) throw invalid("A IA não retornou um objeto JSON.");
        return switch (task) {
            case "meal-parse" -> { foods(value.path("items"), false); yield value; }
            case "meal-vision" -> { foods(value.path("items"), true); strings(value.path("uncertainties"), 10, 180); yield value; }
            case "diet-plan" -> { diet(value); yield value; }
            case "training-plan" -> { training(value); yield value; }
            default -> throw new IllegalArgumentException("Tarefa de IA inválida.");
        };
    }

    static void validateRequest(String task, JsonNode request, int maxImageBytes) {
        if (!request.isObject() || !request.has("context")) throw new IllegalArgumentException("Contexto de IA obrigatório.");
        if ("meal-parse".equals(task) && (!request.path("text").isTextual() || request.path("text").asText().isBlank() || request.path("text").asText().length() > 1_000)) throw new IllegalArgumentException("Texto da refeição inválido.");
        if ("meal-vision".equals(task)) image(request.path("image"), maxImageBytes);
    }

    private static void foods(JsonNode items, boolean vision) {
        if (!items.isArray() || items.isEmpty() || items.size() > 20) throw invalid("Lista de alimentos inválida.");
        for (JsonNode item : items) {
            if (!item.path("query").isTextual() || item.path("query").asText().isBlank() || item.path("query").asText().length() > 120) throw invalid("Alimento inválido.");
            if (!item.path("quantity").isNull() && (!item.path("quantity").isNumber() || item.path("quantity").asDouble() <= 0 || item.path("quantity").asDouble() > 10_000)) throw invalid("Quantidade inválida.");
            if (!item.path("unit").isNull() && !(item.path("unit").isTextual() && Set.of("g", "ml", "unit").contains(item.path("unit").asText()))) throw invalid("Unidade inválida.");
            if (vision && (!item.path("confidence").isNumber() || item.path("confidence").asDouble() < 0 || item.path("confidence").asDouble() > 1 || !item.path("estimated").isBoolean())) throw invalid("Estimativa visual inválida.");
        }
    }
    private static void diet(JsonNode value) {
        JsonNode meals = value.path("meals");
        if (!meals.isArray() || meals.isEmpty() || meals.size() > 12) throw invalid("Refeições inválidas.");
        strings(value.path("incompatibilities"), 10, 240);
        for (JsonNode meal : meals) { string(meal.path("name"), 80); foods(meal.path("items"), false); }
    }
    private static void training(JsonNode value) {
        JsonNode days = value.path("days");
        if (!days.isArray() || days.isEmpty() || days.size() > 7) throw invalid("Dias de treino inválidos.");
        strings(value.path("incompatibilities"), 10, 240);
        for (JsonNode day : days) {
            string(day.path("name"), 80);
            JsonNode exercises = day.path("exercises");
            if (!exercises.isArray() || exercises.isEmpty() || exercises.size() > 20) throw invalid("Exercícios inválidos.");
            for (JsonNode exercise : exercises) {
                string(exercise.path("exerciseId"), 120);
                if (!exercise.path("sets").canConvertToInt() || exercise.path("sets").asInt() < 1 || exercise.path("sets").asInt() > 12) throw invalid("Séries inválidas.");
                string(exercise.path("repetitions"), 30);
                if (!exercise.path("restSeconds").isNull() && (!exercise.path("restSeconds").canConvertToInt() || exercise.path("restSeconds").asInt() < 0 || exercise.path("restSeconds").asInt() > 900)) throw invalid("Descanso inválido.");
            }
        }
    }
    private static void image(JsonNode image, int maxBytes) {
        if (!image.isObject() || !Set.of("image/jpeg", "image/png", "image/webp").contains(image.path("mimeType").asText()) || !image.path("base64").isTextual() || image.path("base64").asText().isBlank()) throw new AiGatewayException(AiGatewayException.Code.INVALID_IMAGE, "Imagem inválida.");
        int approximateBytes = image.path("base64").asText().length() * 3 / 4;
        if (approximateBytes > maxBytes) throw new AiGatewayException(AiGatewayException.Code.INVALID_IMAGE, "Imagem maior que o limite permitido.");
    }
    private static void strings(JsonNode values, int maxItems, int maxLength) { if (!values.isArray() || values.size() > maxItems) throw invalid("Lista textual inválida."); for (JsonNode value : values) string(value, maxLength); }
    private static void string(JsonNode value, int max) { if (!value.isTextual() || value.asText().isBlank() || value.asText().length() > max) throw invalid("Texto inválido."); }
    private static AiGatewayException invalid(String message) { return new AiGatewayException(AiGatewayException.Code.INVALID_RESPONSE, message); }
}
