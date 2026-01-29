---
sidebar_position: 1
title: 1. Introduction
description: Master Operating System concepts for backend interviews - processes, threads, memory, I/O, and Linux internals.
keywords: [operating systems, processes, threads, memory, linux, system calls]
---

# Operating Systems

:::info Interview Importance ⭐⭐⭐⭐
OS fundamentals are crucial for understanding application performance, debugging issues, and making informed design decisions. These concepts directly apply to JVM tuning, container sizing, and troubleshooting production systems.
:::

## Why OS Knowledge Matters for Backend Developers

```text
┌─────────────────────────────────────────────────────────────────────┐
│                YOUR APPLICATION RUNS ON AN OS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Your Spring Boot App                                               │
│         │                                                            │
│         ├── Uses THREADS → Need to understand scheduling            │
│         │                                                            │
│         ├── Uses MEMORY → Need to understand virtual memory, GC     │
│         │                                                            │
│         ├── Opens CONNECTIONS → File descriptors, ulimit            │
│         │                                                            │
│         └── Makes SYSCALLS → User/kernel mode switching             │
│                                                                      │
│   Problems you'll face:                                              │
│   ├── "Too many open files" error                                   │
│   ├── OOM Killer terminating your app                               │
│   ├── High CPU with low throughput (context switching)              │
│   ├── Mysterious latency spikes                                     │
│   └── Container memory limits vs JVM heap sizing                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📚 Chapter Overview

| Chapter | Topic | What You'll Learn |
|---------|-------|-------------------|
| [2. Processes & Threads](./processes-threads) | Concurrency Basics | Process vs thread, context switching, CPU vs I/O bound, thread pool sizing |
| [3. Memory Management](./memory-management) | Virtual Memory | Paging, TLB, swapping, OOM Killer, JVM memory layout |
| [4. File Descriptors & I/O](./file-descriptors-io) | I/O Operations | File descriptors, ulimit, I/O models, epoll |
| [5. System Calls](./system-calls) | Kernel Interface | User vs kernel mode, common syscalls, performance impact |

---

## 🎯 Syllabus

### Processes & Threads
```text
├── Process vs Thread Comparison
├── Context Switching (cost, causes)
├── CPU-Bound vs I/O-Bound Tasks
├── Thread Pool Sizing Formula
├── Process States & Lifecycle
├── Scheduling Algorithms (CFS)
└── Linux Process Commands (ps, top, htop)
```

### Memory Management
```text
├── Virtual Memory Concepts
├── Paging & Page Tables
├── TLB (Translation Lookaside Buffer)
├── Page Faults (minor vs major)
├── Swapping & Swappiness
├── OOM Killer (how to avoid/protect)
└── JVM Memory in Linux Containers
```

### File Descriptors & I/O
```text
├── What are File Descriptors?
├── ulimit Configuration
├── "Too Many Open Files" Error
├── I/O Models (blocking, non-blocking, async)
├── select, poll, epoll
└── Linux I/O Commands (lsof, ss)
```

### System Calls
```text
├── User Mode vs Kernel Mode
├── System Call Overhead
├── Common System Calls
├── strace for Debugging
└── Performance Implications
```

---

## Quick Reference: Essential Linux Commands

```bash
# Process Monitoring
ps aux                    # List all processes
top / htop               # Real-time monitoring
pstree -p <PID>          # Process tree

# Memory
free -h                  # Memory overview
vmstat 1                 # Virtual memory stats
cat /proc/meminfo        # Detailed memory info

# File Descriptors
lsof -p <PID>            # Open files for process
ulimit -n                # Max open files limit
cat /proc/<PID>/fd       # List file descriptors

# Performance
strace -p <PID>          # Trace system calls
perf top                 # CPU profiling
iostat 1                 # I/O statistics
```

---

**Next:** [2. Processes & Threads →](./processes-threads)
