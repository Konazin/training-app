package com.trainingapp.integration.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("gemini")
public record GeminiProperties(
        String apiKey,
        String model,
        String apiBaseUrl,
        int requestTimeoutSeconds,
        int maxImageBytes
) {
    public boolean configured() { return apiKey != null && !apiKey.isBlank(); }
}
