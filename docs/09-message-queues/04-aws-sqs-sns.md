---
title: 4. AWS SQS & SNS
sidebar_position: 4
description: Master AWS SQS and SNS - Standard vs FIFO queues, fan-out pattern, long polling, visibility timeout for backend interviews.
keywords: [aws sqs, aws sns, fifo queue, fan-out, serverless, visibility timeout, long polling]
---

# AWS SQS & SNS

:::info Interview Importance ⭐⭐⭐⭐
AWS SQS and SNS are widely used in cloud-native and serverless architectures. Understanding their characteristics and patterns is essential for system design interviews.
:::

## 1. AWS SQS Overview

### What is SQS?

```text
SQS = Simple Queue Service
    = Fully managed message queue
    = No infrastructure to manage
    = Scales automatically

┌─────────────────────────────────────────────────────────────────────┐
│                         SQS BASICS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Producer ──send──→ [ SQS Queue ] ──receive──→ Consumer            │
│                           │                                          │
│                 Characteristics:                                     │
│                 • At-least-once delivery                            │
│                 • No ordering (Standard)                            │
│                 • Unlimited throughput (Standard)                   │
│                 • Message retention: 1 min to 14 days               │
│                 • Max message size: 256 KB                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Standard vs FIFO Queues

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    STANDARD vs FIFO                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ STANDARD QUEUE:                                                      │
│ ────────────────                                                     │
│ • Best-effort ordering (may be out of order)                        │
│ • At-least-once delivery (duplicates possible)                      │
│ • Unlimited throughput                                              │
│ • Use: High volume, order doesn't matter                            │
│                                                                      │
│   Producer: 1, 2, 3, 4, 5                                           │
│   Consumer: 2, 1, 4, 3, 5, 3 (duplicate!)                           │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ FIFO QUEUE:                                                          │
│ ────────────                                                         │
│ • Strict ordering (First-In-First-Out)                              │
│ • Exactly-once processing                                           │
│ • 300 TPS (3000 with batching)                                      │
│ • Use: Order matters, no duplicates allowed                         │
│ • Name must end in .fifo                                            │
│                                                                      │
│   Producer: 1, 2, 3, 4, 5                                           │
│   Consumer: 1, 2, 3, 4, 5 (guaranteed order!)                       │
│                                                                      │
│ Message Group ID: Ordering within a group                           │
│   Group A: 1, 2, 3 (ordered)                                        │
│   Group B: 1, 2, 3 (ordered, parallel with Group A)                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. SQS Key Concepts

### Visibility Timeout

```text
VISIBILITY TIMEOUT: Message hidden during processing

Timeline:
─────────────────────────────────────────────────────────────────────
0s                          30s                               60s
│                            │                                 │
│    Message received        │   Visibility timeout expires    │
│    by Consumer A           │                                 │
│    ↓                       │                                 │
│    [Processing...]         │                                 │
│                            │                                 │
│    If NOT deleted by 30s:  │                                 │
│                            ↓                                 │
│              Message becomes visible again                   │
│              Consumer B can receive it                       │
│                                                              │
─────────────────────────────────────────────────────────────────────

Default: 30 seconds
Maximum: 12 hours

BEST PRACTICE:
• Set visibility timeout > expected processing time
• Use ChangeMessageVisibility if you need more time
• Delete message AFTER successful processing
```

### Long Polling

```text
SHORT POLLING (Default):
• Returns immediately (even if empty)
• Costs money (each request charged)
• May get empty responses

    Consumer ──→ SQS ──→ Empty response
    Consumer ──→ SQS ──→ Empty response
    Consumer ──→ SQS ──→ Message! (finally)

LONG POLLING:
• Waits up to 20 seconds for messages
• Reduces empty responses
• Saves money
• Reduces latency

    Consumer ──→ SQS [waiting...] ──→ Message arrives ──→ Response

