package com.trainingapp.integration.wger.config;

import com.trainingapp.integration.wger.client.WgerExerciseClient;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
@EnableConfigurationProperties(WgerProperties.class)
public class WgerConfig {
    @Bean
    WgerExerciseClient wgerExerciseClient(WgerProperties properties) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        var timeout = Duration.ofSeconds(Math.max(1, properties.requestTimeoutSeconds()));
        requestFactory.setConnectTimeout(timeout);
        requestFactory.setReadTimeout(timeout);
        return new WgerExerciseClient(RestClient.builder().baseUrl(properties.apiBaseUrl())
                .requestFactory(requestFactory).build(), properties);
    }
}
