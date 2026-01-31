---
title: 5. Messaging Patterns & Best Practices
sidebar_position: 5
description: Master messaging patterns - idempotency, ordering, exactly-once, backpressure, serialization, event-driven architecture for interviews.
keywords: [idempotency, ordering, exactly-once, backpressure, dead letter queue, event-driven, avro, protobuf]
---

# Messaging Patterns & Best Practices

:::info Interview Importance ⭐⭐⭐⭐⭐
These patterns apply across ALL messaging systems (Kafka, RabbitMQ, SQS). Understanding them deeply is crucial for system design interviews.
:::

## 1. Idempotency

### Why Idempotency Matters

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    THE DUPLICATE PROBLEM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Scenario: Processing payment message                                 │
│                                                                      │
│   Consumer receives: "Charge $100 to Card XXX"                      │
│   Consumer processes: ✓ Charged $100                                │
│   Consumer crashes before acknowledging                              │
│   Queue redelivers same message                                      │
│   Consumer processes again: ✓ Charged $100 AGAIN!                   │
│                                                                      │
│   Result: Customer charged $200 instead of $100!                    │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ IDEMPOTENCY = Processing same message N times                       │
│               has same effect as processing once                    │
│                                                                      │
│   f(x) = f(f(x)) = f(f(f(x)))                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementation Strategies

#### 1. Unique Message ID Tracking

```java
@Service
public class IdempotentPaymentProcessor {
    
    @Autowired
    private ProcessedMessageRepository processedMessageRepo;
    
    @Autowired
    private PaymentService paymentService;
    
    @Transactional
    public void processPayment(PaymentMessage message) {
        String messageId = message.getMessageId();
        
        // Check if already processed
        if (processedMessageRepo.existsById(messageId)) {
            log.info("Message {} already processed, skipping", messageId);
            return;
        }
        
        // Process the payment
        paymentService.charge(message.getAmount(), message.getCardId());
        
        // Record as processed
        processedMessageRepo.save(new ProcessedMessage(
            messageId, 
            LocalDateTime.now()
        ));
    }
}

@Entity
public class ProcessedMessage {
    @Id
    private String messageId;
    private LocalDateTime processedAt;
    
    // Cleanup: Delete records older than 7 days
}
```

#### 2. Database Unique Constraints

```java
@Service
public class IdempotentOrderService {
    
    @Transactional
    public void createOrder(OrderCreatedEvent event) {
        try {
            Order order = Order.builder()
                .id(event.getOrderId())  // Use event's order ID
                .customerId(event.getCustomerId())
                .amount(event.getAmount())
                .build();
            
            orderRepository.save(order);
            
        } catch (DataIntegrityViolationException e) {
            // Unique constraint on order_id
            log.info("Order {} already exists", event.getOrderId());
            // Idempotent: no error, already processed
        }
    }
}
```

#### 3. Conditional Updates (Optimistic Locking)

```java
@Service
public class IdempotentInventoryService {
    
    @Transactional
    public void reserveStock(StockReservationEvent event) {
        // Only update if not already reserved for this event
        int updated = jdbcTemplate.update("""
            UPDATE inventory 
            SET quantity = quantity - ?, 
                last_event_id = ?
            WHERE product_id = ? 
              AND quantity >= ?
              AND (last_event_id IS NULL OR last_event_id != ?)
            """,
            event.getQuantity(),
            event.getEventId(),
            event.getProductId(),
            event.getQuantity(),
            event.getEventId()  // Won't update if same event
        );
        
        if (updated == 0) {
            log.info("Event {} already processed or insufficient stock", 
                event.getEventId());
        }
    }
}
```

---

## 2. Ordering Guarantees

### Understanding Ordering

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ORDERING GUARANTEES                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ TOTAL ORDERING (Rare, Expensive):                                   │
│   All messages in exact order across all consumers                  │
│   Example: Single partition, single consumer                        │
│   ⚠️ No parallelism = slow                                          │
│                                                                      │
│ PARTIAL ORDERING (Common, Practical):                               │
│   Messages with same key in order                                   │
│   Different keys can be parallel                                    │
│                                                                      │
│   User A's messages: 1 → 2 → 3  (ordered)                          │
│   User B's messages: 1 → 2 → 3  (ordered, parallel with A)         │
│                                                                      │
│ NO ORDERING (Fast, Simple):                                         │
│   Messages processed in any order                                   │
│   Maximum parallelism                                               │
│   Use when order doesn't matter                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementing Ordered Processing

