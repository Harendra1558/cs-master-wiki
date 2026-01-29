---
title: 3. RabbitMQ & AMQP
sidebar_position: 3
description: Master RabbitMQ, AMQP protocol, exchanges, queues, bindings, and routing patterns for backend interviews.
keywords: [rabbitmq, amqp, message broker, exchange, queue, routing, dead letter]
---

# RabbitMQ & AMQP

:::info Interview Importance ⭐⭐⭐⭐
RabbitMQ is the most popular traditional message broker. Understanding its exchange types and routing patterns is crucial for system design interviews.
:::

## 1. RabbitMQ Architecture

### Core Components

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     RABBITMQ ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Producer                                                           │
│      │                                                               │
│      │ publish                                                       │
│      ↓                                                               │
│  ┌────────────┐    binding     ┌───────────┐                        │
│  │  Exchange  │ ─────────────→ │   Queue   │ ────→ Consumer         │
│  │            │    routing key │           │                        │
│  └────────────┘                └───────────┘                        │
│      │                              │                               │
│      │                              │                               │
│      ↓ binding                      ↓                               │
│  ┌───────────┐                ┌───────────┐                        │
│  │   Queue   │ ────→ Consumer │   Queue   │ ────→ Consumer         │
│  └───────────┘                └───────────┘                        │
│                                                                      │
│   Key Concepts:                                                      │
│   • Exchange: Routes messages based on rules                        │
│   • Queue: Stores messages until consumed                           │
│   • Binding: Link between exchange and queue                        │
│   • Routing Key: Address for message routing                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Message Flow

```text
1. Producer publishes message to Exchange with routing key
2. Exchange routes message to Queue(s) based on bindings
3. Consumer receives message from Queue
4. Consumer acknowledges (ack) or rejects (nack) message
5. Acknowledged messages are removed from queue
```

---

## 2. Exchange Types

### Direct Exchange

```text
Direct Exchange: Exact routing key match

Producer sends:
  routing_key = "order.created"

                    ┌────────────────┐
                    │ Direct Exchange│
                    └───────┬────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
   binding key:      binding key:      binding key:
   "order.created"   "order.shipped"   "order.cancelled"
          │                 │                 │
          ↓                 ↓                 ↓
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ Queue A  │  ✓  │ Queue B  │     │ Queue C  │
    │ (gets it)│     │          │     │          │
    └──────────┘     └──────────┘     └──────────┘
```

```java
// Producer
channel.basicPublish("orders.direct", "order.created", null, message.getBytes());

// Consumer - binds with exact key
channel.queueBind("order-processing-queue", "orders.direct", "order.created");
```

### Fanout Exchange

```text
Fanout Exchange: Broadcast to ALL bound queues (ignores routing key)

                    ┌────────────────┐
                    │Fanout Exchange │
                    └───────┬────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ↓                 ↓                 ↓
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ Queue A  │  ✓  │ Queue B  │  ✓  │ Queue C  │  ✓
    │          │     │          │     │          │
    └──────────┘     └──────────┘     └──────────┘

Use: Broadcast events, notifications to all subscribers
```

```java
// Producer - routing key ignored
channel.basicPublish("notifications.fanout", "", null, message.getBytes());

// Consumers - just bind, no routing key needed
channel.queueBind("email-queue", "notifications.fanout", "");
channel.queueBind("sms-queue", "notifications.fanout", "");
channel.queueBind("push-queue", "notifications.fanout", "");
```

### Topic Exchange

```text
Topic Exchange: Pattern matching with wildcards

Routing key pattern: word.word.word
  * = matches exactly one word
  # = matches zero or more words

Producer sends: order.created.usa
                order.shipped.europe
                payment.failed.asia

                    ┌────────────────┐
                    │ Topic Exchange │
                    └───────┬────────┘
                            │
    binding: "order.*.*"    │   binding: "*.*.europe"
                ↓           │           ↓
          ┌──────────┐      │     ┌──────────┐
          │ Orders Q │      │     │ Europe Q │
          │          │      │     │          │
          └──────────┘      │     └──────────┘
                            │
          binding: "#"      │     binding: "payment.#"
                ↓           │           ↓
          ┌──────────┐      │     ┌──────────┐
          │   All Q  │      │     │Payment Q │
          │(gets all)│      │     │          │
          └──────────┘      │     └──────────┘

Pattern Examples:
• "order.*.*"      → order.created.usa ✓, payment.failed.usa ✗
• "*.*.europe"     → order.shipped.europe ✓, order.created.usa ✗
• "order.#"        → order.created.usa ✓, order.a.b.c ✓
• "#"              → matches everything
```

```java
// Flexible routing with patterns
channel.queueBind("order-queue", "events.topic", "order.*.*");
channel.queueBind("payment-queue", "events.topic", "payment.#");
channel.queueBind("european-orders", "events.topic", "order.*.europe");
```

