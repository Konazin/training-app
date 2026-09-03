package com.trainingapp.integration.ai.service;

import com.trainingapp.integration.ai.config.GeminiProperties;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.SocketTimeoutException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Server-only Gemini adapter. The mobile app never receives the provider key. */
public class GeminiAiProvider {
    private static final Logger LOGGER = LoggerFactory.getLogger(GeminiAiProvider.class);
    private final RestClient client;
    private final RestClient visionClient;
    private final GeminiProperties properties;
    private final JsonMapper mapper;

    public GeminiAiProvider(RestClient client, RestClient visionClient, GeminiProperties properties, JsonMapper mapper) { this.client = client; this.visionClient = visionClient; this.properties = properties; this.mapper = mapper; }

    public JsonNode execute(String task, JsonNode request, String requestId) {
        long started = System.nanoTime();
        int status = 0;
        int[] upstreamStatus = {0};
        LOGGER.info("ai requestId={} task={} event=request_start", requestId, task);
        if (!properties.configured()) {
            AiGatewayException failure = new AiGatewayException(AiGatewayException.Code.UNAVAILABLE, "Gateway Gemini não configurado.");
            logFailure(requestId, task, started, status, "configuration", failure.code());
            throw failure;
        }
        try {
            AiPayloadValidator.validateRequest(task, request, properties.maxImageBytes());
        } catch (AiGatewayException exception) {
            logFailure(requestId, task, started, status, "request_validation", exception.code());
            throw exception;
        }
        String stage = "gemini";
        LOGGER.info("ai requestId={} task={} event=gemini_start", requestId, task);
        try {
            ResponseEntity<JsonNode> entity = clientFor(task).post().uri("/v1beta/models/{model}:generateContent", properties.model())
                    .header("x-goog-api-key", properties.apiKey())
                    .body(geminiRequest(task, request)).retrieve().onStatus(HttpStatusCode::isError, (req, res) -> { upstreamStatus[0] = res.getStatusCode().value(); throw upstream(res.getStatusCode().value()); }).toEntity(JsonNode.class);
            status = entity.getStatusCode().value();
            logGeminiEnd(requestId, task, started, status, entity.getBody());
            stage = "response_parse";
            JsonNode output = output(entity.getBody());
            LOGGER.info("ai requestId={} task={} event=response_parsing result=success", requestId, task);
            stage = "schema_validation";
            JsonNode validated = AiPayloadValidator.validate(task, output, properties.maxImageBytes());
            if ("training-plan".equals(task)) AiPayloadValidator.validateTrainingIds(validated, request.path("context").path("candidateExercises"));
            LOGGER.info("ai requestId={} task={} event=schema_validation result=success", requestId, task);
            return validated;
        } catch (AiGatewayException exception) {
            if ("gemini".equals(stage)) logGeminiEnd(requestId, task, started, upstreamStatus[0], null);
            logFailure(requestId, task, started, upstreamStatus[0] == 0 ? status : upstreamStatus[0], stage, exception.code());
            throw exception;
        } catch (ResourceAccessException exception) {
            AiGatewayException failure = new AiGatewayException(isTimeout(exception) ? AiGatewayException.Code.TIMEOUT : AiGatewayException.Code.NETWORK_ERROR, isTimeout(exception) ? "Tempo limite do Gemini excedido." : "Não foi possível acessar o Gemini.");
            logGeminiEnd(requestId, task, started, status, null);
            logFailure(requestId, task, started, status, stage, failure.code());
            throw failure;
        } catch (RestClientResponseException exception) {
            AiGatewayException failure = upstream(exception.getStatusCode().value());
            if ("gemini".equals(stage)) logGeminiEnd(requestId, task, started, exception.getStatusCode().value(), null);
            logFailure(requestId, task, started, exception.getStatusCode().value(), stage, failure.code());
            throw failure;
        } catch (Exception exception) {
            AiGatewayException failure = new AiGatewayException(AiGatewayException.Code.PROVIDER_ERROR, "Falha temporária ao consultar a IA.");
            if ("gemini".equals(stage)) logGeminiEnd(requestId, task, started, status, null);
            logFailure(requestId, task, started, status, stage, failure.code());
            throw failure;
        }
    }

    private RestClient clientFor(String task) { return "meal-vision".equals(task) ? visionClient : client; }

