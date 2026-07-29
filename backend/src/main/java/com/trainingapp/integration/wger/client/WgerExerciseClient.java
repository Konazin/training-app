package com.trainingapp.integration.wger.client;

import com.trainingapp.integration.wger.config.WgerProperties;
import com.trainingapp.integration.wger.dto.WgerExerciseInfo;
import com.trainingapp.integration.wger.dto.WgerLanguage;
import com.trainingapp.integration.wger.dto.WgerPage;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClient;

public class WgerExerciseClient {
    private final RestClient client;
    private final WgerProperties properties;

    public WgerExerciseClient(RestClient client, WgerProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    public WgerPage<WgerLanguage> languages() {
        return client.get().uri("/language/?limit=100").retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public WgerPage<WgerExerciseInfo> exercises(int offset) {
        return client.get().uri(builder -> builder.path("/exerciseinfo/")
                        .queryParam("limit", Math.max(1, properties.pageSize()))
                        .queryParam("offset", Math.max(0, offset)).build())
                .retrieve().body(new ParameterizedTypeReference<>() {});
    }
}