### Headers Exchange

```text
Headers Exchange: Route based on message headers (not routing key)

Message headers:
  x-match: any/all
  type: "order"
  priority: "high"
  region: "usa"

Binding: {"x-match": "all", "type": "order", "priority": "high"}
  → Only matches if ALL specified headers match

Binding: {"x-match": "any", "type": "order", "priority": "high"}  
  → Matches if ANY specified header matches
```

```java
Map<String, Object> headers = new HashMap<>();
headers.put("type", "order");
headers.put("priority", "high");

AMQP.BasicProperties props = new AMQP.BasicProperties.Builder()
    .headers(headers)
    .build();

channel.basicPublish("headers.exchange", "", props, message.getBytes());
```

---

## 3. Message Acknowledgment

### Acknowledgment Modes

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ACKNOWLEDGMENT MODES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ 1. AUTO ACK (autoAck = true)                                        │
│    Message removed when delivered                                    │
│    ⚠️ DANGEROUS: Message lost if consumer crashes!                  │
│                                                                      │
│    Queue ──deliver──→ Consumer                                       │
│    (removed)          (processing...)                               │
│                       ← crash! → MESSAGE LOST                       │
│                                                                      │
│ 2. MANUAL ACK (autoAck = false)                                     │
│    Message removed only after explicit ack                           │
│    ✅ SAFE: Message redelivered if consumer crashes                 │
│                                                                      │
│    Queue ──deliver──→ Consumer                                       │
│    (marked)           (processing...)                               │
│                       ← ack ──                                       │
│    (removed)          (done)                                         │
│                                                                      │
│    OR on failure:                                                    │
│    Queue ──deliver──→ Consumer                                       │
│    (marked)           (processing...)                               │
│                       ← nack ──                                      │
│    (requeue or DLQ)   (failed)                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Manual Acknowledgment in Java

```java
// Consumer with manual ack
boolean autoAck = false;  // Important!

channel.basicConsume(queueName, autoAck, (consumerTag, delivery) -> {
    try {
        String message = new String(delivery.getBody(), StandardCharsets.UTF_8);
        
        // Process the message
        processOrder(message);
        
        // Acknowledge success
        channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
        
    } catch (Exception e) {
        // Negative acknowledge - requeue for retry
        channel.basicNack(
            delivery.getEnvelope().getDeliveryTag(),
            false,   // multiple: false = just this message
            true     // requeue: true = put back in queue
        );
        
        // Or reject without requeue (goes to DLQ if configured)
        // channel.basicReject(delivery.getEnvelope().getDeliveryTag(), false);
    }
}, consumerTag -> {});
```

### Prefetch (QoS)

```java
// Limit unacknowledged messages per consumer
// Prevents one slow consumer from hogging all messages
int prefetchCount = 10;
channel.basicQos(prefetchCount);

// Now consumer only gets 10 messages at a time
// Must ack before receiving more
```

---

## 4. Dead Letter Exchanges (DLX)

### What is DLX?

```text
Dead Letter Exchange: Where "failed" messages go

Messages become "dead" when:
1. Consumer rejects with requeue=false
2. Message TTL expires
3. Queue max length exceeded

┌──────────┐          ┌──────────┐
│ Main Q   │──reject─→│   DLX    │──→┌──────────┐
│          │          │(Exchange)│   │  DLQ     │
│          │──expire─→│          │   │(Dead Q)  │
│          │          └──────────┘   └──────────┘
│          │──overflow→     │
└──────────┘                ↓
                    ┌──────────┐
                    │Alert Q   │──→ Monitor consumer
                    └──────────┘
```

### Configuring DLX

```java
// Declare DLX and DLQ
channel.exchangeDeclare("dlx.exchange", "direct");
channel.queueDeclare("dead-letter-queue", true, false, false, null);
channel.queueBind("dead-letter-queue", "dlx.exchange", "dead");

// Declare main queue with DLX configuration
Map<String, Object> args = new HashMap<>();
args.put("x-dead-letter-exchange", "dlx.exchange");
args.put("x-dead-letter-routing-key", "dead");
args.put("x-message-ttl", 60000);  // 60 seconds TTL

channel.queueDeclare("main-queue", true, false, false, args);
```

### Retry with DLX

```text
Retry Pattern using DLX:

Main Queue ──reject──→ Retry Queue (with TTL)
                            │
                            │ (wait)
                            ↓
                      After TTL expires
                            │
                            ↓
                       Back to Main Queue
                            │
                            ↓
                      (retry processing)
                            │
                     max retries exceeded?
                            │
                            ↓
                     Final DLQ (manual review)
```

---

## 5. Spring AMQP Integration

### Configuration

