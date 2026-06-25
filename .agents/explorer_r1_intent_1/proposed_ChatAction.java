package com.akilliorganizasyon.chatbot.domain;

import com.akilliorganizasyon.shared.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * A proposed action derived from chat intent. High-impact actions
 * ({@code requiresApproval = true}) must not auto-execute; low-impact actions
 * require an explicit typed executor.
 */
@Entity
@Table(name = "chat_actions")
@Getter
@Setter
public class ChatAction extends BaseEntity {

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "message_id")
    private UUID messageId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 60)
    private ActionType actionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> payload = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ActionStatus status = ActionStatus.PROPOSED;

    @Column(name = "requires_approval", nullable = false)
    private boolean requiresApproval = false;

    public String getParameterSchema() {
        return actionType != null ? actionType.getParameterSchema() : null;
    }

    public String getRequiredCapabilityType() {
        return actionType != null ? actionType.getRequiredCapabilityType() : null;
    }

    public String getRequiredCapabilityTarget() {
        return actionType != null ? actionType.getRequiredCapabilityTarget() : null;
    }

    public String getRequiredCapabilityAction() {
        return actionType != null ? actionType.getRequiredCapabilityAction() : null;
    }
}
