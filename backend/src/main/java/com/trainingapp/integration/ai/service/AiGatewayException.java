package com.trainingapp.integration.ai.service;

public class AiGatewayException extends RuntimeException {
    public enum Code { UNAVAILABLE, TIMEOUT, NETWORK_ERROR, RATE_LIMITED, QUOTA_EXHAUSTED, UNAUTHORIZED, PROVIDER_ERROR, INVALID_RESPONSE, SCHEMA_ERROR, IMAGE_REJECTED }
    private final Code code;
    public AiGatewayException(Code code, String message) { super(message); this.code = code; }
    public Code code() { return code; }
}