```java
@Configuration
public class RabbitMQConfig {
    
    @Bean
    public ConnectionFactory connectionFactory() {
        CachingConnectionFactory factory = new CachingConnectionFactory();
        factory.setHost("localhost");
        factory.setPort(5672);
        factory.setUsername("guest");
        factory.setPassword("guest");
        return factory;
    }
    
    // Direct Exchange
    @Bean
    public DirectExchange ordersExchange() {
        return new DirectExchange("orders.exchange");
    }
    
    // Queue
    @Bean
    public Queue orderQueue() {
        return QueueBuilder.durable("order-queue")
            .deadLetterExchange("dlx.exchange")
            .deadLetterRoutingKey("dead.order")
            .ttl(60000)
            .build();
    }
    
    // Binding
    @Bean
    public Binding orderBinding(Queue orderQueue, DirectExchange ordersExchange) {
        return BindingBuilder
            .bind(orderQueue)
            .to(ordersExchange)
            .with("order.created");
    }
    
    // DLQ
    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable("order-dlq").build();
    }
    
    @Bean
    public DirectExchange dlxExchange() {
        return new DirectExchange("dlx.exchange");
    }
    
    @Bean
    public Binding dlqBinding() {
        return BindingBuilder
            .bind(deadLetterQueue())
            .to(dlxExchange())
            .with("dead.order");
    }
}
```

### Producer

```java
@Service
public class OrderEventProducer {
    
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    public void publishOrderCreated(Order order) {
        OrderEvent event = new OrderEvent("ORDER_CREATED", order);
        
        rabbitTemplate.convertAndSend(
            "orders.exchange",      // exchange
            "order.created",        // routing key
            event,                  // message (auto-converted to JSON)
            message -> {
                // Add custom headers
                message.getMessageProperties().setHeader("orderId", order.getId());
                message.getMessageProperties().setPriority(5);
                return message;
            }
        );
        
        log.info("Published order event: {}", order.getId());
    }
    
    // With confirmation
    public void publishWithConfirmation(Order order) {
        CorrelationData correlationData = new CorrelationData(order.getId());
        
        rabbitTemplate.convertAndSend("orders.exchange", "order.created", 
            new OrderEvent("ORDER_CREATED", order), correlationData);
    }
}

// Enable publisher confirms
@Bean
public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
    RabbitTemplate template = new RabbitTemplate(connectionFactory);
    template.setConfirmCallback((correlationData, ack, cause) -> {
        if (ack) {
            log.info("Message confirmed: {}", correlationData.getId());
        } else {
            log.error("Message not confirmed: {} - {}", correlationData.getId(), cause);
        }
    });
    return template;
}
```

### Consumer

```java
@Service
public class OrderEventConsumer {
    
    @RabbitListener(queues = "order-queue")
    public void handleOrderCreated(OrderEvent event) {
        log.info("Received order event: {}", event.getOrderId());
        orderService.process(event.getOrder());
    }
    
    // With manual acknowledgment
    @RabbitListener(queues = "order-queue", ackMode = "MANUAL")
    public void handleWithManualAck(
            OrderEvent event, 
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {
        
        try {
            orderService.process(event.getOrder());
            
            // Acknowledge success
            channel.basicAck(deliveryTag, false);
            
        } catch (Exception e) {
            // Reject and don't requeue (send to DLQ)
            channel.basicNack(deliveryTag, false, false);
        }
    }
    
    // Batch consumer
    @RabbitListener(queues = "batch-queue", containerFactory = "batchListenerFactory")
    public void handleBatch(List<OrderEvent> events) {
        log.info("Processing batch of {} orders", events.size());
        orderService.processBatch(events);
    }
}

// Batch listener configuration
@Bean
public SimpleRabbitListenerContainerFactory batchListenerFactory(
        ConnectionFactory connectionFactory) {
    SimpleRabbitListenerContainerFactory factory = 
        new SimpleRabbitListenerContainerFactory();
    factory.setConnectionFactory(connectionFactory);
    factory.setBatchListener(true);
    factory.setBatchSize(10);
    factory.setReceiveTimeout(5000L);
    return factory;
}
```

---

## 6. RabbitMQ vs Kafka

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    RABBITMQ vs KAFKA                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ARCHITECTURE                                                         │
│ ─────────────────────────────────────────────────────────────────── │
│ RabbitMQ: Smart broker, dumb consumer                               │
│   • Broker routes, filters, tracks                                  │
│   • Message deleted after consumption                               │
│   • Perfect for complex routing                                     │
│                                                                      │
│ Kafka: Dumb broker, smart consumer                                  │
│   • Broker just stores, consumer tracks position                    │
│   • Messages retained (configurable)                                │
│   • Perfect for replay and event sourcing                           │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ WHEN TO USE                                                          │
│ ─────────────────────────────────────────────────────────────────── │
│ RabbitMQ:                                                           │
│   ✓ Complex routing requirements                                    │
│   ✓ Request/reply patterns                                          │
│   ✓ Transactional messaging                                         │
│   ✓ Fine-grained message handling                                   │
│   ✓ Priority queues needed                                          │
│   ✓ Lower latency requirements                                      │
│                                                                      │
│ Kafka:                                                               │
│   ✓ Event streaming and sourcing                                    │
│   ✓ High throughput (millions/sec)                                  │
│   ✓ Message replay required                                         │
│   ✓ Multiple independent consumers                                  │
│   ✓ Log aggregation                                                 │
│   ✓ Stream processing                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Interview Questions

