---
title: 7. Design Notification System
sidebar_position: 7
description: Complete system design for push, email, SMS notifications at scale - routing, templating, delivery.
keywords: [notification system, push notifications, email, sms, system design]
---

# Design Notification System

:::info Common Interview Topic
Notification systems test your understanding of **async processing**, **multi-channel delivery**, and **reliability at scale**. Great for demonstrating message queue expertise.
:::

## Step 1: Requirements (5 min)

### Functional Requirements

```text
Core Features:
1. Send notifications via multiple channels:
   - Push notifications (iOS, Android, Web)
   - Email
   - SMS
   - In-app notifications

2. Support different notification types:
   - Transactional (order confirmation, password reset)
   - Marketing (promotions, newsletters)
   - Triggered (new follower, new message)

3. User preferences:
   - Channel preferences per notification type
   - Opt-out/unsubscribe
   - Quiet hours

4. Templating system for consistent messaging

5. Delivery tracking and analytics
```

### Non-Functional Requirements

```text
1. High throughput: 10 million notifications/day
2. Reliable: Must not lose notifications
3. Near real-time: Transactional within seconds
4. Scalable: Handle traffic spikes (Black Friday)
5. Multi-region: Low latency globally
```

### Clarifying Questions

```text
Q: Priority levels?
A: Yes - critical (password reset), high (orders), normal (marketing)

Q: Rate limiting?
A: Yes - prevent spam (max 5 push/hour per user)

Q: Retry policy?
A: Yes - exponential backoff for failures

Q: Template management?
A: Yes - marketing team should manage templates
```

---

## Step 2: High-Level Design

### Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                   NOTIFICATION SYSTEM ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   TRIGGER SOURCES:                                                   │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                       │
│   │Order   │ │User    │ │Auth    │ │Cron    │                       │
│   │Service │ │Service │ │Service │ │Jobs    │                       │
│   └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘                       │
│       │          │          │          │                             │
│       └──────────┴──────────┴──────────┘                            │
│                         │                                            │
│                         ▼                                            │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                 NOTIFICATION API                             │   │
│   │  POST /api/v1/notifications/send                            │   │
│   │  {                                                          │   │
│   │    "user_id": "123",                                        │   │
│   │    "type": "order_confirmed",                               │   │
│   │    "data": { "order_id": "456", "total": "$99" }            │   │
│   │  }                                                          │   │
│   └────────────────────────┬────────────────────────────────────┘   │
│                            │                                         │
│                            ▼                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                VALIDATION & ROUTING                          │   │
│   │  1. Validate request                                        │   │
│   │  2. Check user preferences (opt-out?)                       │   │
│   │  3. Determine channels (push, email, sms)                   │   │
│   │  4. Check rate limits                                       │   │
│   │  5. Queue for processing                                    │   │
│   └────────────────────────┬────────────────────────────────────┘   │
│                            │                                         │
│                            ▼                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                   MESSAGE QUEUE (Kafka)                      │   │
│   │                                                              │   │
│   │  Topics: push-notifications, email-notifications, sms-notif │   │
│   │                                                              │   │
│   │  Partitioned by user_id for ordering                        │   │
│   │                                                              │   │
│   └────────┬────────────────┬────────────────┬──────────────────┘   │
│            │                │                │                       │
│            ▼                ▼                ▼                       │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│   │  PUSH        │  │  EMAIL       │  │  SMS         │             │
│   │  WORKERS     │  │  WORKERS     │  │  WORKERS     │             │
│   │              │  │              │  │              │             │
│   │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │             │
│   │  │Template│  │  │  │Template│  │  │  │Template│  │             │
│   │  │Engine  │  │  │  │Engine  │  │  │  │Engine  │  │             │
│   │  └────────┘  │  │  └────────┘  │  │  └────────┘  │             │
│   │      │       │  │      │       │  │      │       │             │
│   │      ▼       │  │      ▼       │  │      ▼       │             │
│   │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │             │
│   │  │Provider│  │  │  │Provider│  │  │  │Provider│  │             │
│   │  │ Client │  │  │  │ Client │  │  │  │ Client │  │             │
│   │  └────────┘  │  │  └────────┘  │  │  └────────┘  │             │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│          │                 │                 │                       │
│          ▼                 ▼                 ▼                       │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│   │   FCM/APNS   │  │   AWS SES    │  │   Twilio     │             │
│   │   (Push)     │  │   SendGrid   │  │   (SMS)      │             │
│   └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│   TRACKING:                                                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │           DELIVERY TRACKING DATABASE                         │   │
│   │   notification_id | status | sent_at | opened_at | clicked  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 3: Component Deep Dive

