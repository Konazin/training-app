package com.trainingapp.integration.ai.service;

import java.util.Map;

/** One prompt per task makes behavioral changes auditable. Domain values remain authoritative. */
final class AiPrompts {
    static final String MEAL_PARSE_V1 = """
            Você interpreta refeições em português. Extraia somente alimentos, quantidade e unidade (g, ml ou unit).
            Não calcule calorias, macros ou micronutrientes. Quantidade desconhecida deve ser null. Retorne somente JSON do schema.
            """;
    static final String MEAL_VISION_V1 = """
            Você identifica somente alimentos visíveis ou fortemente sustentados pela dica do usuário. A dica explícita prevalece.
            Não invente ingredientes ocultos, óleo, açúcar, molho ou quantidades invisíveis. Marque estimativas e incertezas.
            Não calcule calorias, macros ou micronutrientes. Retorne somente JSON do schema.
            """;
    static final String DIET_PLAN_V1 = """
            Você propõe um rascunho de refeições. Metas nutricionais recebidas são autoritativas: não as altere nem invente composição nutricional.
            Respeite alergias, restrições, orçamento e dificuldades práticas. Se não for possível, informe incompatibilidades.
            Não diagnostique. Retorne somente JSON do schema; o app resolve alimentos e calcula nutrientes depois.
            """;
    static final String TRAINING_PLAN_V1 = """
            Você propõe um rascunho de treino usando exclusivamente exerciseId da lista de candidatos. Restrições profissionais são obrigatórias.
            Não diagnostique, não recomende treinar através da dor, não persista nada e não use exercícios fora da lista.
            Retorne somente JSON do schema.
            """;

    static String forTask(String task) {
        return switch (task) {
            case "meal-parse" -> MEAL_PARSE_V1;
            case "meal-vision" -> MEAL_VISION_V1;
            case "diet-plan" -> DIET_PLAN_V1;
            case "training-plan" -> TRAINING_PLAN_V1;
            default -> throw new IllegalArgumentException("Tarefa de IA inválida.");
        };
    }

    static Map<String, Object> schemaFor(String task) {
        return switch (task) {
            case "meal-parse" -> Map.of("type", "OBJECT", "properties", Map.of("items", foodItems()), "required", new String[]{"items"});
            case "meal-vision" -> Map.of("type", "OBJECT", "properties", Map.of("items", visionItems(), "uncertainties", stringArray()), "required", new String[]{"items", "uncertainties"});
            case "diet-plan" -> Map.of("type", "OBJECT", "properties", Map.of("meals", Map.of("type", "ARRAY"), "incompatibilities", stringArray()), "required", new String[]{"meals", "incompatibilities"});
            case "training-plan" -> Map.of("type", "OBJECT", "properties", Map.of("days", Map.of("type", "ARRAY"), "incompatibilities", stringArray()), "required", new String[]{"days", "incompatibilities"});
            default -> throw new IllegalArgumentException("Tarefa de IA inválida.");
        };
    }
    private static Map<String, Object> foodItems() { return Map.of("type", "ARRAY", "items", Map.of("type", "OBJECT", "properties", Map.of("query", Map.of("type", "STRING"), "quantity", Map.of("type", "NUMBER", "nullable", true), "unit", Map.of("type", "STRING", "nullable", true)), "required", new String[]{"query", "quantity", "unit"})); }
    private static Map<String, Object> visionItems() { return Map.of("type", "ARRAY", "items", Map.of("type", "OBJECT", "properties", Map.of("query", Map.of("type", "STRING"), "quantity", Map.of("type", "NUMBER", "nullable", true), "unit", Map.of("type", "STRING", "nullable", true), "confidence", Map.of("type", "NUMBER"), "estimated", Map.of("type", "BOOLEAN")), "required", new String[]{"query", "quantity", "unit", "confidence", "estimated"})); }
    private static Map<String, Object> stringArray() { return Map.of("type", "ARRAY", "items", Map.of("type", "STRING")); }
}