### Q1: Explain RabbitMQ exchange types and when to use each

```text
Answer:
"RabbitMQ has 4 exchange types:

1. DIRECT: Exact routing key match
   Use: Specific task routing, like order.created → order queue

2. FANOUT: Broadcast to all bound queues
   Use: Notifications, events that multiple services need

3. TOPIC: Pattern matching with wildcards (* and #)
   Use: Flexible routing like logs.*.error, order.#

4. HEADERS: Route based on message headers
   Use: Complex routing logic not expressible in routing key

Example:
For an e-commerce system, I'd use:
- Direct for order state changes (each state to specific queue)
- Fanout for 'order completed' (inventory, email, analytics all need it)
- Topic for logs (logs.payment.error, logs.inventory.*)"
```

### Q2: How do you ensure message reliability in RabbitMQ?

```text
Answer:
"I ensure reliability at multiple levels:

1. PRODUCER SIDE:
   - Publisher confirms: Broker acks receipt
   - Persistent messages: survives broker restart
   - Transactions (rarely): atomic publish

2. BROKER SIDE:
   - Durable queues: survive restart
   - Mirrored queues: replicated across nodes
   - Quorum queues: Raft-based replication

3. CONSUMER SIDE:
   - Manual acknowledgment: ack after processing
   - Prefetch limit: don't overload consumer
   - Dead letter queue: failed messages preserved

4. PATTERN:
   try {
       processMessage(message);
       channel.basicAck(deliveryTag, false);
   } catch (Exception e) {
       channel.basicNack(deliveryTag, false, false);
       // Goes to DLQ for investigation
   }

This ensures at-least-once delivery. For exactly-once,
I make consumers idempotent using message IDs."
```

### Q3: How do you handle poison messages?

```text
Answer:
"Poison messages are messages that always fail processing:

DETECTION:
- Track retry count in message headers
- If retries > threshold, it's poison

HANDLING:
1. Dead Letter Queue with retry headers:
   Map<String, Object> headers = message.getMessageProperties().getHeaders();
   int retryCount = (int) headers.getOrDefault('x-retry-count', 0);
   
   if (retryCount >= MAX_RETRIES) {
       // Send to DLQ for manual review
       channel.basicNack(deliveryTag, false, false);
   } else {
       // Retry with incremented count
       headers.put('x-retry-count', retryCount + 1);
       rabbitTemplate.send('retry-exchange', message);
   }

2. STRUCTURED DLQ:
   - Preserve original message
   - Add failure reason
   - Add timestamp and retry count
   - Alert operations team

3. MONITORING:
   - Dashboard for DLQ depth
   - Alerts when DLQ grows
   - Periodic review process"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    RABBITMQ CHEAT SHEET                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ EXCHANGE TYPES:                                                       │
│ ├── Direct: Exact routing key match                                   │
│ ├── Fanout: Broadcast to all queues                                   │
│ ├── Topic: Pattern matching (* = one word, # = zero+)                 │
│ └── Headers: Route by message headers                                 │
│                                                                       │
│ ACKNOWLEDGMENT:                                                       │
│ ├── basicAck: Message processed successfully                          │
│ ├── basicNack: Message failed (requeue or DLQ)                        │
│ ├── basicReject: Like nack for single message                         │
│ └── Prefetch (QoS): Limit unacked messages                            │
│                                                                       │
│ RELIABILITY:                                                          │
│ ├── Durable queues: Survive broker restart                            │
│ ├── Persistent messages: Written to disk                              │
│ ├── Publisher confirms: Broker confirms receipt                       │
│ └── Manual acks: Consumer confirms processing                         │
│                                                                       │
│ DEAD LETTER:                                                          │
│ ├── DLX: Dead Letter Exchange                                         │
│ ├── DLQ: Dead Letter Queue                                            │
│ └── Triggers: Reject, TTL expire, queue overflow                      │
│                                                                       │
│ SPRING ANNOTATIONS:                                                   │
│ ├── @RabbitListener(queues = "...")                                   │
│ ├── @RabbitHandler                                                    │
│ └── RabbitTemplate.convertAndSend()                                   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [4. AWS SQS & SNS →](./aws-sqs-sns)
