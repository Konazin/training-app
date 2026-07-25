package com.trainingapp.service;

import com.trainingapp.dto.ExerciseDefinitionRequest;
import com.trainingapp.dto.ExerciseDefinitionResponse;
import com.trainingapp.exception.ResourceNotFoundException;
import com.trainingapp.model.ExerciseDefinition;
import com.trainingapp.repository.ExerciseDefinitionRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class ExerciseLibraryService {
    private final ExerciseDefinitionRepository repository;

    public ExerciseLibraryService(ExerciseDefinitionRepository repository) {
        this.repository = repository;
    }

    public List<ExerciseDefinitionResponse> findAll(String query, String muscle, String equipment, String category, boolean includeArchived) {
        String normalizedQuery = query == null ? "" : normalize(query);
        return repository.findAllByOrderByNameAsc().stream()
                .filter(item -> includeArchived || !item.isArchived())
                .filter(item -> normalizedQuery.isBlank() || item.getNormalizedName().contains(normalizedQuery))
                .filter(item -> matches(item.getPrimaryMuscleGroup(), muscle))
                .filter(item -> matches(item.getEquipment(), equipment))
                .filter(item -> category == null || category.isBlank() || item.getCategory().name().equalsIgnoreCase(category))
                .map(this::toResponse)
                .toList();
    }

    public ExerciseDefinitionResponse findById(Long id) { return toResponse(findEntity(id)); }

    public ExerciseDefinitionResponse create(ExerciseDefinitionRequest request) {
        String normalized = normalize(request.name());
        if (repository.findByNormalizedName(normalized).isPresent()) {
            throw new IllegalArgumentException("Já existe um exercício com este nome");
        }
        ExerciseDefinition exercise = new ExerciseDefinition();
        apply(exercise, request);
        exercise.setNormalizedName(normalized);
        exercise.setCustom(true);
        OffsetDateTime now = OffsetDateTime.now();
        exercise.setCreatedAt(now);
        exercise.setUpdatedAt(now);
        return toResponse(repository.save(exercise));
    }

    public ExerciseDefinitionResponse createSystem(ExerciseDefinitionRequest request) {
        return repository.findByNormalizedName(normalize(request.name()))
                .map(this::toResponse)
                .orElseGet(() -> {
                    ExerciseDefinition exercise = new ExerciseDefinition();
                    apply(exercise, request);
                    exercise.setNormalizedName(normalize(request.name()));
                    exercise.setCustom(false);
                    OffsetDateTime now = OffsetDateTime.now();
                    exercise.setCreatedAt(now);
                    exercise.setUpdatedAt(now);
                    return toResponse(repository.save(exercise));
                });
    }

    public ExerciseDefinitionResponse update(Long id, ExerciseDefinitionRequest request) {
        ExerciseDefinition exercise = findEntity(id);
        if (!exercise.isCustom()) throw new IllegalArgumentException("Exercícios do sistema não podem ser editados");
        String normalized = normalize(request.name());
        repository.findByNormalizedName(normalized)
                .filter(item -> !item.getId().equals(id))
                .ifPresent(item -> { throw new IllegalArgumentException("Já existe um exercício com este nome"); });
        apply(exercise, request);
        exercise.setNormalizedName(normalized);
        exercise.setUpdatedAt(OffsetDateTime.now());
        return toResponse(repository.save(exercise));
    }

    public ExerciseDefinitionResponse archive(Long id, boolean archived) {
        ExerciseDefinition exercise = findEntity(id);
        exercise.setArchived(archived);
        exercise.setUpdatedAt(OffsetDateTime.now());
        return toResponse(repository.save(exercise));
    }

    public ExerciseDefinition findEntity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exercício não encontrado na biblioteca"));
    }

    private void apply(ExerciseDefinition item, ExerciseDefinitionRequest request) {
        item.setName(request.name().trim());
        item.setDescription(clean(request.description()));
        item.setPrimaryMuscleGroup(request.primaryMuscleGroup().trim());
        item.setSecondaryMuscleGroups(request.secondaryMuscleGroups() == null ? "" :
                String.join("|", request.secondaryMuscleGroups().stream().map(String::trim).filter(value -> !value.isBlank()).toList()));
        item.setEquipment(request.equipment().trim());
        item.setCategory(request.category());
        item.setDifficulty(request.difficulty().trim());
        item.setInstructions(clean(request.instructions()));
        item.setNotes(clean(request.notes()));
        item.setMediaUrl(clean(request.mediaUrl()));
        item.setUnilateral(request.unilateral());
        item.setTimed(request.timed());
    }

    private boolean matches(String value, String filter) {
        return filter == null || filter.isBlank() || normalize(value).contains(normalize(filter));
    }

    private String clean(String value) { return value == null ? "" : value.trim(); }

    public static String normalize(String value) {
        return Normalizer.normalize(value.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("\\s+", " ");
    }

    public ExerciseDefinitionResponse toResponse(ExerciseDefinition item) {
        List<String> secondary = item.getSecondaryMuscleGroups().isBlank() ? List.of()
                : Arrays.stream(item.getSecondaryMuscleGroups().split("\\|")).toList();
        return new ExerciseDefinitionResponse(
                item.getId(), item.getName(), item.getDescription(), item.getPrimaryMuscleGroup(), secondary,
                item.getEquipment(), item.getCategory(), item.getDifficulty(), item.getInstructions(),
                item.getNotes(), item.getMediaUrl(), item.isUnilateral(), item.isTimed(), item.isCustom(),
                item.isArchived(), item.getCreatedAt(), item.getUpdatedAt());
    }
}
