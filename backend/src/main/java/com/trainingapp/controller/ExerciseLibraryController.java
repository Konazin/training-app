package com.trainingapp.controller;

import com.trainingapp.dto.ExerciseDefinitionRequest;
import com.trainingapp.dto.ExerciseDefinitionResponse;
import com.trainingapp.service.ExerciseLibraryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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
@RequestMapping("/api/exercise-library")
public class ExerciseLibraryController {
    private final ExerciseLibraryService service;

    public ExerciseLibraryController(ExerciseLibraryService service) { this.service = service; }

    @GetMapping
    public List<ExerciseDefinitionResponse> findAll(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String muscle,
            @RequestParam(required = false) String equipment,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "false") boolean includeArchived
    ) {
        return service.findAll(query, muscle, equipment, category, includeArchived);
    }

    @GetMapping("/{id}")
    public ExerciseDefinitionResponse findById(@PathVariable Long id) { return service.findById(id); }

    @PostMapping
    public ResponseEntity<ExerciseDefinitionResponse> create(@Valid @RequestBody ExerciseDefinitionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public ExerciseDefinitionResponse update(@PathVariable Long id, @Valid @RequestBody ExerciseDefinitionRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/archive")
    public ExerciseDefinitionResponse archive(@PathVariable Long id, @RequestParam(defaultValue = "true") boolean archived) {
        return service.archive(id, archived);
    }
}