Enable: Set ReceiveMessageWaitTimeSeconds > 0 (max 20)
```

### Message Lifecycle

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    MESSAGE LIFECYCLE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. SEND                                                             │
│     Producer sends message → Queue                                   │
│     Message gets: MessageId, ReceiptHandle                          │
│                                                                      │
│  2. RECEIVE                                                          │
│     Consumer calls ReceiveMessage                                    │
│     Message becomes invisible (visibility timeout starts)           │
│     Consumer gets message body + ReceiptHandle                      │
│                                                                      │
│  3. PROCESS                                                          │
│     Consumer processes the message                                   │
│     If timeout expires → message visible again                      │
│                                                                      │
│  4. DELETE                                                           │
│     Consumer calls DeleteMessage with ReceiptHandle                  │
│     Message permanently removed                                      │
│                                                                      │
│  OR                                                                  │
│                                                                      │
│  4. FAIL                                                             │
│     Processing fails, message not deleted                           │
│     After visibility timeout → message visible                      │
│     Retry until maxReceiveCount → DLQ                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Dead Letter Queue (DLQ)

### DLQ Configuration

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    DEAD LETTER QUEUE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Main Queue ────────────→ Consumer                                  │
│       │                        │                                     │
│       │                        │ fail (maxReceiveCount times)        │
│       │                        │                                     │
│       │ Redrive Policy         │                                     │
│       │ maxReceiveCount=3      │                                     │
│       ↓                        ↓                                     │
│   ┌────────┐              ┌────────┐                                │
│   │  DLQ   │ ←────────────│ Failed │                                │
│   │(review)│              │ Message│                                │
│   └────────┘              └────────┘                                │
│                                                                      │
│   DLQ receives messages that failed too many times                  │
│   Must be same type (Standard → Standard, FIFO → FIFO)             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```java
// AWS SDK v2 - Create queue with DLQ
CreateQueueRequest mainQueueRequest = CreateQueueRequest.builder()
    .queueName("order-queue")
    .attributes(Map.of(
        QueueAttributeName.VISIBILITY_TIMEOUT, "60",
        QueueAttributeName.REDRIVE_POLICY, 
            "{\"deadLetterTargetArn\":\"arn:aws:sqs:region:account:order-dlq\"," +
            "\"maxReceiveCount\":\"3\"}"
    ))
    .build();
```

---

## 4. AWS SNS Overview

### What is SNS?

```text
SNS = Simple Notification Service
    = Pub/Sub messaging
    = Push-based delivery
    
┌─────────────────────────────────────────────────────────────────────┐
│                         SNS BASICS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Publisher ──publish──→ [ SNS Topic ]                              │
│                               │                                      │
│                   ┌───────────┼───────────┐                         │
│                   │           │           │                          │
│                   ↓           ↓           ↓                          │
│              [Lambda]    [SQS Queue]  [HTTP/S]                      │
│              [Email]     [SMS]        [Mobile Push]                  │
│                                                                      │
│   Characteristics:                                                   │
│   • Push-based (SNS pushes to subscribers)                          │
│   • Supports multiple protocols                                     │
│   • Fan-out to multiple endpoints                                   │
│   • Message filtering                                               │
│   • Up to 12.5M subscriptions per topic                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### SNS Message Filtering

```text
Publisher sends:
{
    "orderId": "123",
    "status": "shipped",
    "region": "us-east",
    "priority": "high"
}

Subscriber A filter: {"status": ["shipped"]}
  → Receives message ✓

Subscriber B filter: {"status": ["cancelled"]}
  → Does NOT receive ✗

Subscriber C filter: {"region": ["us-east"], "priority": ["high"]}
  → Receives message ✓ (AND logic)
```

---

## 5. SNS + SQS Fan-Out Pattern

### The Pattern

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    FAN-OUT PATTERN                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Order Service ──publish──→ [SNS Topic: order-events]              │
│                                     │                                │
│                    ┌────────────────┼────────────────┐              │
│                    │                │                │              │
│                    ↓                ↓                ↓              │
│              ┌─────────┐      ┌─────────┐      ┌─────────┐         │
│              │SQS Queue│      │SQS Queue│      │SQS Queue│         │
│              │Inventory│      │ Email   │      │Analytics│         │
│              └────┬────┘      └────┬────┘      └────┬────┘         │
│                   │                │                │              │
│                   ↓                ↓                ↓              │
│              [Inventory     [Email         [Analytics             │
│               Service]       Service]       Service]              │
│                                                                      │
│   Benefits:                                                          │
│   • Services process independently                                  │
│   • Each has its own queue (different speeds OK)                   │
│   • Failures don't affect other services                           │
│   • Easy to add new subscribers                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Why SNS → SQS (not SNS → Lambda directly)?