### Notification API

```java
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    
    @Autowired
    private NotificationService notificationService;
    
    @PostMapping("/send")
    public ResponseEntity<NotificationResponse> send(@RequestBody NotificationRequest request) {
        // 1. Validate request
        validateRequest(request);
        
        // 2. Create notification record
        Notification notification = notificationService.create(request);
        
        // 3. Queue for async processing
        notificationService.queue(notification);
        
        // 4. Return immediately (async processing)
        return ResponseEntity.accepted()
            .body(new NotificationResponse(notification.getId(), "queued"));
    }
}

public record NotificationRequest(
    String userId,
    String type,           // notification_type (e.g., "order_confirmed")
    Map<String, Object> data,  // template variables
    List<String> channels, // optional override (push, email, sms)
    String priority        // critical, high, normal, low
) {}
```

### User Preferences Service

```java
@Service
public class PreferencesService {
    
    @Autowired
    private UserPreferencesRepository repository;
    
    public ChannelConfig getChannels(String userId, String notificationType) {
        UserPreferences prefs = repository.findByUserId(userId);
        
        // Check if user has opted out entirely
        if (prefs.isGlobalOptOut()) {
            return ChannelConfig.none();
        }
        
        // Check notification-type specific preferences
        TypePreference typePref = prefs.getPreference(notificationType);
        if (typePref != null && !typePref.isEnabled()) {
            return ChannelConfig.none();
        }
        
        // Check quiet hours
        if (isQuietHours(prefs, notificationType)) {
            // Queue for later or skip non-critical
            return ChannelConfig.delayed();
        }
        
        // Return enabled channels
        return new ChannelConfig(
            typePref.isPushEnabled() && hasDeviceToken(userId),
            typePref.isEmailEnabled() && hasVerifiedEmail(userId),
            typePref.isSmsEnabled() && hasVerifiedPhone(userId)
        );
    }
}

public record ChannelConfig(
    boolean push,
    boolean email,
    boolean sms
) {
    public static ChannelConfig none() {
        return new ChannelConfig(false, false, false);
    }
}
```

### Message Routing

```java
@Service
public class NotificationRouter {
    
    @Autowired
    private KafkaTemplate<String, NotificationEvent> kafka;
    
    @Autowired
    private PreferencesService preferencesService;
    
    @Autowired
    private RateLimiter rateLimiter;
    
    public void route(Notification notification) {
        // 1. Get user's channel preferences
        ChannelConfig channels = preferencesService.getChannels(
            notification.getUserId(),
            notification.getType()
        );
        
        // 2. Check rate limits
        if (!rateLimiter.checkLimit(notification.getUserId(), notification.getType())) {
            // Rate limited - log and skip
            log.warn("Rate limited: user={}, type={}", 
                notification.getUserId(), notification.getType());
            return;
        }
        
        // 3. Route to appropriate channel queues
        if (channels.push()) {
            NotificationEvent event = new NotificationEvent(notification, "push");
            kafka.send("push-notifications", notification.getUserId(), event);
        }
        
        if (channels.email()) {
            NotificationEvent event = new NotificationEvent(notification, "email");
            kafka.send("email-notifications", notification.getUserId(), event);
        }
        
        if (channels.sms()) {
            NotificationEvent event = new NotificationEvent(notification, "sms");
            kafka.send("sms-notifications", notification.getUserId(), event);
        }
    }
}
```

