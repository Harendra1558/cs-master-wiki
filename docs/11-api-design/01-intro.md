---
sidebar_position: 1
title: 1. Introduction
description: Master API design - REST best practices, API contracts, versioning, and GraphQL for backend interviews.
keywords: [api design, rest api, openapi, swagger, graphql, api versioning]
---

# API Design

:::info Interview Importance ⭐⭐⭐⭐⭐
API design is one of the most common interview topics. You'll be asked to design APIs for systems and explain best practices for resource naming, error handling, versioning, and documentation.
:::

## Why API Design Matters

```text
APIs are the CONTRACT between your service and the world:

┌─────────────────────────────────────────────────────────────────────┐
│                    API AS THE INTERFACE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Mobile App ────┐                                                  │
│                  │                                                   │
│   Web Client ────┼──→ [ Your API ] ──→ Backend Services            │
│                  │                            │                      │
│   3rd Party ─────┘                            ↓                      │
│                                          Database                    │
│                                                                      │
│   A well-designed API:                                              │
│   ├── Easy to understand and use                                    │
│   ├── Hard to misuse                                                │
│   ├── Consistent across endpoints                                   │
│   ├── Self-documenting                                              │
│   └── Future-proof (can evolve without breaking clients)            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📚 Chapter Overview

| Chapter | Topic | What You'll Learn |
|---------|-------|-------------------|
| [2. REST Best Practices](./rest-best-practices) | RESTful Design | Resource naming, HTTP methods, status codes, pagination, versioning |
| [3. API Contracts & OpenAPI](./api-contracts) | Documentation | OpenAPI/Swagger, schema design, backward compatibility, deprecation |
| [4. GraphQL](./graphql) | Alternative to REST | Query language, N+1 problem, when to use GraphQL vs REST |

---

## 🎯 Syllabus

### REST Best Practices
```text
├── Resource Naming Conventions
├── HTTP Methods (GET, POST, PUT, PATCH, DELETE)
├── Status Codes (2xx, 4xx, 5xx)
├── Error Handling & Response Format
├── Pagination (page-based, cursor-based)
├── Filtering & Sorting
├── API Versioning Strategies
├── Rate Limiting
└── Security (Authentication, Input Validation)
```

### API Contracts & Documentation
```text
├── OpenAPI / Swagger Specification
├── Schema Design (DTOs, Request/Response)
├── API-First Design
├── Contract Testing
├── Backward Compatibility Rules
├── Deprecation Strategy
└── API Changelogs
```

### GraphQL
```text
├── GraphQL vs REST Comparison
├── Queries, Mutations, Subscriptions
├── Schema Definition Language (SDL)
├── N+1 Problem & DataLoader
├── When to Use GraphQL
└── Hybrid Approaches (REST + GraphQL)
```

---

## Quick Comparison: REST vs GraphQL

| Aspect | REST | GraphQL |
|--------|------|---------|
| **Data Fetching** | Multiple endpoints | Single endpoint |
| **Over-fetching** | Common problem | Client specifies exact fields |
| **Under-fetching** | Need multiple calls | Get all data in one query |
| **Versioning** | URL or header based | No versioning (evolve schema) |
| **Caching** | HTTP caching (easy) | Requires client-side caching |
| **Learning Curve** | Low | Medium |
| **Best For** | Simple CRUD, public APIs | Complex relationships, mobile apps |

---

**Next:** [2. REST Best Practices →](./rest-best-practices)