```java
// Kafka: Use key for ordering
@Service
public class OrderEventProducer {
    
    public void publishOrderEvent(OrderEvent event) {
        // Use orderId as key - all events for same order go to same partition
        kafkaTemplate.send("order-events", 
            event.getOrderId(),  // Key
            event
        );
    }
}

// Consumer: Each partition processed by one consumer
@KafkaListener(
    topics = "order-events",
    groupId = "order-processor",
    concurrency = "3"  // 3 consumers for 3+ partitions
)
public void processOrder(OrderEvent event) {
    // Events for same orderId arrive in order
    orderService.process(event);
}
```

### Handling Out-of-Order Messages

```java
@Service
public class OrderStateMachine {
    
    private final Map<String, OrderState> orderStates = new ConcurrentHashMap<>();
    
    @Transactional
    public void handleEvent(OrderEvent event) {
        OrderState current = orderStates.getOrDefault(
            event.getOrderId(), 
            OrderState.CREATED
        );
        
        // State machine validates transitions
        if (!isValidTransition(current, event.getType())) {
            if (event.getSequenceNumber() > getLastSequence(event.getOrderId())) {
                // Future event - buffer it
                bufferEvent(event);
                return;
            } else {
                // Old event - already processed
                log.info("Ignoring old event: {}", event);
                return;
            }
        }
        
        // Process valid transition
        processTransition(event);
        orderStates.put(event.getOrderId(), getNextState(current, event.getType()));
        
        // Check if buffered events can now be processed
        processBufferedEvents(event.getOrderId());
    }
}
```

---

## 3. Delivery Semantics

### At-Most-Once, At-Least-Once, Exactly-Once

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    DELIVERY SEMANTICS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ AT-MOST-ONCE:                                                        │
│ "Fire and forget"                                                    │
│   • Message may be lost                                             │
│   • Never duplicated                                                │
│   • Fast, no overhead                                               │
│   • Use: Metrics, logs (loss acceptable)                            │
│                                                                      │
│   Producer ──send──→ Queue ──deliver──→ Consumer                    │
│                      (may fail)         (may crash)                 │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ AT-LEAST-ONCE:                                                       │
│ "Retry until acknowledged"                                          │
│   • Message may be duplicated                                       │
│   • Never lost (after initial ack)                                 │
│   • Most common approach                                            │
│   • Use: With idempotent consumers                                  │
│                                                                      │
│   Producer ──send──→ Queue ──deliver──→ Consumer                    │
│            ←ack──        ←ack── (retry if no ack)                   │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ EXACTLY-ONCE:                                                        │
│ "Perfect delivery - no loss, no duplicates"                         │
│   • Complex to achieve                                              │
│   • Requires special support (Kafka transactions)                   │
│   • Or: At-least-once + idempotent consumer                        │
│                                                                      │
│   Producer (with transaction)                                       │
│      │                                                              │
│      ↓                                                              │
│   Queue (transaction log)                                           │
│      │                                                              │
│      ↓                                                              │
│   Consumer (exactly once processing)                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementing Exactly-Once with Kafka

```java
// Producer with transactions
@Configuration
public class KafkaProducerConfig {
    
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        config.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "order-producer-1");
        config.put(ProducerConfig.ACKS_CONFIG, "all");
        
        return new DefaultKafkaProducerFactory<>(config);
    }
    
    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}

// Transactional producer
@Service
public class TransactionalOrderProducer {
    
    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;
    
    @Transactional  // Spring-managed Kafka transaction
    public void processAndPublish(Order order) {
        // Both DB and Kafka in same transaction
        orderRepository.save(order);
        
        kafkaTemplate.send("order-events", order.getId(), 
            new OrderCreatedEvent(order));
    }
}

// Consumer with exactly-once
@KafkaListener(
    topics = "order-events",
    groupId = "order-processor",
    properties = {
        "isolation.level=read_committed"  // Only read committed messages
    }
)
public void processOrder(OrderEvent event) {
    // Process with idempotency as additional safety
    orderService.processIdempotently(event);
}
```

---

## 4. Dead Letter Queue (DLQ) Patterns

