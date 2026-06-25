package com.akilliorganizasyon.chatbot.domain;

/**
 * High-level intent categories that the chatbot can propose. High-impact
 * actions remain approval-only; a small set of low-impact actions may have
 * explicit typed executors.
 */
public enum ActionType {
    REPORT_REQUEST(
        "{\"type\":\"object\",\"properties\":{\"reportId\":{\"type\":\"string\"},\"parameters\":{\"type\":\"object\"}},\"required\":[\"reportId\"]}",
        "ACTION",
        "REPORT_REQUEST",
        "EXECUTE"
    ),
    ACCESS_REQUEST(
        "{\"type\":\"object\",\"properties\":{\"resource\":{\"type\":\"string\"},\"role\":{\"type\":\"string\"}},\"required\":[\"resource\"]}",
        "ACTION",
        "ACCESS_REQUEST",
        "EXECUTE"
    ),
    TASK_CREATE(
        "{\"type\":\"object\",\"properties\":{\"title\":{\"type\":\"string\"},\"description\":{\"type\":\"string\"},\"priority\":{\"type\":\"string\"},\"dueDate\":{\"type\":\"string\"}},\"required\":[\"title\"]}",
        "ACTION",
        "TASK_CREATE",
        "EXECUTE"
    ),
    AGENT_TASK(
        "{\"type\":\"object\",\"properties\":{\"agentId\":{\"type\":\"string\"},\"prompt\":{\"type\":\"string\"}},\"required\":[\"agentId\",\"prompt\"]}",
        "ACTION",
        "AGENT_TASK",
        "EXECUTE"
    ),
    NOTIFY(
        "{\"type\":\"object\",\"properties\":{\"message\":{\"type\":\"string\"},\"target\":{\"type\":\"string\"}},\"required\":[\"message\"]}",
        "ACTION",
        "NOTIFY",
        "EXECUTE"
    );

    private final String parameterSchema;
    private final String requiredCapabilityType;
    private final String requiredCapabilityTarget;
    private final String requiredCapabilityAction;

    ActionType(String parameterSchema, String requiredCapabilityType, String requiredCapabilityTarget, String requiredCapabilityAction) {
        this.parameterSchema = parameterSchema;
        this.requiredCapabilityType = requiredCapabilityType;
        this.requiredCapabilityTarget = requiredCapabilityTarget;
        this.requiredCapabilityAction = requiredCapabilityAction;
    }

    public String getParameterSchema() {
        return parameterSchema;
    }

    public String getRequiredCapabilityType() {
        return requiredCapabilityType;
    }

    public String getRequiredCapabilityTarget() {
        return requiredCapabilityTarget;
    }

    public String getRequiredCapabilityAction() {
        return requiredCapabilityAction;
    }
}
