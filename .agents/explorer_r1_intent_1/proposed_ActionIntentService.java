package com.akilliorganizasyon.chatbot.service;

import com.akilliorganizasyon.chatbot.domain.ActionStatus;
import com.akilliorganizasyon.chatbot.domain.ActionType;
import com.akilliorganizasyon.chatbot.domain.ChatAction;
import com.akilliorganizasyon.chatbot.repository.ChatActionRepository;
import com.akilliorganizasyon.shared.ai.AiChatService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * LLM/Spring AI-based intent detection. Replaces static keyword matching.
 * Parses user message into typed fields matching ActionType parameter schemas.
 */
@Slf4j
@Service
public class ActionIntentService {

    private static final Set<ActionType> HIGH_IMPACT =
            Set.of(ActionType.ACCESS_REQUEST);

    private final ChatActionRepository chatActionRepository;
    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;

    public ActionIntentService(ChatActionRepository chatActionRepository,
                               AiChatService aiChatService,
                               ObjectMapper objectMapper) {
        this.chatActionRepository = chatActionRepository;
        this.aiChatService = aiChatService;
        this.objectMapper = objectMapper;
    }

    /**
     * Detects an intent in the user content using LLM (Spring AI) and, when found, persists
     * a PROPOSED action. Returns the saved action or empty when no intent matched.
     * Heuristic keyword-based matching is fully removed.
     */
    public Optional<ChatAction> detectAndPropose(UUID conversationId, UUID messageId, String userContent) {
        if (userContent == null || userContent.isBlank()) {
            return Optional.empty();
        }
        if (!aiChatService.isEnabled()) {
            log.warn("AiChatService is disabled; skipping intent detection.");
            return Optional.empty();
        }

        try {
            // Build action parameter schemas dynamically from the enum definition
            StringBuilder actionInfo = new StringBuilder();
            for (ActionType type : ActionType.values()) {
                actionInfo.append("- ").append(type.name())
                        .append("\n  Parameter Schema: ").append(type.getParameterSchema())
                        .append("\n");
            }

            String systemPrompt = """
                You are a highly accurate intent detection assistant. Analyze the user's message and determine if it represents a request to perform one of the following system actions:
                
                [AVAILABLE ACTIONS]
                %s
                
                Your objective is to:
                1. Detect if the user's request maps to one of the ActionTypes listed above.
                2. If it maps, extract the parameter values from the user's message conforming exactly to the parameters JSON schema of that action.
                
                Respond ONLY with a JSON object in the following format:
                {
                  "matched": true,
                  "actionType": "ACTION_TYPE_NAME",
                  "payload": { ... extracted fields ... }
                }
                
                If no action is requested, respond ONLY with:
                {
                  "matched": false
                }
                
                Rules:
                - Do not make up parameter values. Only extract what is present or clearly implied.
                - For dates (like task dueDate), parse them relative to current time 2026-06-19T15:20:46+03:00. Output ISO-8601 strings (e.g., 2026-06-08T09:00:00Z).
                - For TASK_CREATE priority, map it to LOW, MEDIUM, or HIGH, defaulting to MEDIUM.
                - Output MUST be a single raw JSON object. Do not include markdown code blocks like ```json ... ``` or any explanatory notes.
                """.formatted(actionInfo.toString());

            String response = aiChatService.complete(systemPrompt, userContent);
            if (response == null || response.isBlank()) {
                return Optional.empty();
            }

            String json = response.trim();
            if (json.startsWith("```")) {
                int firstNewLine = json.indexOf('\n');
                int lastBackticks = json.lastIndexOf("```");
                if (firstNewLine != -1 && lastBackticks > firstNewLine) {
                    json = json.substring(firstNewLine, lastBackticks).trim();
                }
            }
            if (json.startsWith("json")) {
                json = json.substring(4).trim();
            }

            IntentResult result = objectMapper.readValue(json, IntentResult.class);
            if (result == null || !result.matched() || result.actionType() == null) {
                return Optional.empty();
            }

            ChatAction action = new ChatAction();
            action.setConversationId(conversationId);
            action.setMessageId(messageId);
            action.setActionType(result.actionType());
            action.setStatus(ActionStatus.PROPOSED);
            action.setRequiresApproval(HIGH_IMPACT.contains(result.actionType()));

            // Payload structure setup
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("source", "intent-llm");
            payload.put("snippet", snippet(userContent));
            payload.put("note", noteFor(result.actionType()));

            if (result.payload() != null) {
                if (result.actionType() == ActionType.TASK_CREATE) {
                    // Structure the task payload exactly as expected by TaskCreateChatActionExecutor
                    Map<String, Object> taskMap = new LinkedHashMap<>();
                    Object titleObj = result.payload().get("title");
                    if (titleObj == null) {
                        titleObj = result.payload().get("taskTitle");
                    }
                    taskMap.put("title", titleObj != null ? titleObj.toString() : snippet(userContent));
                    taskMap.put("description", result.payload().getOrDefault("description", snippet(userContent)));
                    taskMap.put("priority", result.payload().getOrDefault("priority", "MEDIUM"));
                    if (result.payload().containsKey("dueDate")) {
                        taskMap.put("dueDate", result.payload().get("dueDate"));
                    }
                    if (result.payload().containsKey("assigneeId")) {
                        taskMap.put("assigneeId", result.payload().get("assigneeId"));
                    }
                    payload.put("task", taskMap);
                } else {
                    payload.putAll(result.payload());
                }
            }

            action.setPayload(payload);
            return Optional.of(chatActionRepository.save(action));

        } catch (Exception e) {
            log.error("Failed to detect intent using LLM", e);
            return Optional.empty();
        }
    }

    private String snippet(String content) {
        String trimmed = content.trim();
        return trimmed.length() > 240 ? trimmed.substring(0, 240) + "…" : trimmed;
    }

    private String noteFor(ActionType type) {
        if (type == ActionType.TASK_CREATE) {
            return "Önerilen görev oluşturma aksiyonu — onaylanırsa güvenli görev kaydı açılır.";
        }
        return "Önerilen aksiyon — başka modüller otomatik çağrılmaz.";
    }

    private record IntentResult(
            boolean matched,
            ActionType actionType,
            Map<String, Object> payload
    ) {}
}
