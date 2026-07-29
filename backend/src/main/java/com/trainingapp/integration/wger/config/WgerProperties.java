package com.trainingapp.integration.wger.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("wger")
public record WgerProperties(
        boolean integrationEnabled,
        String apiBaseUrl,
        String language,
        String fallbackLanguage,
        int requestTimeoutSeconds,
        int pageSize,
        int syncMaxPages,
        int syncLockTimeoutMinutes
) {}
