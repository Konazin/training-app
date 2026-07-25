package com.trainingapp.controller;

import com.trainingapp.dto.CompleteSessionRequest;
import com.trainingapp.dto.SetLogRequest;
import com.trainingapp.dto.StartSessionRequest;
import com.trainingapp.dto.WorkoutSessionResponse;
import com.trainingapp.model.SessionExerciseStatus;
import com.trainingapp.model.SessionStatus;
import com.trainingapp.service.WorkoutSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class WorkoutSessionController {
    private final WorkoutSessionService service;

    public WorkoutSessionController(WorkoutSessionService service) { this.service = service; }

    @GetMapping
    public List<WorkoutSessionResponse> history(
            @RequestParam(required = false) Long planId,
            @RequestParam(required = false) Long exerciseId,
            @RequestParam(required = false) SessionStatus status
    ) { return service.history(planId, exerciseId, status); }

    @GetMapping("/active")
    public ResponseEntity<WorkoutSessionResponse> active() {
        WorkoutSessionResponse active = service.active();
        return active == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(active);
    }

    @GetMapping("/{id}")
    public WorkoutSessionResponse findById(@PathVariable Long id) { return service.findById(id); }

    @PostMapping
    public ResponseEntity<WorkoutSessionResponse> start(@Valid @RequestBody StartSessionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.start(request));
    }

    @PutMapping("/{sessionId}/exercises/{exerciseId}/sets/{setId}")
    public WorkoutSessionResponse updateSet(
            @PathVariable Long sessionId,
            @PathVariable Long exerciseId,
            @PathVariable Long setId,
            @Valid @RequestBody SetLogRequest request
    ) { return service.updateSet(sessionId, exerciseId, setId, request); }

    @PostMapping("/{sessionId}/exercises/{exerciseId}/sets")
    public WorkoutSessionResponse addSet(@PathVariable Long sessionId, @PathVariable Long exerciseId) {
        return service.addSet(sessionId, exerciseId);
    }

    @DeleteMapping("/{sessionId}/exercises/{exerciseId}/sets/{setId}")
    public WorkoutSessionResponse removeSet(
            @PathVariable Long sessionId,
            @PathVariable Long exerciseId,
            @PathVariable Long setId
    ) { return service.removeSet(sessionId, exerciseId, setId); }

    @PatchMapping("/{sessionId}/exercises/{exerciseId}/status")
    public WorkoutSessionResponse setExerciseStatus(
            @PathVariable Long sessionId,
            @PathVariable Long exerciseId,
            @RequestParam SessionExerciseStatus status
    ) { return service.setExerciseStatus(sessionId, exerciseId, status); }

    @PostMapping("/{id}/pause")
    public WorkoutSessionResponse pause(@PathVariable Long id) { return service.pause(id); }

    @PostMapping("/{id}/resume")
    public WorkoutSessionResponse resume(@PathVariable Long id) { return service.resume(id); }

    @PostMapping("/{id}/complete")
    public WorkoutSessionResponse complete(@PathVariable Long id, @Valid @RequestBody(required = false) CompleteSessionRequest request) {
        return service.complete(id, request);
    }

    @PostMapping("/{id}/abandon")
    public WorkoutSessionResponse abandon(@PathVariable Long id, @Valid @RequestBody(required = false) CompleteSessionRequest request) {
        return service.abandon(id, request);
    }
}
