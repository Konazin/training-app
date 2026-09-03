package com.trainingapp.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.trainingapp.integration.ai.service.AiGatewayException;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(AiGatewayException.class)
    public ResponseEntity<ApiError> handleAi(AiGatewayException exception) {
        HttpStatus status = switch (exception.code()) {
            case UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case TIMEOUT -> HttpStatus.GATEWAY_TIMEOUT;
            case RATE_LIMITED, QUOTA_EXHAUSTED -> HttpStatus.TOO_MANY_REQUESTS;
            case UNAUTHORIZED -> HttpStatus.BAD_GATEWAY;
            case INVALID_RESPONSE, INVALID_IMAGE -> HttpStatus.UNPROCESSABLE_ENTITY;
            case UPSTREAM_FAILURE -> HttpStatus.BAD_GATEWAY;
        };
        return ResponseEntity.status(status).body(new ApiError(status.value(), exception.getMessage(), Map.of("code", exception.code().name()), OffsetDateTime.now()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiError(404, exception.getMessage(), Map.of(), OffsetDateTime.now()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> fields.put(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest()
                .body(new ApiError(400, "Dados inválidos", fields, OffsetDateTime.now()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest()
                .body(new ApiError(400, exception.getMessage(), Map.of(), OffsetDateTime.now()));
    }

    @ExceptionHandler(DomainConflictException.class)
    public ResponseEntity<ApiError> handleConflict(DomainConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError(409, exception.getMessage(), Map.of(), OffsetDateTime.now()));
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiError> handleOptimisticLock() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(
                409,
                "A carreira foi atualizada em outra operação. Atualize os dados e tente novamente.",
                Map.of(),
                OffsetDateTime.now()
        ));
    }
}
