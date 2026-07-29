package com.trainingapp.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class BetaTokenFilter extends OncePerRequestFilter {
    private final boolean enabled;
    private final byte[] expected;

    public BetaTokenFilter(@Value("${app.security.enabled:false}") boolean enabled,
                           @Value("${app.api-token:}") String token) {
        this.enabled = enabled;
        if (enabled && (token.isBlank() || "change-me-before-beta".equals(token))) {
            throw new IllegalStateException("APP_API_TOKEN é obrigatório no perfil prod");
        }
        expected = token.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !enabled || "/api/health".equals(request.getRequestURI())
                || "OPTIONS".equalsIgnoreCase(request.getMethod()) || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        byte[] supplied = authorization != null && authorization.startsWith("Bearer ")
                ? authorization.substring(7).getBytes(StandardCharsets.UTF_8) : new byte[0];
        if (!MessageDigest.isEqual(expected, supplied)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":401,\"message\":\"Token beta inválido ou ausente\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
