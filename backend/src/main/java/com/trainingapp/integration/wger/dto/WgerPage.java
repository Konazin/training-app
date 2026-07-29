package com.trainingapp.integration.wger.dto;

import java.util.List;

public record WgerPage<T>(long count, String next, String previous, List<T> results) {}
