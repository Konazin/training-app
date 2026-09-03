package com.trainingapp.integration.ai.service;

public class AiGatewayException extends RuntimeException {
    public enum Code { UNAVAILABLE, TIMEOUT, RATE_LIMITED, QUOTA_EXHAUSTED, UNAUTHORIZED, UPSTREAM_FAILURE, INVALID_RESPONSE, INVALID_IMAGE }
    private final Code code;
    public AiGatewayException(Code code, String message) { super(message); this.code = code; }
    public Code code() { return code; }
}