### DLQ Workflow

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    DLQ WORKFLOW                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Main Queue                                                         │
│       │                                                              │
│       ↓                                                              │
│   Consumer ──process──→ Success? ──Yes──→ Acknowledge               │
│       │                    │                                         │
│       │                   No                                         │
│       │                    ↓                                         │
│       │              Retry Count < Max?                              │
│       │                    │                                         │
│       │           Yes ─────┴───── No                                │
│       │            │               │                                 │
│       │            ↓               ↓                                 │
│       │       Requeue         Send to DLQ                           │
│       │     (with delay)          │                                  │
│       ↓            │               ↓                                 │
│   Main Queue ←─────┘         ┌─────────┐                            │
│                              │   DLQ   │                            │
│                              └────┬────┘                            │
│                                   │                                 │
│                    ┌──────────────┼──────────────┐                  │
│                    │              │              │                   │
│                    ↓              ↓              ↓                   │
│               [Alert Team]  [Manual Review] [Reprocess]             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### DLQ Consumer

```java
@Service
public class DeadLetterQueueProcessor {
    
    @KafkaListener(topics = "order-events.DLQ", groupId = "dlq-processor")
    public void processDLQ(ConsumerRecord<String, OrderEvent> record) {
        OrderEvent event = record.value();
        
        // Get failure metadata
        String failureReason = getHeader(record, "error-message");
        int retryCount = getHeaderAsInt(record, "retry-count");
        String originalTopic = getHeader(record, "original-topic");
        
        log.error("DLQ Message - Order: {}, Reason: {}, Retries: {}",
            event.getOrderId(), failureReason, retryCount);
        
        // Store for analysis
        dlqRepository.save(new DLQEntry(
            event,
            failureReason,
            retryCount,
            LocalDateTime.now()
        ));
        
        // Alert if critical
        if (isCritical(event)) {
            alertService.sendAlert("Critical order in DLQ: " + event.getOrderId());
        }
    }
    
    // Manual reprocessing endpoint
    public void reprocessFromDLQ(String messageId) {
        DLQEntry entry = dlqRepository.findById(messageId)
            .orElseThrow(() -> new NotFoundException("DLQ entry not found"));
        
        // Send back to main topic
        kafkaTemplate.send("order-events", entry.getEvent().getOrderId(), 
            entry.getEvent());
        
        // Mark as reprocessed
        entry.setStatus("REPROCESSED");
        dlqRepository.save(entry);
    }
}
```

---

## 5. Backpressure Handling

### What is Backpressure?

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKPRESSURE                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Producer Rate > Consumer Rate = BACKPRESSURE                        │
│                                                                      │
│   Producer (1000 msg/s) ──→ [Queue] ──→ Consumer (100 msg/s)        │
│                                │                                     │
│                          Queue growing!                              │
│                          Memory filling!                             │
│                          Latency increasing!                         │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ SYMPTOMS:                                                            │
│   • Consumer lag increasing                                         │
│   • Queue depth growing                                             │
│   • Message age increasing                                          │
│   • Memory pressure                                                 │
│                                                                      │
│ SOLUTIONS:                                                           │
│   1. Scale consumers (add more instances)                           │
│   2. Throttle producers (rate limiting)                             │
│   3. Drop messages (load shedding)                                  │
│   4. Buffer and batch (reduce per-message overhead)                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Consumer Lag Monitoring (Kafka)

```java
@Component
public class ConsumerLagMonitor {
    
    @Autowired
    private AdminClient adminClient;
    
    @Scheduled(fixedRate = 30000)  // Every 30 seconds
    public void checkLag() {
        // Get consumer group offsets
        Map<TopicPartition, OffsetAndMetadata> offsets = 
            adminClient.listConsumerGroupOffsets("order-processor")
                .partitionsToOffsetAndMetadata()
                .get();
        
        // Get end offsets (latest)
        Map<TopicPartition, Long> endOffsets = 
            consumer.endOffsets(offsets.keySet());
        
        long totalLag = 0;
        for (TopicPartition partition : offsets.keySet()) {
            long consumerOffset = offsets.get(partition).offset();
            long latestOffset = endOffsets.get(partition);
            long lag = latestOffset - consumerOffset;
            
            totalLag += lag;
            
            if (lag > 10000) {
                log.warn("High lag on {}: {} messages", partition, lag);
            }
        }
        
        // Publish metric
        meterRegistry.gauge("kafka.consumer.lag", totalLag);
        
        // Alert if critical
        if (totalLag > 100000) {
            alertService.sendAlert("Critical consumer lag: " + totalLag);
        }
    }
}
```

