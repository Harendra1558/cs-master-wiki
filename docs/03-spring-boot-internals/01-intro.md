---
sidebar_position: 1
title: Syllabus & Overview
---

# 3. SPRING BOOT INTERNALS

## Topics Covered

```text
🔹 IOC CONTAINER
    - IOC & Dependency Injection (DI)
    - BeanFactory vs ApplicationContext
    - Bean creation flow
    - Bean lifecycle
    - BeanPostProcessor
    - @PostConstruct vs InitializingBean

🔹 BEAN SCOPE & CONCURRENCY
    - Singleton beans in Spring
    - Thread safety of singleton beans
    - Stateless vs stateful services
    - Request & Prototype scope
    - When singleton beans break in concurrency

🔹 PROXY MECHANISM (VERY IMPORTANT)
    - Why Spring uses proxies
    - JDK Dynamic Proxy
    - CGLIB Proxy
    - Proxy selection rules
    - Limitations of proxies
    - Final methods & classes
    - How @Transactional & @Async depend on proxies

🔹 TRANSACTION MANAGEMENT
    - Spring transaction abstraction
    - @Transactional internals
    - Propagation types (REQUIRED, REQUIRES_NEW, etc.)
    - Rollback rules (checked vs unchecked)
    - Self-invocation problem
    - Transaction boundaries
    - Common real-world failures

🔹 ASYNCHRONOUS PROCESSING
    - @Async working
    - Thread pool configuration
    - Default executor pitfalls
    - Thread pool exhaustion
    - Context loss (SecurityContext, MDC, Transaction)
    - When NOT to use @Async

🔹 SERVLET & WEB MODEL
    - Spring MVC request flow
    - Thread-per-request model
    - Servlet container (Tomcat) basics
    - Blocking vs non-blocking requests
    - Why traditional Spring MVC blocks threads
    - Intro to WebFlux (high-level only)
```

## Interview Focus Areas

| Priority | Topic | Common Questions | Depth Expected |
|----------|-------|------------------|----------------|
| 🔴 HIGH | Proxy Mechanism | Self-invocation, CGLIB vs JDK | Deep |
| 🔴 HIGH | @Transactional | Rollback rules, propagation | Very Deep |
| 🔴 HIGH | Bean Lifecycle | @PostConstruct timing, BeanPostProcessor | Deep |
| 🟡 MEDIUM | Thread Pools | Pool sizing, exhaustion | Practical |
| 🟡 MEDIUM | Singleton Concurrency | Thread safety issues | Production focus |
| 🟢 BASELINE | IoC & DI | BeanFactory vs ApplicationContext | Basics |

## Real-World Debugging Skills Expected

```text
✅ Can explain why @Transactional "doesn't work" in self-invocation
✅ Knows how to debug thread pool exhaustion
✅ Understands why final methods break proxies
✅ Can configure proper connection pool sizing
✅ Knows the difference between request and singleton scope pitfalls
```

## How to Use This Guide

1. **Read in order** - Topics build on each other
2. **Try the code examples** - Don't just read, implement
3. **Focus on "Why" sections** - Interviewers test understanding, not memorization
4. **Practice explaining** - Use the "How to explain in interview" sections

### Status
✅ Content Complete - Interview Ready