```text
SNS → Lambda:
• Messages lost if Lambda fails
• No replay capability
• Concurrent invocation limits

SNS → SQS → Lambda:
• Messages persisted in queue
• Automatic retries
• DLQ for failures
• Controlled concurrency
• Can pause processing
```

---

## 6. Java SDK Examples

### SQS Producer

```java
// AWS SDK v2
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.*;

@Service
public class SQSProducer {
    
    private final SqsClient sqsClient;
    private final String queueUrl;
    
    public SQSProducer(SqsClient sqsClient, 
                       @Value("${aws.sqs.queue-url}") String queueUrl) {
        this.sqsClient = sqsClient;
        this.queueUrl = queueUrl;
    }
    
    // Send single message
    public String sendMessage(OrderEvent event) {
        SendMessageRequest request = SendMessageRequest.builder()
            .queueUrl(queueUrl)
            .messageBody(objectMapper.writeValueAsString(event))
            .messageAttributes(Map.of(
                "eventType", MessageAttributeValue.builder()
                    .stringValue(event.getType())
                    .dataType("String")
                    .build()
            ))
            .delaySeconds(0)  // Optional delay
            .build();
        
        SendMessageResponse response = sqsClient.sendMessage(request);
        return response.messageId();
    }
    
    // Send to FIFO queue
    public String sendToFIFO(OrderEvent event) {
        SendMessageRequest request = SendMessageRequest.builder()
            .queueUrl(fifoQueueUrl)
            .messageBody(objectMapper.writeValueAsString(event))
            .messageGroupId(event.getOrderId())  // Required for FIFO
            .messageDeduplicationId(event.getEventId())  // Or enable content-based
            .build();
        
        return sqsClient.sendMessage(request).messageId();
    }
    
    // Batch send (more efficient)
    public void sendBatch(List<OrderEvent> events) {
        List<SendMessageBatchRequestEntry> entries = new ArrayList<>();
        
        for (int i = 0; i < events.size(); i++) {
            entries.add(SendMessageBatchRequestEntry.builder()
                .id(String.valueOf(i))
                .messageBody(objectMapper.writeValueAsString(events.get(i)))
                .build());
        }
        
        SendMessageBatchRequest request = SendMessageBatchRequest.builder()
            .queueUrl(queueUrl)
            .entries(entries)
            .build();
        
        sqsClient.sendMessageBatch(request);
    }
}
```

### SQS Consumer

```java
@Service
public class SQSConsumer {
    
    private final SqsClient sqsClient;
    private final String queueUrl;
    
    // Polling loop
    public void poll() {
        while (true) {
            ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                .queueUrl(queueUrl)
                .maxNumberOfMessages(10)  // Max 10
                .waitTimeSeconds(20)      // Long polling
                .visibilityTimeout(60)    // 60 seconds to process
                .messageAttributeNames("All")
                .build();
            
            ReceiveMessageResponse response = sqsClient.receiveMessage(request);
            
            for (Message message : response.messages()) {
                try {
                    processMessage(message);
                    deleteMessage(message);
                } catch (Exception e) {
                    log.error("Failed to process message", e);
                    // Message will become visible again after timeout
                }
            }
        }
    }
    
    private void processMessage(Message message) {
        OrderEvent event = objectMapper.readValue(message.body(), OrderEvent.class);
        orderService.process(event);
    }
    
    private void deleteMessage(Message message) {
        DeleteMessageRequest request = DeleteMessageRequest.builder()
            .queueUrl(queueUrl)
            .receiptHandle(message.receiptHandle())
            .build();
        
        sqsClient.deleteMessage(request);
    }
    
    // Extend visibility if processing takes long
    private void extendVisibility(Message message, int additionalSeconds) {
        ChangeMessageVisibilityRequest request = ChangeMessageVisibilityRequest.builder()
            .queueUrl(queueUrl)
            .receiptHandle(message.receiptHandle())
            .visibilityTimeout(additionalSeconds)
            .build();
        
        sqsClient.changeMessageVisibility(request);
    }
}
```

