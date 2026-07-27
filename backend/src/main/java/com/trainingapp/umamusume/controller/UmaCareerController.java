package com.trainingapp.umamusume.controller;

import com.trainingapp.umamusume.dto.CreateUmaCareerRequest;
import com.trainingapp.umamusume.dto.StartUmaTrainingResponse;
import com.trainingapp.umamusume.dto.UmaCareerResponse;
import com.trainingapp.umamusume.dto.UmaTurnResponse;
import com.trainingapp.umamusume.service.UmaCareerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/umamusume/careers")
public class UmaCareerController {
    private final UmaCareerService service;

    public UmaCareerController(UmaCareerService service) {
        this.service = service;
    }

    @GetMapping
    public List<UmaCareerResponse> findAll() {
        return service.findAll();
    }

    @GetMapping("/active")
    public ResponseEntity<UmaCareerResponse> findActive() {
        UmaCareerResponse career = service.findActive();
        return career == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(career);
    }

    @GetMapping("/{id}")
    public UmaCareerResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/{id}/turns")
    public List<UmaTurnResponse> findTurns(@PathVariable Long id) {
        return service.findTurns(id);
    }

    @PostMapping
    public ResponseEntity<UmaCareerResponse> create(@Valid @RequestBody CreateUmaCareerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PostMapping("/{id}/start-training")
    public StartUmaTrainingResponse startTraining(@PathVariable Long id) {
        return service.startTraining(id);
    }

    @PostMapping("/{id}/rest-activities/{activityId}/accept")
    public UmaCareerResponse acceptRestActivity(@PathVariable Long id, @PathVariable Long activityId) {
        return service.acceptRestActivity(id, activityId);
    }

    @PostMapping("/{id}/rest-activities/{activityId}/complete")
    public UmaCareerResponse completeRestActivity(@PathVariable Long id, @PathVariable Long activityId) {
        return service.completeRestActivity(id, activityId);
    }

    @PostMapping("/{id}/rest-activity/cancel")
    public UmaCareerResponse cancelRestActivity(@PathVariable Long id) {
        return service.cancelRestActivity(id);
    }

    @PostMapping("/{id}/full-rest")
    public UmaCareerResponse fullRest(@PathVariable Long id) {
        return service.fullRest(id);
    }

    @PostMapping("/{id}/abandon")
    public UmaCareerResponse abandon(@PathVariable Long id) {
        return service.abandon(id);
    }
}