### Producer Rate Limiting

```java
@Service
public class RateLimitedProducer {
    
    private final RateLimiter rateLimiter = RateLimiter.create(1000.0);  // 1000/sec
    
    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;
    
    public void send(String topic, String key, Object value) {
        // Block if rate limit exceeded
        rateLimiter.acquire();
        
        kafkaTemplate.send(topic, key, value);
    }
    
    // With circuit breaker for downstream protection
    @CircuitBreaker(name = "kafkaProducer", fallbackMethod = "fallbackSend")
    public void sendWithCircuitBreaker(String topic, String key, Object value) {
        rateLimiter.acquire();
        kafkaTemplate.send(topic, key, value).get();  // Wait for ack
    }
    
    private void fallbackSend(String topic, String key, Object value, Exception ex) {
        log.warn("Circuit breaker open, buffering message");
        messageBuffer.add(new BufferedMessage(topic, key, value));
    }
}
```

---

## 6. Message Serialization

### Comparison

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    SERIALIZATION FORMATS                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ JSON:                                                                │
│   ✓ Human readable                                                   │
│   ✓ Easy debugging                                                   │
│   ✓ No schema needed                                                │
│   ✗ Larger size                                                      │
│   ✗ Slower serialization                                            │
│   Use: APIs, debugging, low-volume                                  │
│                                                                      │
│ AVRO:                                                                │
│   ✓ Compact binary format                                           │
│   ✓ Schema evolution support                                        │
│   ✓ Schema registry integration                                     │
│   ✗ Requires schema                                                 │
│   ✗ Not human readable                                              │
│   Use: Kafka, data pipelines                                        │
│                                                                      │
│ PROTOBUF:                                                            │
│   ✓ Very compact                                                    │
│   ✓ Fast serialization                                              │
│   ✓ Strong typing                                                   │
│   ✓ Language agnostic                                               │
│   ✗ Requires .proto files                                           │
│   Use: gRPC, high-performance messaging                             │
│                                                                      │
│ SIZE COMPARISON (same data):                                         │
│   JSON: 150 bytes                                                    │
│   Avro: 50 bytes                                                     │
│   Protobuf: 45 bytes                                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Avro with Schema Registry

```java
// Order.avsc (Avro schema)
{
    "type": "record",
    "name": "Order",
    "namespace": "com.example.events",
    "fields": [
        {"name": "orderId", "type": "string"},
        {"name": "customerId", "type": "string"},
        {"name": "amount", "type": "double"},
        {"name": "status", "type": {"type": "enum", "name": "Status", 
            "symbols": ["CREATED", "PAID", "SHIPPED"]}}
    ]
}

// Producer configuration
@Configuration
public class AvroKafkaConfig {
    
    @Bean
    public ProducerFactory<String, GenericRecord> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, 
            KafkaAvroSerializer.class);
        config.put("schema.registry.url", "http://localhost:8081");
        
        return new DefaultKafkaProducerFactory<>(config);
    }
}

// Producer
@Service
public class AvroOrderProducer {
    
    @Autowired
    private KafkaTemplate<String, GenericRecord> kafkaTemplate;
    
    private Schema orderSchema;  // Load from registry or file
    
    public void sendOrder(Order order) {
        GenericRecord record = new GenericData.Record(orderSchema);
        record.put("orderId", order.getId());
        record.put("customerId", order.getCustomerId());
        record.put("amount", order.getAmount());
        record.put("status", order.getStatus().name());
        
        kafkaTemplate.send("orders", order.getId(), record);
    }
}
```

### Schema Evolution

```text
BACKWARD COMPATIBLE (Safe):
• Add field with default value
• Remove optional field

Version 1:
{ name: string, email: string }

Version 2 (backward compatible):
{ name: string, email: string, phone: string = "" }

FORWARD COMPATIBLE:
• Remove field with default
• Add optional field

FULL COMPATIBLE:
• Both backward and forward
• Safest for production

BREAKING CHANGES (Avoid):
• Remove required field
• Change field type
• Rename field
```

---

## 7. Event-Driven Architecture Patterns