---

## Step 4: Channel Workers

### Push Notification Worker

```java
@Component
public class PushWorker {
    
    @Autowired
    private DeviceTokenService deviceService;
    
    @Autowired
    private TemplateEngine templateEngine;
    
    @Autowired
    private FCMClient fcmClient;
    
    @Autowired
    private APNSClient apnsClient;
    
    @KafkaListener(topics = "push-notifications", groupId = "push-workers")
    public void process(NotificationEvent event) {
        try {
            // 1. Get user's device tokens
            List<DeviceToken> tokens = deviceService.getTokens(event.getUserId());
            
            if (tokens.isEmpty()) {
                log.warn("No device tokens for user: {}", event.getUserId());
                markFailed(event, "no_device_tokens");
                return;
            }
            
            // 2. Render notification content
            PushContent content = templateEngine.renderPush(
                event.getType(),
                event.getData()
            );
            
            // 3. Send to each device
            for (DeviceToken token : tokens) {
                try {
                    if (token.getPlatform() == Platform.IOS) {
                        apnsClient.send(token.getToken(), content);
                    } else if (token.getPlatform() == Platform.ANDROID) {
                        fcmClient.send(token.getToken(), content);
                    } else if (token.getPlatform() == Platform.WEB) {
                        fcmClient.sendWeb(token.getToken(), content);
                    }
                    
                    markDelivered(event, token);
                    
                } catch (InvalidTokenException e) {
                    // Token expired, remove it
                    deviceService.removeToken(token);
                } catch (Exception e) {
                    log.error("Failed to send push", e);
                    scheduleRetry(event, token);
                }
            }
            
        } catch (Exception e) {
            log.error("Push processing failed", e);
            scheduleRetry(event, null);
        }
    }
}

public record PushContent(
    String title,
    String body,
    String imageUrl,
    Map<String, String> data,  // custom data for app
    String action              // deep link
) {}
```

### Email Worker

```java
@Component
public class EmailWorker {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private TemplateEngine templateEngine;
    
    @Autowired
    private EmailProvider emailProvider; // SES, SendGrid, etc.
    
    @KafkaListener(topics = "email-notifications", groupId = "email-workers")
    public void process(NotificationEvent event) {
        try {
            // 1. Get user's email
            User user = userService.getById(event.getUserId());
            if (!user.isEmailVerified()) {
                markFailed(event, "email_not_verified");
                return;
            }
            
            // 2. Render email template
            EmailContent content = templateEngine.renderEmail(
                event.getType(),
                event.getData(),
                user.getLocale()
            );
            
            // 3. Send email
            String messageId = emailProvider.send(
                user.getEmail(),
                content.getSubject(),
                content.getHtmlBody(),
                content.getTextBody(),
                buildHeaders(event)
            );
            
            // 4. Track delivery
            markSent(event, messageId);
            
        } catch (Exception e) {
            log.error("Email processing failed", e);
            scheduleRetry(event);
        }
    }
    
    private Map<String, String> buildHeaders(NotificationEvent event) {
        return Map.of(
            "X-Notification-Id", event.getNotificationId(),
            "X-Notification-Type", event.getType(),
            "List-Unsubscribe", buildUnsubscribeUrl(event)
        );
    }
}
```

### SMS Worker

```java
@Component
public class SmsWorker {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private TemplateEngine templateEngine;
    
    @Autowired
    private TwilioClient twilioClient;
    
    @KafkaListener(topics = "sms-notifications", groupId = "sms-workers")
    public void process(NotificationEvent event) {
        try {
            // 1. Get user's phone number
            User user = userService.getById(event.getUserId());
            if (!user.isPhoneVerified()) {
                markFailed(event, "phone_not_verified");
                return;
            }
            
            // 2. Render SMS template (keep short!)
            String smsBody = templateEngine.renderSms(
                event.getType(),
                event.getData()
            );
            
            // 3. Validate SMS length
            if (smsBody.length() > 160) {
                log.warn("SMS too long, truncating: {}", smsBody.length());
                smsBody = smsBody.substring(0, 157) + "...";
            }
            
            // 4. Send SMS
            String messageId = twilioClient.send(
                user.getPhoneNumber(),
                smsBody
            );
            
            // 5. Track (SMS is expensive, track costs)
            markSent(event, messageId, calculateCost(user.getPhoneNumber()));
            
        } catch (Exception e) {
            log.error("SMS processing failed", e);
            scheduleRetry(event);
        }
    }
}
```

