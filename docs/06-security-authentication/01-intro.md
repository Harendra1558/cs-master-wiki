---
sidebar_position: 1
title: 1. Introduction
description: Master security, authentication, and authorization for backend interviews.
keywords: [security, authentication, jwt, oauth2, spring security, owasp]
---

# Security & Authentication

:::danger Security is Critical ⭐⭐⭐⭐⭐
Security vulnerabilities can destroy companies. A single breach can cost millions and destroy reputation. This is a **must-know topic** for every backend interview.
:::

## Why Security Matters

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    SECURITY BREACH IMPACT                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   2023 Average Data Breach Cost: $4.45 Million (IBM)                │
│                                                                      │
│   Common Attack Vectors:                                             │
│   ├── Stolen credentials (19%)                                      │
│   ├── Phishing (16%)                                                │
│   ├── Cloud misconfiguration (15%)                                  │
│   └── Application vulnerabilities (12%)                             │
│                                                                      │
│   Time to Identify Breach: 204 days (average)                       │
│   Time to Contain: 73 days (average)                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📚 Chapter Overview

| Chapter | Topic | What You'll Learn |
|---------|-------|-------------------|
| [2. Authentication Fundamentals](./auth-security) | Core Concepts | JWT, OAuth2, Password Security, Basic Vulnerabilities |
| [3. CORS Deep Dive](./cors-deep-dive) | Cross-Origin | Same-Origin Policy, Preflight, Spring CORS Config |
| [4. OAuth 2.0 & OIDC](./oauth2-oidc-deep-dive) | Modern Auth | Grant Types, PKCE, OpenID Connect, Token Management |
| [5. Spring Security Deep Dive](./spring-security-deep-dive) | Implementation | Filter Chain, Method Security, Custom Authentication |
| [6. API Security & OWASP](./api-security-owasp) | Defense | OWASP Top 10, Rate Limiting, Secrets Management |

---

## 🎯 Syllabus

### Authentication & Token Management
```text
├── Authentication vs Authorization
├── Session-based vs Token-based Auth
├── JWT (JSON Web Tokens)
│   ├── Structure & Claims
│   ├── Signing Algorithms (HS256, RS256)
│   ├── Access & Refresh Tokens
│   └── Token Storage & Security
├── Password Security
│   ├── Hashing (BCrypt, Argon2)
│   ├── Salting
│   └── Password Policies
└── Multi-Factor Authentication (MFA)
```

### OAuth 2.0 & OpenID Connect
```text
├── OAuth 2.0 Grant Types
│   ├── Authorization Code (+ PKCE)
│   ├── Client Credentials
│   ├── Refresh Token
│   └── (Deprecated: Implicit, Password)
├── OpenID Connect
│   ├── ID Token
│   ├── UserInfo Endpoint
│   └── Standard Claims
├── Token Revocation
└── Single Sign-On (SSO)
```

### Spring Security
```text
├── Security Filter Chain
├── Authentication Providers
├── Authorization
│   ├── URL-based (@RequestMapping)
│   └── Method-based (@PreAuthorize)
├── Custom Filters
├── Exception Handling
└── Integration with OAuth2/JWT
```

### API Security & OWASP
```text
├── OWASP Top 10
│   ├── Injection (SQL, Command)
│   ├── Broken Authentication
│   ├── XSS (Stored, Reflected, DOM)
│   ├── CSRF
│   ├── SSRF
│   └── Security Misconfiguration
├── Defense in Depth
├── Rate Limiting
├── Input Validation
├── Secrets Management
└── Security Headers
```

### CORS (Cross-Origin Resource Sharing)
```text
├── Same-Origin Policy
├── Simple vs Preflight Requests
├── CORS Headers
├── Credentials & Cookies
└── Spring CORS Configuration
```

---

## Authentication vs Authorization

| Authentication | Authorization |
|----------------|---------------|
| **Who are you?** | **What can you do?** |
| Verify identity | Verify permissions |
| Login, JWT validation | Role checks, ACLs |
| Returns: 401 Unauthorized | Returns: 403 Forbidden |

```java
// Authentication: Verify identity
User user = authService.authenticate(token);  // Who is this?

// Authorization: Check permissions
if (!user.hasPermission("DELETE_USER")) {
    throw new AccessDeniedException("Insufficient permissions");  // What can they do?
}
```

---

## Quick Reference: HTTP Security Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 401 | Unauthorized | No auth provided or invalid token |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 419 | Authentication Timeout | Session expired (non-standard) |
| 429 | Too Many Requests | Rate limit exceeded |

---

**Next:** [2. Authentication Fundamentals →](./auth-security)