### SNS Publisher

```java
@Service
public class SNSPublisher {
    
    private final SnsClient snsClient;
    private final String topicArn;
    
    public void publishEvent(OrderEvent event) {
        PublishRequest request = PublishRequest.builder()
            .topicArn(topicArn)
            .message(objectMapper.writeValueAsString(event))
            .messageAttributes(Map.of(
                "eventType", MessageAttributeValue.builder()
                    .stringValue(event.getType())
                    .dataType("String")
                    .build(),
                "region", MessageAttributeValue.builder()
                    .stringValue(event.getRegion())
                    .dataType("String")
                    .build()
            ))
            .build();
        
        PublishResponse response = snsClient.publish(request);
        log.info("Published to SNS: {}", response.messageId());
    }
    
    // FIFO topic
    public void publishToFIFO(OrderEvent event) {
        PublishRequest request = PublishRequest.builder()
            .topicArn(fifoTopicArn)
            .message(objectMapper.writeValueAsString(event))
            .messageGroupId(event.getOrderId())
            .messageDeduplicationId(event.getEventId())
            .build();
        
        snsClient.publish(request);
    }
}
```

### Spring Cloud AWS

```java
// Simpler with Spring Cloud AWS

@Configuration
public class AwsConfig {
    @Bean
    public QueueMessagingTemplate queueMessagingTemplate(AmazonSQSAsync amazonSqs) {
        return new QueueMessagingTemplate(amazonSqs);
    }
}

@Service
public class OrderService {
    
    @Autowired
    private QueueMessagingTemplate messagingTemplate;
    
    // Send
    public void sendOrder(Order order) {
        messagingTemplate.convertAndSend("order-queue", order);
    }
}

// Consumer with annotation
@Service
public class OrderConsumer {
    
    @SqsListener("order-queue")
    public void handleOrder(Order order) {
        log.info("Received order: {}", order.getId());
        processOrder(order);
    }
    
    // With acknowledgment
    @SqsListener(value = "order-queue", deletionPolicy = SqsMessageDeletionPolicy.NEVER)
    public void handleWithAck(Order order, Acknowledgment ack) {
        try {
            processOrder(order);
            ack.acknowledge();
        } catch (Exception e) {
            // Message will be retried
        }
    }
}
```

---

## 7. SQS + Lambda Integration

### Event Source Mapping

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    SQS → LAMBDA                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   [SQS Queue] ──Event Source Mapping──→ [Lambda Function]           │
│       │                                       │                      │
│       │ Configuration:                        │                      │
│       │ • Batch size: 1-10000                │                      │
│       │ • Batch window: 0-300s               │                      │
│       │ • Concurrent executions               │                      │
│       │                                       │                      │
│       │ On Success:                          │                      │
│       │ • Message deleted automatically       │                      │
│       │                                       │                      │
│       │ On Failure:                          │                      │
│       │ • Message returns to queue           │                      │
│       │ • After maxReceiveCount → DLQ        │                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```java
// Lambda handler
public class OrderHandler implements RequestHandler<SQSEvent, String> {
    
    @Override
    public String handleRequest(SQSEvent event, Context context) {
        for (SQSMessage message : event.getRecords()) {
            try {
                OrderEvent orderEvent = objectMapper.readValue(
                    message.getBody(), 
                    OrderEvent.class
                );
                
                processOrder(orderEvent);
                
            } catch (Exception e) {
                // Throw to trigger retry
                throw new RuntimeException("Processing failed", e);
            }
        }
        
        return "OK";
    }
}
```

---

## 8. Interview Questions

### Q1: Standard vs FIFO queue - when to use each?