---

## Step 5: Template System

### Template Management

```text
TEMPLATE STRUCTURE:
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  templates/                                                          │
│  ├── order_confirmed/                                               │
│  │   ├── push.json                                                  │
│  │   ├── email.html                                                 │
│  │   ├── email.txt                                                  │
│  │   └── sms.txt                                                    │
│  ├── password_reset/                                                │
│  │   └── ...                                                        │
│  └── new_follower/                                                  │
│      └── ...                                                        │
│                                                                      │
│  LOCALIZATION:                                                       │
│  templates/                                                          │
│  ├── order_confirmed/                                               │
│  │   ├── email.en.html                                              │
│  │   ├── email.es.html                                              │
│  │   ├── email.fr.html                                              │
│  │   └── ...                                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Template Examples

```json
// push.json
{
  "title": "Order Confirmed! 🎉",
  "body": "Your order #{{order_id}} for {{total}} is confirmed.",
  "image": "{{product_image}}",
  "action": "myapp://orders/{{order_id}}"
}
```

```html
<!-- email.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Order Confirmed</title>
</head>
<body>
  <h1>Thanks for your order, {{user_name}}!</h1>
  <p>Your order <strong>#{{order_id}}</strong> has been confirmed.</p>
  
  <table>
    {{#each items}}
    <tr>
      <td>{{this.name}}</td>
      <td>{{this.quantity}}</td>
      <td>{{this.price}}</td>
    </tr>
    {{/each}}
  </table>
  
  <p><strong>Total: {{total}}</strong></p>
  
  <a href="{{tracking_url}}">Track Your Order</a>
</body>
</html>
```

```text
<!-- sms.txt -->
Order #{{order_id}} confirmed! Total: {{total}}. Track: {{short_tracking_url}}
```

### Template Engine

```java
@Service
public class TemplateEngine {
    
    @Autowired
    private TemplateRepository templateRepository;
    
    @Autowired
    private Handlebars handlebars;  // or Mustache, Thymeleaf
    
    @Cacheable("templates")
    public Template getTemplate(String type, String channel, String locale) {
        // Try locale-specific first
        Template template = templateRepository.find(type, channel, locale);
        if (template == null) {
            // Fall back to default locale
            template = templateRepository.find(type, channel, "en");
        }
        return template;
    }
    
    public PushContent renderPush(String type, Map<String, Object> data) {
        Template template = getTemplate(type, "push", "en");
        
        return new PushContent(
            render(template.getTitle(), data),
            render(template.getBody(), data),
            render(template.getImage(), data),
            template.getData(),
            render(template.getAction(), data)
        );
    }
    
    public EmailContent renderEmail(String type, Map<String, Object> data, String locale) {
        Template template = getTemplate(type, "email", locale);
        
        return new EmailContent(
            render(template.getSubject(), data),
            render(template.getHtmlBody(), data),
            render(template.getTextBody(), data)
        );
    }
    
    private String render(String template, Map<String, Object> data) {
        return handlebars.compileInline(template).apply(data);
    }
}
```

---

## Step 6: Reliability & Retry

### Retry Strategy

```text
RETRY CONFIGURATION:
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Priority     Max Retries    Delays                                 │
│  ─────────    ──────────     ──────                                 │
│  Critical     10             1s, 5s, 30s, 1m, 5m, 15m, 30m, 1h...   │
│  High         5              5s, 30s, 5m, 30m, 2h                   │
│  Normal       3              30s, 5m, 30m                           │
│  Low          2              5m, 1h                                  │
│                                                                      │
│  FAIL CONDITIONS (no retry):                                        │
│  - Invalid email address                                            │
│  - User opted out                                                   │
│  - Invalid phone number                                             │
│  - Expired device token                                             │
│                                                                      │
│  RETRY CONDITIONS:                                                   │
│  - Network timeout                                                  │
│  - Provider rate limit (429)                                        │
│  - Server error (5xx)                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```java
@Component
public class RetryHandler {
    
    @Autowired
    private KafkaTemplate<String, RetryEvent> kafka;
    
    private static final Map<String, int[]> RETRY_DELAYS = Map.of(
        "critical", new int[]{1, 5, 30, 60, 300, 900, 1800, 3600},
        "high", new int[]{5, 30, 300, 1800, 7200},
        "normal", new int[]{30, 300, 1800},
        "low", new int[]{300, 3600}
    );
    
    public void scheduleRetry(NotificationEvent event, Exception error) {
        int attempt = event.getRetryCount() + 1;
        int[] delays = RETRY_DELAYS.get(event.getPriority());
        
        if (attempt >= delays.length) {
            // Max retries reached
            markFailed(event, "max_retries_exceeded", error.getMessage());
            alertOnFailure(event);
            return;
        }
        
        int delaySeconds = delays[attempt];
        long executeAt = System.currentTimeMillis() + (delaySeconds * 1000);
        
        RetryEvent retry = new RetryEvent(
            event,
            attempt,
            executeAt,
            error.getClass().getSimpleName()
        );
        
        // Send to retry topic (delayed queue)
        kafka.send("notification-retries", retry);
    }
}
```

### Dead Letter Queue

```java
@Component
public class DeadLetterHandler {
    
    @KafkaListener(topics = "notification-dlq", groupId = "dlq-processor")
    public void handleDeadLetter(NotificationEvent event) {
        // Log for investigation
        log.error("Notification failed permanently: id={}, type={}, user={}, error={}",
            event.getNotificationId(),
            event.getType(),
            event.getUserId(),
            event.getLastError());
        
        // Store in failed notifications table
        failedNotificationRepository.save(new FailedNotification(event));
        
        // Alert operations team for critical notifications
        if ("critical".equals(event.getPriority())) {
            alertService.sendSlackAlert(
                "#notifications-alerts",
                "Critical notification failed: " + event.getNotificationId()
            );
        }
    }
}
```

---

## Step 7: Database Schema

```sql
-- Notifications table (audit log)
CREATE TABLE notifications (
    id              UUID PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    type            VARCHAR(50) NOT NULL,
    priority        VARCHAR(20) NOT NULL,
    data            JSONB,
    created_at      TIMESTAMP NOT NULL,
    
    INDEX idx_user_created (user_id, created_at)
);

-- Delivery tracking per channel
CREATE TABLE notification_deliveries (
    id              UUID PRIMARY KEY,
    notification_id UUID REFERENCES notifications(id),
    channel         VARCHAR(20) NOT NULL,  -- push, email, sms
    status          VARCHAR(20) NOT NULL,  -- pending, sent, delivered, failed
    provider_id     VARCHAR(100),          -- external message ID
    sent_at         TIMESTAMP,
    delivered_at    TIMESTAMP,
    opened_at       TIMESTAMP,
    clicked_at      TIMESTAMP,
    error_message   TEXT,
    retry_count     INT DEFAULT 0,
    
    INDEX idx_notification (notification_id),
    INDEX idx_status (status, channel)
);

-- User preferences
CREATE TABLE notification_preferences (
    user_id         BIGINT PRIMARY KEY,
    global_opt_out  BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end   TIME,
    timezone        VARCHAR(50),
    updated_at      TIMESTAMP
);

-- Per-type preferences
CREATE TABLE notification_type_preferences (
    user_id         BIGINT,
    notification_type VARCHAR(50),
    enabled         BOOLEAN DEFAULT TRUE,
    push_enabled    BOOLEAN DEFAULT TRUE,
    email_enabled   BOOLEAN DEFAULT TRUE,
    sms_enabled     BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, notification_type)
);

-- Device tokens
CREATE TABLE device_tokens (
    id              UUID PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    token           VARCHAR(500) NOT NULL UNIQUE,
    platform        VARCHAR(20) NOT NULL,  -- ios, android, web
    device_name     VARCHAR(100),
    created_at      TIMESTAMP,
    last_used_at    TIMESTAMP,
    
    INDEX idx_user (user_id)
);
```

---

## Step 8: Scaling Considerations

### High Throughput Events

```text
PROBLEM: Flash sales, breaking news = millions of notifications at once

SOLUTIONS:

1. QUEUE PARTITIONING
   - Partition by user_id for ordering
   - Allows parallel processing
   - 100 partitions = 100x throughput

2. PRIORITY QUEUES
   - Separate topics for priority levels
   - Critical notifications skip the line
   - Marketing can be delayed during spikes

3. RATE LIMITING TO PROVIDERS
   - FCM: 500 msg/sec (can request increase)
   - AWS SES: 50 emails/sec (can increase)
   - Twilio: Varies by plan
   - Implement provider-level rate limiting

4. BATCHING
   - FCM supports batch of 500 devices
   - SES supports batch of 50 emails
   - Reduces API calls significantly
```

### Multi-Region Deployment

```text
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   US Region                          EU Region                       │
│   ──────────                         ──────────                      │
│   ┌───────────────┐                  ┌───────────────┐              │
│   │ Notification  │                  │ Notification  │              │
│   │ API           │                  │ API           │              │
│   └───────┬───────┘                  └───────┬───────┘              │
│           │                                  │                       │
│           ▼                                  ▼                       │
│   ┌───────────────┐                  ┌───────────────┐              │
│   │ Kafka Cluster │  ◄─── sync ───▶  │ Kafka Cluster │              │
│   └───────────────┘                  └───────────────┘              │
│           │                                  │                       │
│           ▼                                  ▼                       │
│   ┌───────────────┐                  ┌───────────────┐              │
│   │   Workers     │                  │   Workers     │              │
│   └───────────────┘                  └───────────────┘              │
│           │                                  │                       │
│           ▼                                  ▼                       │
│   ┌───────────────┐                  ┌───────────────┐              │
│   │   Providers   │                  │   Providers   │              │
│   │   (US)        │                  │   (EU)        │              │
│   └───────────────┘                  └───────────────┘              │
│                                                                      │
│   - Route users to nearest region                                   │
│   - Use regional provider endpoints                                 │
│   - Reduces latency by 100ms+                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complete Notification Flow

```text
1. SERVICE TRIGGERS NOTIFICATION
   Order Service → POST /notifications/send
   
2. VALIDATION & ROUTING
   - Validate request
   - Check user preferences
   - Determine enabled channels
   - Check rate limits
   - Create notification record
   
3. QUEUE TO CHANNELS
   - Publish to push-notifications topic
   - Publish to email-notifications topic
   - Publish to sms-notifications topic
   
4. WORKER PROCESSING
   - Consume from queue
   - Fetch template
   - Render content
   - Call provider API
   - Handle success/failure
   
5. DELIVERY TRACKING
   - Update delivery status
   - Track opens/clicks (via webhooks)
   - Retry failures
   - Move to DLQ after max retries
   
6. ANALYTICS
   - Aggregate delivery rates
   - Track open rates, click rates
   - Monitor by notification type
```

---

## Interview Tips

```text
✅ Start with different notification channels
✅ Emphasize async processing (queues are key)
✅ Cover user preferences early
✅ Discuss reliability and retries
✅ Mention rate limiting at multiple levels
✅ Talk about template management

❌ Don't forget about user opt-out
❌ Don't ignore provider rate limits
❌ Don't skip delivery tracking
```

---

**Next:** [8. Design Distributed Cache →](./distributed-cache)
