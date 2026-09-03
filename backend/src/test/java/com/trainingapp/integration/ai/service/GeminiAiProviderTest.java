package com.trainingapp.integration.ai.service;

import com.trainingapp.integration.ai.config.GeminiProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpStatus.TOO_MANY_REQUESTS;

class GeminiAiProviderTest {
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final GeminiProperties properties = new GeminiProperties("key", "gemini-3.8-flash", "https://gemini.test", 20, 90, 5 * 1024 * 1024, "low", "low", "medium", "medium");

    @Test
    void findsStructuredTextAfterThinkingParts() throws Exception {
        var builder = RestClient.builder().baseUrl("https://gemini.test");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://gemini.test/v1beta/models/gemini-3.8-flash:generateContent"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"thought\":true,\"text\":\"thinking\"},{\"text\":\"{\\\"items\\\":[{\\\"query\\\":\\\"frango\\\",\\\"quantity\\\":200,\\\"unit\\\":\\\"g\\\",\\\"confidence\\\":0.9,\\\"estimated\\\":true}],\\\"uncertainties\\\":[]}\"}]}}],\"usageMetadata\":{\"totalTokenCount\":42}}", MediaType.APPLICATION_JSON));
        var client = builder.build();
        var result = new GeminiAiProvider(client, client, properties, mapper).execute("meal-vision", request(), "test-id");
        assertThat(result.path("items").path(0).path("query").asText()).isEqualTo("frango");
        server.verify();
    }

    @Test
    void classifiesSchemaAndQuotaFailures() throws Exception {
        var builder = RestClient.builder().baseUrl("https://gemini.test");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://gemini.test/v1beta/models/gemini-3.8-flash:generateContent"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"{\\\"items\\\":[{\\\"query\\\":\\\"frango\\\",\\\"quantity\\\":200,\\\"unit\\\":\\\"g\\\",\\\"confidence\\\":2,\\\"estimated\\\":true}],\\\"uncertainties\\\":[]}\"}]}}]}", MediaType.APPLICATION_JSON));
        var client = builder.build();
        var schema = assertThrows(AiGatewayException.class, () -> new GeminiAiProvider(client, client, properties, mapper).execute("meal-vision", request(), "test-id"));
        assertThat(schema.code()).isEqualTo(AiGatewayException.Code.SCHEMA_ERROR);

        server.reset();
        server.expect(requestTo("https://gemini.test/v1beta/models/gemini-3.8-flash:generateContent"))
                .andRespond(withStatus(TOO_MANY_REQUESTS));
        var quota = assertThrows(AiGatewayException.class, () -> new GeminiAiProvider(client, client, properties, mapper).execute("meal-vision", request(), "test-id"));
        assertThat(quota.code()).isEqualTo(AiGatewayException.Code.RATE_LIMITED);
    }

    private tools.jackson.databind.JsonNode request() throws Exception {
        return mapper.readTree("{\"context\":{\"userHint\":null},\"image\":{\"mimeType\":\"image/jpeg\",\"base64\":\"aGVsbG8=\"}}");
    }
}
