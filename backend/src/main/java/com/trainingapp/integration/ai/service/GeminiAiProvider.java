package com.trainingapp.integration.ai.service;

import com.trainingapp.integration.ai.config.GeminiProperties;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Server-only Gemini adapter. The mobile app never receives the provider key. */
public class GeminiAiProvider {
    private final RestClient client;
    private final GeminiProperties properties;
    private final JsonMapper mapper;

    public GeminiAiProvider(RestClient client, GeminiProperties properties, JsonMapper mapper) { this.client = client; this.properties = properties; this.mapper = mapper; }

    public JsonNode execute(String task, JsonNode request) {
        if (!properties.configured()) throw new AiGatewayException(AiGatewayException.Code.UNAVAILABLE, "Gateway Gemini não configurado.");
        AiPayloadValidator.validateRequest(task, request, properties.maxImageBytes());
        try {
            JsonNode response = client.post().uri("/v1beta/models/{model}:generateContent", properties.model())
                    .header("x-goog-api-key", properties.apiKey())
                    .body(geminiRequest(task, request)).retrieve().onStatus(HttpStatusCode::isError, (req, res) -> { throw upstream(res.getStatusCode().value()); }).body(JsonNode.class);
            JsonNode output = output(response);
            JsonNode validated = AiPayloadValidator.validate(task, output, properties.maxImageBytes());
            if ("training-plan".equals(task)) AiPayloadValidator.validateTrainingIds(validated, request.path("context").path("candidateExercises"));
            return validated;
        } catch (AiGatewayException exception) { throw exception;
        } catch (RestClientResponseException exception) { throw upstream(exception.getStatusCode().value());
        } catch (Exception exception) { throw new AiGatewayException(AiGatewayException.Code.UPSTREAM_FAILURE, "Falha temporária ao consultar a IA."); }
    }

    private Map<String, Object> geminiRequest(String task, JsonNode request) {
        Map<String, Object> part = new LinkedHashMap<>();
        if ("meal-vision".equals(task)) {
            JsonNode image = request.path("image");
            part.put("inlineData", Map.of("mimeType", image.path("mimeType").asText(), "data", image.path("base64").asText()));
            ObjectNode withoutImage = ((ObjectNode) request).deepCopy();
            withoutImage.remove("image");
            return Map.of("systemInstruction", Map.of("parts", List.of(Map.of("text", AiPrompts.forTask(task)))), "contents", List.of(Map.of("role", "user", "parts", List.of(part, Map.of("text", safeJson(withoutImage))))), "generationConfig", Map.of("responseMimeType", "application/json", "responseJsonSchema", AiPrompts.schemaFor(task)));
        }
        return Map.of("systemInstruction", Map.of("parts", List.of(Map.of("text", AiPrompts.forTask(task)))), "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", safeJson(request))))), "generationConfig", Map.of("responseMimeType", "application/json", "responseJsonSchema", AiPrompts.schemaFor(task)));
    }
    private JsonNode output(JsonNode response) {
        JsonNode text = response.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        if (!text.isTextual() || text.asText().isBlank()) throw new AiGatewayException(AiGatewayException.Code.INVALID_RESPONSE, "A IA retornou uma resposta vazia.");
        try { return mapper.readTree(text.asText()); } catch (JacksonException exception) { throw new AiGatewayException(AiGatewayException.Code.INVALID_RESPONSE, "A IA retornou JSON inválido."); }
    }
    private String safeJson(JsonNode node) { try { return mapper.writeValueAsString(node); } catch (JacksonException exception) { throw new IllegalArgumentException("Requisição de IA inválida."); } }
    private AiGatewayException upstream(int status) {
        if (status == 401 || status == 403) return new AiGatewayException(AiGatewayException.Code.UNAUTHORIZED, "Credencial Gemini recusada.");
        if (status == 429) return new AiGatewayException(AiGatewayException.Code.RATE_LIMITED, "Limite de uso da IA atingido. Tente mais tarde.");
        if (status >= 500) return new AiGatewayException(AiGatewayException.Code.UPSTREAM_FAILURE, "Serviço de IA indisponível.");
        return new AiGatewayException(AiGatewayException.Code.UPSTREAM_FAILURE, "Falha ao consultar a IA.");
    }
}