    private Map<String, Object> geminiRequest(String task, JsonNode request) {
        Map<String, Object> part = new LinkedHashMap<>();
        if ("meal-vision".equals(task)) {
            JsonNode image = request.path("image");
            part.put("inlineData", Map.of("mimeType", image.path("mimeType").asText(), "data", image.path("base64").asText()));
            ObjectNode withoutImage = ((ObjectNode) request).deepCopy();
            withoutImage.remove("image");
            return Map.of("systemInstruction", Map.of("parts", List.of(Map.of("text", AiPrompts.forTask(task)))), "contents", List.of(Map.of("role", "user", "parts", List.of(part, Map.of("text", safeJson(withoutImage))))), "generationConfig", generationConfig(task));
        }
        return Map.of("systemInstruction", Map.of("parts", List.of(Map.of("text", AiPrompts.forTask(task)))), "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", safeJson(request))))), "generationConfig", generationConfig(task));
    }
    private Map<String, Object> generationConfig(String task) { return Map.of("responseMimeType", "application/json", "responseJsonSchema", AiPrompts.schemaFor(task), "thinkingConfig", Map.of("thinkingLevel", properties.thinkingLevelFor(task))); }
    private JsonNode output(JsonNode response) {
        boolean hadText = false;
        if (response != null && response.path("candidates").isArray()) {
            for (JsonNode candidate : response.path("candidates")) {
                for (JsonNode part : candidate.path("content").path("parts")) {
                    if (part.path("thought").asBoolean(false)) continue;
                    JsonNode text = part.path("text");
                    if (text.isTextual() && !text.asText().isBlank()) {
                        hadText = true;
                        try { return mapper.readTree(text.asText()); } catch (JacksonException ignored) { }
                    }
                }
            }
        }
        if (hadText) throw new AiGatewayException(AiGatewayException.Code.INVALID_RESPONSE, "A IA retornou JSON inválido.");
        throw new AiGatewayException(AiGatewayException.Code.INVALID_RESPONSE, "A IA retornou uma resposta vazia.");
    }
    private String safeJson(JsonNode node) { try { return mapper.writeValueAsString(node); } catch (JacksonException exception) { throw new IllegalArgumentException("Requisição de IA inválida."); } }
    private AiGatewayException upstream(int status) {
        if (status == 401 || status == 403) return new AiGatewayException(AiGatewayException.Code.UNAUTHORIZED, "Credencial Gemini recusada.");
        if (status == 429) return new AiGatewayException(AiGatewayException.Code.RATE_LIMITED, "Limite de uso da IA atingido. Tente mais tarde.");
        if (status >= 500) return new AiGatewayException(AiGatewayException.Code.PROVIDER_ERROR, "Serviço de IA indisponível.");
        return new AiGatewayException(AiGatewayException.Code.PROVIDER_ERROR, "Falha ao consultar a IA.");
    }

    private void logGeminiEnd(String requestId, String task, long started, int status, JsonNode response) {
        JsonNode usage = response == null ? null : response.path("usageMetadata");
        LOGGER.info("ai requestId={} task={} event=gemini_end latencyMs={} httpStatus={} promptTokens={} candidateTokens={} totalTokens={}", requestId, task, elapsed(started), status, token(usage, "promptTokenCount"), token(usage, "candidatesTokenCount"), token(usage, "totalTokenCount"));
    }

    private void logFailure(String requestId, String task, long started, int status, String stage, AiGatewayException.Code code) {
        if ("response_parse".equals(stage)) LOGGER.warn("ai requestId={} task={} event=response_parsing result=failure errorType={}", requestId, task, code);
        if ("schema_validation".equals(stage)) LOGGER.warn("ai requestId={} task={} event=schema_validation result=failure errorType={}", requestId, task, code);
        LOGGER.warn("ai requestId={} task={} event=request_end latencyMs={} httpStatus={} stage={} errorType={}", requestId, task, elapsed(started), status, stage, code);
    }

    private static int token(JsonNode usage, String name) { return usage != null && usage.path(name).canConvertToInt() ? usage.path(name).asInt() : 0; }
    private static long elapsed(long started) { return (System.nanoTime() - started) / 1_000_000; }
    private static boolean isTimeout(Throwable error) { for (Throwable cause = error; cause != null; cause = cause.getCause()) if (cause instanceof SocketTimeoutException) return true; return false; }
}
