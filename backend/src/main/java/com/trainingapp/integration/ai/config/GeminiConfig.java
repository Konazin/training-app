package com.trainingapp.integration.ai.config;

import com.trainingapp.integration.ai.service.GeminiAiProvider;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties(GeminiProperties.class)
public class GeminiConfig {
    @Bean
    GeminiAiProvider geminiAiProvider(GeminiProperties properties, JsonMapper objectMapper) {
        var factory = new SimpleClientHttpRequestFactory();
        var timeout = Duration.ofSeconds(Math.max(1, properties.requestTimeoutSeconds()));
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);
        return new GeminiAiProvider(RestClient.builder().baseUrl(properties.apiBaseUrl()).requestFactory(factory).build(), properties, objectMapper);
    }
}