```text
Answer:
"I choose based on requirements:

STANDARD QUEUE when:
• Order doesn't matter (log processing, analytics)
• Need high throughput (unlimited TPS)
• Can handle duplicates (idempotent consumers)
• Example: Notification emails

FIFO QUEUE when:
• Order matters (financial transactions, chat messages)
• Need exactly-once processing
• 300 TPS is sufficient (3000 with batching)
• Example: Order state changes (created → paid → shipped)

For FIFO, I use Message Group ID strategically:
• Same group = ordered (all orders from one user)
• Different groups = parallel (orders from different users)

This gives ordering where needed while maintaining throughput."
```

### Q2: How do you handle SQS message processing failures?

```text
Answer:
"I implement a multi-layer failure strategy:

1. RETRY WITH VISIBILITY TIMEOUT
   - Set visibility timeout > processing time
   - Failed messages automatically retry
   - No code needed for simple retries

2. DEAD LETTER QUEUE
   - Configure maxReceiveCount (usually 3-5)
   - Failed messages after retries → DLQ
   - Alerts on DLQ depth
   - Regular review/reprocessing

3. EXTENDED VISIBILITY
   If processing takes longer than expected:
   sqsClient.changeMessageVisibility(receiptHandle, newTimeout);

4. IDEMPOTENT PROCESSING
   - Track processed message IDs
   - Use database unique constraints
   - Duplicates don't cause issues

5. MONITORING
   - CloudWatch metrics: ApproximateNumberOfMessages
   - Alarms on DLQ growth
   - Logging for debugging"
```

### Q3: Explain the SNS + SQS fan-out pattern

```text
Answer:
"Fan-out is when one event triggers multiple independent processes:

PATTERN:
Order Created → SNS Topic → Multiple SQS Queues → Different Services

Example:
When order is created:
1. Inventory service needs to reserve stock
2. Email service sends confirmation
3. Analytics service tracks metrics

IMPLEMENTATION:
1. Publisher sends to SNS topic (once)
2. SNS delivers to all subscribed SQS queues
3. Each service has its own queue and processes independently

BENEFITS:
• Loose coupling (publisher doesn't know subscribers)
• Independent failure handling (one service down doesn't affect others)
• Different processing speeds (email fast, analytics slow - OK)
• Easy to add new subscribers

WHY SQS BETWEEN SNS AND SERVICE?
• Persistence (survives service downtime)
• Retry capability
• Dead letter queue
• Rate control
• In contrast, SNS → Lambda can lose messages on failure"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    AWS SQS/SNS CHEAT SHEET                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ SQS STANDARD:                                                         │
│ ├── At-least-once delivery                                           │
│ ├── Best-effort ordering                                             │
│ ├── Unlimited throughput                                             │
│ └── Use: High volume, order doesn't matter                          │
│                                                                       │
│ SQS FIFO:                                                             │
│ ├── Exactly-once processing                                          │
│ ├── Strict ordering (within group)                                   │
│ ├── 300 TPS (3000 with batch)                                        │
│ └── Use: Order matters, no duplicates                                │
│                                                                       │
│ KEY CONCEPTS:                                                         │
│ ├── Visibility Timeout: Message hidden during processing             │
│ ├── Long Polling: Wait up to 20s for messages                        │
│ ├── DLQ: Failed messages after maxReceiveCount                       │
│ └── Message Group ID: Ordering within FIFO group                     │
│                                                                       │
│ SNS:                                                                  │
│ ├── Pub/Sub (push-based)                                             │
│ ├── Fan-out to multiple endpoints                                    │
│ ├── Message filtering                                                │
│ └── Protocols: SQS, Lambda, HTTP, Email, SMS                        │
│                                                                       │
│ PATTERNS:                                                             │
│ ├── Fan-out: SNS → Multiple SQS → Services                          │
│ ├── Event-driven: SNS → SQS → Lambda                                │
│ └── Buffering: High-rate producers → SQS → Steady consumers         │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [5. Messaging Patterns & Best Practices →](./messaging-patterns)
