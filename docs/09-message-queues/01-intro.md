---
sidebar_position: 1
title: Syllabus & Overview
description: Complete Message Queues syllabus for SDE 2 Java Backend interviews - Kafka, RabbitMQ, SQS, patterns, and best practices.
keywords: [message queue, kafka, rabbitmq, sqs, sns, async messaging, event driven]
---

# 10. MESSAGE QUEUES

:::info Interview Importance ⭐⭐⭐⭐⭐
Message queues are fundamental to modern distributed systems. Every system design interview involving microservices, scalability, or event-driven architecture will touch on messaging.
:::

## Why Message Queues Matter

```text
┌─────────────────────────────────────────────────────────────────────┐
│                  SYNCHRONOUS vs ASYNCHRONOUS                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ SYNCHRONOUS (Direct call):                                           │
│                                                                      │
│   Service A ──HTTP──→ Service B ──HTTP──→ Service C                 │
│       │                   │                   │                      │
│       │← waits ──────────←│← waits ──────────←│                      │
│                                                                      │
│   Problems:                                                          │
│   • Tight coupling (A knows B, B knows C)                           │
│   • Cascading failures (C down = all down)                          │
│   • Slow (total latency = sum of all calls)                         │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ ASYNCHRONOUS (Message Queue):                                        │
│                                                                      │
│   Service A ──→ [ Queue ] ──→ Service B                              │
│       │                       Service C                              │
│       │                       Service D                              │
│       ↓                                                              │
│   Returns immediately                                                │
│                                                                      │
│   Benefits:                                                          │
│   • Loose coupling (A doesn't know consumers)                       │
│   • Fault isolation (C down? Queue holds messages)                  │
│   • Scalability (add more consumers)                                │
│   • Fast response (producer returns immediately)                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Topics Covered

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    MESSAGE QUEUES SYLLABUS                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ 1. FUNDAMENTALS                                                      │
│    ├── Why message queues?                                           │
│    ├── Queue vs Topic (Point-to-Point vs Pub-Sub)                   │
│    ├── Push vs Pull consumers                                        │
│    ├── Message anatomy (headers, body, properties)                  │
│    └── Acknowledgments and commits                                   │
│                                                                      │
│ 2. APACHE KAFKA                                                      │
│    ├── Architecture (brokers, topics, partitions)                   │
│    ├── Consumer Groups and rebalancing                               │
│    ├── Offsets and commit strategies                                 │
│    ├── Producers (acks, idempotence)                                │
│    ├── Replication (ISR, leader election)                           │
│    └── Delivery semantics (at-most/least/exactly-once)              │
│                                                                      │
│ 3. RABBITMQ                                                          │
│    ├── AMQP protocol                                                 │
│    ├── Exchanges (direct, fanout, topic, headers)                   │
│    ├── Queues and bindings                                           │
│    ├── Message acknowledgment                                        │
│    └── Dead Letter Exchanges                                         │
│                                                                      │
│ 4. AWS SQS/SNS                                                       │
│    ├── SQS Standard vs FIFO                                         │
│    ├── SNS topics and subscriptions                                 │
│    ├── Fan-out pattern (SNS → SQS)                                  │
│    └── Long polling and visibility timeout                          │
│                                                                      │
│ 5. PATTERNS & BEST PRACTICES                                         │
│    ├── Idempotency                                                   │
│    ├── Ordering guarantees                                           │
│    ├── Dead Letter Queues                                            │
│    ├── Backpressure handling                                         │
│    ├── Message serialization (JSON, Avro, Protobuf)                 │
│    └── Event-driven architecture                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Chapter Overview

| Chapter | Topics | Status |
|---------|--------|--------|
| [2. Kafka Deep Dive](./kafka-deep-dive) | Topics, Partitions, Consumer Groups, Offsets, Delivery Semantics | ✅ Complete |
| [3. RabbitMQ & AMQP](./rabbitmq-amqp) | Exchanges, Queues, Bindings, Routing Patterns | ✅ Complete |
| [4. AWS SQS & SNS](./aws-sqs-sns) | Standard vs FIFO, Fan-out, Long Polling | ✅ Complete |
| [5. Patterns & Best Practices](./messaging-patterns) | Idempotency, DLQ, Backpressure, Serialization | ✅ Complete |

## Quick Comparison

```text
┌───────────────────────────────────────────────────────────────────────┐
│                    KAFKA vs RABBITMQ vs SQS                           │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Feature          │ Kafka        │ RabbitMQ      │ AWS SQS            │
│ ─────────────────┼──────────────┼───────────────┼────────────────────│
│ Model            │ Log/Stream   │ Message Broker│ Managed Queue      │
│ Throughput       │ Very High    │ High          │ High               │
│ Ordering         │ Per Partition│ Per Queue     │ FIFO only          │
│ Replay           │ Yes          │ No            │ No                 │
│ Latency          │ Low          │ Very Low      │ Low                │
│ Complexity       │ Higher       │ Medium        │ Lowest             │
│ Managed?         │ Confluent    │ CloudAMQP    │ Yes (AWS)          │
│                                                                       │
│ BEST FOR:                                                             │
│ Kafka    → Event streaming, logs, high volume                        │
│ RabbitMQ → Task queues, RPC, complex routing                         │
│ SQS      → Simple queuing, AWS integration, serverless              │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

## When to Use Message Queues

```text
USE MESSAGE QUEUES WHEN:

✅ Decoupling services
   └── Services shouldn't know about each other

✅ Handling traffic spikes
   └── Queue absorbs bursts, consumers process at own pace

✅ Background processing
   └── Email, notifications, reports

✅ Guaranteed delivery
   └── Payment processing, order fulfillment

✅ Event-driven architecture
   └── Multiple services react to same event

✅ Cross-language communication
   └── Java producer, Python consumer

────────────────────────────────────────────────────────

DON'T USE WHEN:

❌ You need immediate response
   └── Use synchronous call instead

❌ Simple request/response
   └── HTTP/gRPC is simpler

❌ Data must be real-time
   └── Queues add latency (milliseconds to seconds)

❌ Strong transactions needed
   └── Consider saga pattern or 2PC instead
```

---

**Next:** [2. Kafka Deep Dive →](./kafka-deep-dive)
