package com.trainingapp.integration.ai.controller;

import com.trainingapp.integration.ai.service.GeminiAiProvider;
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
    public AiController(GeminiAiProvider provider) { this.provider = provider; }
    @PostMapping("/meal-parse") public Map<String, JsonNode> parseMeal(@RequestBody JsonNode request) { return Map.of("draft", provider.execute("meal-parse", request)); }
    @PostMapping("/meal-vision") public Map<String, JsonNode> analyzeMealImage(@RequestBody JsonNode request) { return Map.of("draft", provider.execute("meal-vision", request)); }
    @PostMapping("/diet-plan") public Map<String, JsonNode> dietPlan(@RequestBody JsonNode request) { return Map.of("draft", provider.execute("diet-plan", request)); }
    @PostMapping("/training-plan") public Map<String, JsonNode> trainingPlan(@RequestBody JsonNode request) { return Map.of("draft", provider.execute("training-plan", request)); }
}
