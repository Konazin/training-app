package com.trainingapp.integration.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("gemini")
public record GeminiProperties(
        String apiKey,
        String model,
        String apiBaseUrl,
        int requestTimeoutSeconds,
        int maxImageBytes,
        String mealParseThinkingLevel,
        String mealVisionThinkingLevel,
        String dietPlanThinkingLevel,
        String trainingPlanThinkingLevel
) {
    public boolean configured() { return apiKey != null && !apiKey.isBlank(); }
    public String thinkingLevelFor(String task) {
        return switch (task) {
            case "meal-parse" -> mealParseThinkingLevel;
            case "meal-vision" -> mealVisionThinkingLevel;
            case "diet-plan" -> dietPlanThinkingLevel;
            case "training-plan" -> trainingPlanThinkingLevel;
            default -> throw new IllegalArgumentException("Tarefa de IA inválida.");
        };
    }
}