### Event Types

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    EVENT TYPES                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ DOMAIN EVENTS (Business facts):                                      │
│   "OrderCreated", "PaymentReceived", "ItemShipped"                  │
│   • Past tense (something happened)                                 │
│   • Contains business data                                          │
│   • Immutable record of fact                                        │
│                                                                      │
│ INTEGRATION EVENTS (Cross-service communication):                    │
│   Published specifically for other services                         │
│   • May be different from internal domain events                    │
│   • Often subset of domain event data                               │
│   • Part of public API                                              │
│                                                                      │
│ COMMANDS (Instructions):                                             │
│   "ProcessPayment", "ShipOrder"                                     │
│   • Imperative (do something)                                       │
│   • Sent to specific service                                        │
│   • Expects response/result                                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Event Sourcing Pattern

```java
// Event as source of truth
public interface OrderEvent {
    String getOrderId();
    LocalDateTime getTimestamp();
}

public record OrderCreated(String orderId, String customerId, 
                           BigDecimal amount, LocalDateTime timestamp) 
    implements OrderEvent {}

public record OrderPaid(String orderId, String paymentId, 
                        LocalDateTime timestamp) 
    implements OrderEvent {}

public record OrderShipped(String orderId, String trackingNumber, 
                           LocalDateTime timestamp) 
    implements OrderEvent {}

// Aggregate rebuilt from events
public class Order {
    private String id;
    private String customerId;
    private BigDecimal amount;
    private OrderStatus status;
    private String paymentId;
    private String trackingNumber;
    
    // Rebuild state from events
    public static Order fromEvents(List<OrderEvent> events) {
        Order order = new Order();
        for (OrderEvent event : events) {
            order.apply(event);
        }
        return order;
    }
    
    private void apply(OrderEvent event) {
        switch (event) {
            case OrderCreated e -> {
                this.id = e.orderId();
                this.customerId = e.customerId();
                this.amount = e.amount();
                this.status = OrderStatus.CREATED;
            }
            case OrderPaid e -> {
                this.paymentId = e.paymentId();
                this.status = OrderStatus.PAID;
            }
            case OrderShipped e -> {
                this.trackingNumber = e.trackingNumber();
                this.status = OrderStatus.SHIPPED;
            }
            default -> throw new IllegalArgumentException("Unknown event");
        }
    }
}

// Event store
@Repository
public class EventStore {
    
    @Autowired
    private KafkaTemplate<String, OrderEvent> kafkaTemplate;
    
    @Autowired
    private EventRepository eventRepository;
    
    @Transactional
    public void append(OrderEvent event) {
        // Store in database (for rebuilding)
        eventRepository.save(new StoredEvent(
            event.getOrderId(),
            event.getClass().getSimpleName(),
            objectMapper.writeValueAsString(event),
            event.getTimestamp()
        ));
        
        // Publish for other services
        kafkaTemplate.send("order-events", event.getOrderId(), event);
    }
    
    public List<OrderEvent> getEventsForOrder(String orderId) {
        return eventRepository.findByAggregateId(orderId)
            .stream()
            .map(this::deserialize)
            .collect(Collectors.toList());
    }
}
```

### CQRS Pattern

```text
CQRS = Command Query Responsibility Segregation

┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   Commands                          Queries                          │
│   (Create, Update, Delete)          (Read)                          │
│         │                               │                            │
│         ↓                               ↓                            │
│   ┌───────────┐                  ┌───────────────┐                  │
│   │  Command  │                  │    Query      │                  │
│   │  Handler  │                  │    Handler    │                  │
│   └─────┬─────┘                  └───────┬───────┘                  │
│         │                               │                            │
│         ↓                               ↓                            │
│   ┌───────────┐    Events       ┌───────────────┐                  │
│   │   Write   │ ─────────────→  │     Read      │                  │
│   │   Model   │                  │    Model      │                  │
│   │(normalized)│                 │(denormalized) │                  │
│   └───────────┘                  └───────────────┘                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

Benefits:
• Optimize read and write separately
• Read model tailored for queries
• Write model focused on consistency
• Scale independently
```

---

## 8. Interview Questions

### Q1: How do you ensure exactly-once processing?

```text
Answer:
"True exactly-once is hard, so I use 'effectively exactly-once' with two strategies:

1. KAFKA TRANSACTIONS (Producer side):
   - Enable idempotence (enable.idempotence=true)
   - Use transactional ID
   - Atomic writes to multiple partitions
   - Consumer reads only committed (isolation.level=read_committed)

2. IDEMPOTENT CONSUMERS (Recommended approach):
   - At-least-once delivery (guaranteed delivery)
   - Consumer handles duplicates with:
     a) Message ID tracking in database
     b) Unique constraints on business key
     c) Conditional updates (optimistic locking)

Example:
@Transactional
void processPayment(PaymentEvent event) {
    // Check if already processed
    if (processedIds.contains(event.getId())) {
        return;  // Idempotent - no-op
    }
    
    paymentService.process(event);
    processedIds.add(event.getId());
    // All in single transaction
}

This is more practical than true exactly-once because it works
across systems (Kafka, database, external APIs)."
```

