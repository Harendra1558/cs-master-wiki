---
sidebar_position: 1
title: 1. Introduction
description: Master Java 8-21+ features for backend interviews - Streams, Lambdas, CompletableFuture, Records, Virtual Threads.
keywords: [java 8, java 17, java 21, streams, lambda, virtual threads, records]
---

# Java 8+ Features

:::info Interview Must-Know ⭐⭐⭐⭐⭐
Modern Java features are used in **every** production codebase. Expect questions on Streams, Lambdas, Optional, CompletableFuture, and newer features like Records and Virtual Threads.
:::

## Why This Matters

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    JAVA VERSION ADOPTION (2024)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Java 8   ████████████████████████████  28%  (Still common!)       │
│   Java 11  ██████████████████████████████████  35%  (LTS)           │
│   Java 17  ████████████████████████████  28%  (LTS, Current)        │
│   Java 21  ██████  8%  (LTS, Latest)                                │
│                                                                      │
│   LTS = Long-Term Support (8, 11, 17, 21)                           │
│                                                                      │
│   Interview Focus:                                                   │
│   ├── Java 8 features (Streams, Lambda, Optional) - Always asked    │
│   ├── Java 11+ (var, new APIs) - Common                             │
│   ├── Java 17+ (Records, Sealed Classes) - Growing                  │
│   └── Java 21 (Virtual Threads) - Cutting edge                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📚 Chapter Overview

| Chapter | Topic | What You'll Learn |
|---------|-------|-------------------|
| [2. Java 8 Features](./java-8-features) | Core Modern Java | Lambdas, Streams, Optional, Method References, Date/Time API |
| [3. CompletableFuture](./completable-future) | Async Programming | Async execution, chaining, combining, exception handling |
| [4. Java 9-17 Features](./java-9-17-features) | Modern Additions | var, Records, Sealed Classes, Pattern Matching, HTTP Client |
| [5. Java 21 & Virtual Threads](./java-21-virtual-threads) | Latest Features | Virtual Threads (Project Loom), Sequenced Collections |

---

## 🎯 Syllabus

### Java 8 (2014) - The Big Change
```text
├── Lambda Expressions
│   ├── Syntax and usage
│   ├── Functional interfaces
│   └── Method references
├── Streams API
│   ├── filter, map, flatMap, reduce
│   ├── Collectors (groupingBy, toMap, joining)
│   ├── Parallel streams
│   └── Lazy evaluation
├── Optional
│   ├── Avoiding null checks
│   ├── map, flatMap, orElse patterns
│   └── Best practices
├── Date/Time API (java.time)
│   ├── LocalDate, LocalTime, LocalDateTime
│   ├── ZonedDateTime, Instant
│   └── Duration, Period
└── Default Methods in Interfaces
```

### Java 9-11
```text
├── var (Local variable type inference)
├── Immutable Collections (List.of, Set.of, Map.of)
├── Optional enhancements (ifPresentOrElse, stream)
├── Stream enhancements (takeWhile, dropWhile)
├── HTTP Client API
├── String utilities (isBlank, lines, strip, repeat)
└── Files utilities (readString, writeString)
```

### Java 12-17
```text
├── Switch Expressions
├── Text Blocks (multi-line strings)
├── Records (data classes)
├── Sealed Classes
├── Pattern Matching for instanceof
└── Helpful NullPointerExceptions
```

### Java 21+ (Latest LTS)
```text
├── Virtual Threads (Project Loom)
├── Sequenced Collections
├── Pattern Matching for switch
├── Record Patterns
└── String Templates (preview)
```

### CompletableFuture (Async)
```text
├── Creating async tasks
├── Chaining (thenApply, thenCompose, thenCombine)
├── Exception handling (exceptionally, handle)
├── Combining multiple futures (allOf, anyOf)
└── Timeouts and cancellation
```

---

## Quick Version Comparison

| Feature | Java 8 | Java 11 | Java 17 | Java 21 |
|---------|--------|---------|---------|---------|
| Lambdas | ✅ | ✅ | ✅ | ✅ |
| Streams | ✅ | ✅ | ✅ | ✅ |
| Optional | ✅ | Enhanced | Enhanced | Enhanced |
| var | ❌ | ✅ | ✅ | ✅ |
| Records | ❌ | ❌ | ✅ | ✅ |
| Sealed Classes | ❌ | ❌ | ✅ | ✅ |
| Virtual Threads | ❌ | ❌ | ❌ | ✅ |
| Pattern Matching | ❌ | ❌ | Partial | ✅ |

---

**Next:** [2. Java 8 Features →](./java-8-features)
