package com.trainingapp.integration.wger.service;

public record WgerSyncError(String externalId, String stage, String message) {}
