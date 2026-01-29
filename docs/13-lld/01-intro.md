---
sidebar_position: 1
title: Syllabus & Overview
description: Complete LLD (Low Level Design) syllabus for SDE 2 Java Backend interviews covering OOP, SOLID, Design Patterns, and practical problems.
keywords: [lld, low level design, oop, solid, design patterns, interview]
---

# PART A — LOW LEVEL DESIGN (LLD)

:::info Interview Importance ⭐⭐⭐⭐⭐
LLD interviews test your ability to write clean, extensible, maintainable code. You'll be asked to design and code real systems in 45-60 minutes.
:::

## Topics Covered

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         LLD SYLLABUS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ 1. OOP FUNDAMENTALS                                                  │
│    ├── Encapsulation - Data hiding                                   │
│    ├── Abstraction - Hide complexity                                 │
│    ├── Inheritance - IS-A relationship                               │
│    ├── Polymorphism - Many forms                                     │
│    └── Composition > Inheritance                                     │
│                                                                      │
│ 2. SOLID PRINCIPLES                                                  │
│    ├── S - Single Responsibility                                     │
│    ├── O - Open/Closed                                               │
│    ├── L - Liskov Substitution                                       │
│    ├── I - Interface Segregation                                     │
│    └── D - Dependency Inversion                                      │
│                                                                      │
│ 3. DESIGN PATTERNS                                                   │
│    ├── Creational: Factory, Builder, Singleton                       │
│    ├── Structural: Adapter, Decorator, Proxy, Facade                 │
│    └── Behavioral: Strategy, Observer, State, Command, Template      │
│                                                                      │
│ 4. SPRING PATTERN MAPPING                                            │
│    ├── Singleton → Spring Beans (default scope)                      │
│    ├── Factory → BeanFactory, ApplicationContext                     │
│    ├── Strategy → @Qualifier for implementations                     │
│    ├── Observer → ApplicationEventPublisher                          │
│    ├── Proxy → @Transactional, @Async, @Cacheable                    │
│    └── Template → JdbcTemplate, RestTemplate                         │
│                                                                      │
│ 5. LLD INTERVIEW PROBLEMS                                            │
│    ├── Parking Lot System                                            │
│    ├── LRU Cache                                                     │
│    ├── Elevator System                                               │
│    ├── BookMyShow (Ticket Booking)                                   │
│    ├── Splitwise (Expense Sharing)                                   │
│    ├── Snake & Ladder Game                                           │
│    └── Vending Machine                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Chapter Overview

| Chapter | Topics | Status |
|---------|--------|--------|
| [2. SOLID & Basic Patterns](./solid-design-patterns) | SOLID principles, Factory, Builder, Singleton, Adapter, Decorator, Strategy, Observer | ✅ Complete |
| [3. OOP Fundamentals](./oop-fundamentals) | Encapsulation, Abstraction, Inheritance, Composition, Polymorphism | ✅ Complete |
| [4. Advanced Patterns](./design-patterns-advanced) | Proxy, Facade, State, Command, Template Method, Spring Integration | ✅ Complete |
| [5. LLD Interview Problems](./lld-interview-problems) | Elevator, BookMyShow, Splitwise, Snake & Ladder, Vending Machine | ✅ Complete |

## LLD Interview Approach

```text
45-MINUTE LLD INTERVIEW FRAMEWORK:

┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  [0-5 min]   CLARIFY REQUIREMENTS                                    │
│              ├── What are the core use cases?                        │
│              ├── What entities are involved?                         │
│              └── Any constraints? Out of scope?                      │
│                                                                      │
│  [5-10 min]  IDENTIFY OBJECTS & RELATIONSHIPS                        │
│              ├── Nouns → Classes                                     │
│              ├── Verbs → Methods                                     │
│              └── Draw simple class diagram                           │
│                                                                      │
│  [10-15 min] DEFINE INTERFACES & ENUMS                               │
│              ├── Define key interfaces                               │
│              ├── Create enums for states                             │
│              └── Plan for extensibility                              │
│                                                                      │
│  [15-40 min] IMPLEMENT CORE CLASSES                                  │
│              ├── Start with main entities                            │
│              ├── Implement key methods                               │
│              ├── Apply design patterns                               │
│              └── Handle edge cases                                   │
│                                                                      │
│  [40-45 min] DISCUSS EXTENSIONS                                      │
│              ├── How to add new features?                            │
│              ├── Concurrency considerations                          │
│              └── Testing approach                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Points to Remember

```text
CLEAN CODE PRINCIPLES:
├── Meaningful names (classes, methods, variables)
├── Small, focused methods (do one thing)
├── DRY - Don't Repeat Yourself
├── YAGNI - You Aren't Gonna Need It
└── Separation of concerns

OOP BEST PRACTICES:
├── Favor composition over inheritance
├── Program to interfaces, not implementations
├── Encapsulate what varies
├── Depend on abstractions
└── Keep classes small and focused

COMMON PATTERNS TO KNOW:
├── Strategy - For swappable algorithms
├── Factory - For object creation
├── Observer - For event notification
├── State - For state-dependent behavior
└── Builder - For complex object construction
```

---

**Next:** [2. SOLID Principles & Design Patterns →](./solid-design-patterns)
