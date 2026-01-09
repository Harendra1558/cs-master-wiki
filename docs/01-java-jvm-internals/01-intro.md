---
sidebar_position: 1
title: Syllabus & Overview
---

# 1. JAVA & JVM INTERNALS

## Topics Covered

```text
JVM MEMORY MODEL
- Heap
  - Young Gen (Eden, Survivor)
  - Old Gen
- Stack
- Metaspace
- Code Cache
- Minor GC vs Major GC
- Stop-The-World (STW) pauses

MEMORY LEAK PATTERNS
- Static references
- Growing collections
- Cache without eviction
- ThreadLocal leaks
- ClassLoader leaks

COMMON SYMPTOMS
- Old Gen growth
- Frequent Full GC
- Memory not reclaimed

FALSE SHARING
- CPU cache lines
- Cache contention
- Padding
- @Contended

JAVA MEMORY MODEL (JMM)
- Visibility vs Atomicity
- volatile
- synchronized
- Happens-before

JAVA CONCURRENCY
- CAS
- AtomicInteger
- AQS
- ReentrantLock
- Semaphore
- ForkJoinPool
- Parallel Streams
```

### Status
🚧 Content Map Created - Implementation In Progress
