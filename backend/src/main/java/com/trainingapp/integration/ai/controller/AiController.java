package com.trainingapp.integration.ai.controller;

import com.trainingapp.integration.ai.service.GeminiAiProvider;
import com.trainingapp.integration.ai.config.GeminiProperties;
import tools.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Explicit task routes intentionally avoid a generic chatbot endpoint. */
@RestController
@RequestMapping("/api/ai")
public class AiController {
    private final GeminiAiProvider provider;
    private final GeminiProperties properties;
    public AiController(GeminiAiProvider provider, GeminiProperties properties) { this.provider = provider; this.properties = properties; }
    @org.springframework.web.bind.annotation.GetMapping("/status") public Map<String, Object> status() { return Map.of("available", properties.configured(), "provider", "gemini", "model", properties.model(), "capabilities", new String[]{"meal_parse", "meal_vision", "diet_plan", "training_plan"}); }
    @PostMapping("/meal-parse") public Map<String, JsonNode> parseMeal(@RequestBody JsonNode request) { return Map.of("draft", provider.execute("meal-parse", request)); }
    @PostMapping("/meal-vision") public Map<String, JsonNode> analyzeMealImage(@RequestBody JsonNode request) { return Map.of("draft", provider.execute("meal-vision", request)); }
    @PostMapping("/diet-plan") public Map<String, JsonNode> dietPlan(@RequestBody JsonNode request) { return Map.of("draft", provider.execute("diet-plan", request)); }
    @PostMapping("/training-plan") public Map<String, JsonNode> trainingPlan(@RequestBody JsonNode request) { return Map.of("draft", provider.execute("training-plan", request)); }
}
