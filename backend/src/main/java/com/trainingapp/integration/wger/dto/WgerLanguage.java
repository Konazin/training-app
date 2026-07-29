package com.trainingapp.integration.wger.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WgerLanguage(
        Integer id,
        @JsonProperty("short_name") String shortName
) {}
