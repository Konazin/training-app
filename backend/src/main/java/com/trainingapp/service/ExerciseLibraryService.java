package com.trainingapp.service;

import com.trainingapp.dto.ExerciseDefinitionRequest;
import com.trainingapp.dto.ExerciseDefinitionResponse;
import com.trainingapp.dto.ExerciseMediaResponse;
import com.trainingapp.dto.PageResponse;
import com.trainingapp.exception.ResourceNotFoundException;
import com.trainingapp.model.ExerciseDefinition;
import com.trainingapp.model.ExerciseMedia;
import com.trainingapp.model.ExerciseMediaType;
import com.trainingapp.model.ExerciseSource;
import com.trainingapp.repository.ExerciseDefinitionRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class ExerciseLibraryService {
    private final ExerciseDefinitionRepository repository;

    public ExerciseLibraryService(ExerciseDefinitionRepository repository) {
        this.repository = repository;
    }

    public PageResponse<ExerciseDefinitionResponse> findAll(
            int page, int size, String query, String muscle, String equipment, String category,
            ExerciseSource source, Boolean hasVideo, boolean includeArchived
    ) {
        Specification<ExerciseDefinition> spec = (root, ignored, cb) -> includeArchived
                ? cb.conjunction() : cb.isFalse(root.get("archived"));
        if (query != null && !query.isBlank()) {
            spec = spec.and((root, ignored, cb) -> cb.like(root.get("normalizedName"), "%" + normalize(query) + "%"));
        }
        if (muscle != null && !muscle.isBlank()) {
            spec = spec.and((root, ignored, cb) -> cb.like(cb.lower(root.get("primaryMuscleGroup")), "%" + muscle.toLowerCase(Locale.ROOT) + "%"));
        }
        if (equipment != null && !equipment.isBlank()) {
            spec = spec.and((root, ignored, cb) -> cb.like(cb.lower(root.get("equipment")), "%" + equipment.toLowerCase(Locale.ROOT) + "%"));
        }
        if (category != null && !category.isBlank()) {
            spec = spec.and((root, ignored, cb) -> cb.equal(root.get("category"), com.trainingapp.model.ExerciseCategory.valueOf(category.toUpperCase(Locale.ROOT))));
        }
        if (source != null) spec = spec.and((root, ignored, cb) -> cb.equal(root.get("source"), source));
        if (hasVideo != null) {
            spec = spec.and((root, queryObject, cb) -> {
                var media = queryObject.subquery(Long.class);
                var mediaRoot = media.from(ExerciseMedia.class);
                media.select(cb.literal(1L)).where(
                        cb.equal(mediaRoot.get("exerciseDefinition"), root),
                        cb.equal(mediaRoot.get("type"), ExerciseMediaType.VIDEO));
                return hasVideo ? cb.exists(media) : cb.not(cb.exists(media));
            });
        }
        var result = repository.findAll(spec,
                PageRequest.of(Math.max(0, page), Math.min(Math.max(size, 1), 100), Sort.by("name").ascending()));
        List<Long> ids = result.getContent().stream().map(ExerciseDefinition::getId).toList();
        Map<Long, ExerciseDefinition> withMedia = ids.isEmpty() ? Map.of()
                : repository.findAllWithMediaByIdIn(ids).stream()
                .collect(Collectors.toMap(ExerciseDefinition::getId, Function.identity()));
        List<ExerciseDefinitionResponse> content = ids.stream()
                .map(withMedia::get)
                .map(this::toResponse)
                .toList();
        return new PageResponse<>(
                content, result.getNumber(), result.getSize(), result.getTotalElements(),
                result.getTotalPages(), result.isFirst(), result.isLast()
        );
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
        exercise.setSource(ExerciseSource.CUSTOM);
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
                    exercise.setSource(ExerciseSource.SYSTEM);
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

    private String clean(String value) { return value == null ? "" : value.trim(); }

    public static String normalize(String value) {
        return Normalizer.normalize(value.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("\\s+", " ");
    }

    public ExerciseDefinitionResponse toResponse(ExerciseDefinition item) {
        List<String> secondary = item.getSecondaryMuscleGroups().isBlank() ? List.of()
                : Arrays.stream(item.getSecondaryMuscleGroups().split("\\|")).toList();
        List<ExerciseMediaResponse> media = item.getMedia().stream().map(this::toMediaResponse).toList();
        String primaryVideo = primary(item.getMedia(), ExerciseMediaType.VIDEO);
        String primaryImage = primary(item.getMedia(), ExerciseMediaType.IMAGE);
        return new ExerciseDefinitionResponse(
                item.getId(), item.getName(), item.getDescription(), item.getPrimaryMuscleGroup(), secondary,
                item.getEquipment(), item.getCategory(), item.getDifficulty(), item.getInstructions(),
                item.getNotes(), item.getMediaUrl(), item.getSource(), item.getExternalId(), item.getSourceUrl(),
                item.getLicenseName(), item.getLicenseUrl(), item.getAuthor(), media, primaryVideo != null,
                primaryVideo, primaryImage, item.isUnilateral(), item.isTimed(), item.isCustom(),
                item.isArchived(), item.getCreatedAt(), item.getUpdatedAt());
    }

    private String primary(List<ExerciseMedia> media, ExerciseMediaType type) {
        return media.stream().filter(item -> item.getType() == type && item.isMain()).findFirst()
                .or(() -> media.stream().filter(item -> item.getType() == type).findFirst())
                .map(ExerciseMedia::getUrl).orElse(null);
    }

    private ExerciseMediaResponse toMediaResponse(ExerciseMedia item) {
        return new ExerciseMediaResponse(item.getId(), item.getType(), item.getSource(), item.getUrl(),
                item.getThumbnailUrl(), item.getMimeType(), item.getWidth(), item.getHeight(),
                item.getDurationSeconds(), item.isMain(), item.getLicenseName(), item.getLicenseUrl(),
                item.getAuthor(), item.getSourceUrl());
    }
}