### Q2: How do you handle message ordering when scaling consumers?

```text
Answer:
"I use partition-based ordering:

PROBLEM:
- With 3 consumers processing in parallel, order is lost
- Consumer A gets message 1, B gets message 2
- B might finish before A

SOLUTION:
1. Use message key for related messages
   - Key = orderId → all events for same order in same partition
   - Ordering within partition guaranteed

2. Partition count = max parallelism
   - 10 partitions = max 10 consumers
   - Each partition processed by exactly one consumer

3. For cross-key ordering (rare):
   - Single partition (sacrifices throughput)
   - Or use sequence numbers and buffer out-of-order messages

Example:
Producer:
  kafkaTemplate.send('orders', orderId, event);
  // orderId as key ensures same partition

Consumer:
  Order A: event1, event2, event3 (ordered, one consumer)
  Order B: event1, event2, event3 (ordered, different consumer)
  
Maximum throughput while maintaining per-order ordering."
```

### Q3: How do you implement retry with exponential backoff?

```text
Answer:
"I implement multi-level retry with increasing delays:

SPRING KAFKA:
@RetryableTopic(
    attempts = '4',
    backoff = @Backoff(
        delay = 1000,       // 1 second
        multiplier = 2,      // Double each time
        maxDelay = 30000     // Cap at 30 seconds
    ),
    dltTopicSuffix = '.DLQ'
)
@KafkaListener(topics = 'orders')
void process(Order order) {
    orderService.process(order);
}

FLOW:
1. First attempt fails → wait 1s
2. Second attempt fails → wait 2s
3. Third attempt fails → wait 4s
4. Fourth attempt fails → send to DLQ

FOR MORE CONTROL:
- Separate retry topics (orders-retry-1, orders-retry-2)
- Different consumers with different poll intervals
- Delayed queues (RabbitMQ) or message scheduling

MONITORING:
- Track retry counts per message
- Alert on high retry rates
- Dashboard showing retry topic depth

Why exponential backoff?
- Gives system time to recover
- Prevents thundering herd
- Distinguishes transient vs permanent failures"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│              MESSAGING PATTERNS CHEAT SHEET                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ IDEMPOTENCY STRATEGIES:                                               │
│ ├── Track processed message IDs                                      │
│ ├── Database unique constraints                                       │
│ └── Conditional updates (WHERE version = x)                          │
│                                                                       │
│ ORDERING:                                                             │
│ ├── Use partition key for related messages                           │
│ ├── One consumer per partition                                        │
│ └── Buffer out-of-order if needed                                    │
│                                                                       │
│ DELIVERY SEMANTICS:                                                   │
│ ├── At-most-once: Fast, may lose                                     │
│ ├── At-least-once: Safe, may duplicate                               │
│ └── Exactly-once: Complex, use idempotency                           │
│                                                                       │
│ DLQ WORKFLOW:                                                         │
│ ├── Retry N times → DLQ                                              │
│ ├── Alert and monitor DLQ depth                                      │
│ └── Manual review and reprocess                                       │
│                                                                       │
│ BACKPRESSURE:                                                         │
│ ├── Monitor consumer lag                                             │
│ ├── Scale consumers                                                   │
│ ├── Rate limit producers                                             │
│ └── Circuit breaker for protection                                    │
│                                                                       │
│ SERIALIZATION:                                                        │
│ ├── JSON: Human readable, larger                                     │
│ ├── Avro: Schema evolution, compact                                  │
│ └── Protobuf: Fastest, smallest                                      │
│                                                                       │
│ EVENT-DRIVEN PATTERNS:                                                │
│ ├── Event Sourcing: Events as source of truth                        │
│ ├── CQRS: Separate read/write models                                 │
│ └── Saga: Distributed transactions                                    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Back to:** [← Message Queues Overview](./01-intro.md)

**Next:** [10. Microservices Architecture →](../10-microservices-architecture/01-intro.md)
