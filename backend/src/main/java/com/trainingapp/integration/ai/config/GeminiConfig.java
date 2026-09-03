package com.trainingapp.integration.ai.config;

import com.trainingapp.integration.ai.service.GeminiAiProvider;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Set;

@Configuration
@EnableConfigurationProperties(GeminiProperties.class)
public class GeminiConfig {
    @Bean
    GeminiAiProvider geminiAiProvider(GeminiProperties properties, JsonMapper objectMapper) {
        if (properties.model() == null || properties.model().isBlank()) throw new IllegalStateException("GEMINI_MODEL é obrigatório.");
        for (String level : Set.of(properties.mealParseThinkingLevel(), properties.mealVisionThinkingLevel(), properties.dietPlanThinkingLevel(), properties.trainingPlanThinkingLevel())) if (!Set.of("low", "medium", "high").contains(level)) throw new IllegalStateException("Thinking level Gemini inválido.");
        var factory = new SimpleClientHttpRequestFactory();
        var timeout = Duration.ofSeconds(Math.max(1, properties.requestTimeoutSeconds()));
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);
        return new GeminiAiProvider(RestClient.builder().baseUrl(properties.apiBaseUrl()).requestFactory(factory).build(), properties, objectMapper);
    }
}
