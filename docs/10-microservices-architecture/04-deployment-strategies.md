---
title: 4. Deployment Strategies
sidebar_position: 4
description: Master Blue-Green, Canary, Rolling Updates, and Feature Flags for microservices interviews.
keywords: [blue-green deployment, canary release, rolling update, feature flags, kubernetes deployment]
---

# Deployment Strategies

:::info DevOps Essential
Deployment strategies are asked in **every system design interview**. Know the trade-offs between Blue-Green, Canary, and Rolling Updates.
:::

## 1. Deployment Strategies Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT STRATEGIES                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BLUE-GREEN:          CANARY:             ROLLING:                  │
│  ┌───────┐            ┌───────┐           ┌───────┐                 │
│  │ Blue  │ 100%       │ Old   │ 90%       │  v1   │ 75%             │
│  │ (old) │────►       │ (v1)  │────►      │       │────►            │
│  └───────┘            └───────┘           └───────┘                 │
│                                                                      │
│  ┌───────┐            ┌───────┐           ┌───────┐                 │
│  │ Green │ 0%         │ New   │ 10%       │  v2   │ 25%             │
│  │ (new) │            │ (v2)  │           │       │                 │
│  └───────┘            └───────┘           └───────┘                 │
│                                                                      │
│  Switch all at once   Gradual increase    Replace one by one        │
│  Instant rollback     Monitor & increase  Gradual rollback          │
│  2x resources         Minimal extra       No extra resources        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Comparison Table

| Strategy | Rollback Speed | Resource Cost | Risk | Best For |
|----------|---------------|---------------|------|----------|
| **Blue-Green** | Instant | 2x (duplicate env) | Low | Critical services |
| **Canary** | Fast | 10-20% extra | Medium | User-facing features |
| **Rolling** | Slow | None | Higher | Internal services |
| **Feature Flags** | Instant | None | Low | Any feature |

---

## 2. Blue-Green Deployment

### How It Works

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    BLUE-GREEN DEPLOYMENT                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: Deploy new version to Green                                │
│                                                                      │
│  ┌────────────────┐                                                  │
│  │  Load Balancer │                                                  │
│  └───────┬────────┘                                                  │
│          │ 100%                                                      │
│          ▼                                                           │
│  ┌───────────────┐      ┌───────────────┐                           │
│  │   BLUE (v1)   │      │  GREEN (v2)   │ ← Deploy here            │
│  │   (active)    │      │  (staging)    │                           │
│  └───────────────┘      └───────────────┘                           │
│                                                                      │
│  STEP 2: Test Green, then switch traffic                            │
│                                                                      │
│  ┌────────────────┐                                                  │
│  │  Load Balancer │                                                  │
│  └───────┬────────┘                                                  │
│          │ 100%                                                      │
│          ▼                                                           │
│  ┌───────────────┐      ┌───────────────┐                           │
│  │   BLUE (v1)   │      │  GREEN (v2)   │                           │
│  │  (standby)    │      │   (active)    │ ← All traffic            │
│  └───────────────┘      └───────────────┘                           │
│                                                                      │
│  ROLLBACK: Just switch back to Blue! (instant)                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Kubernetes Implementation

```yaml
# Service pointing to active deployment
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
    version: green    # Switch this to rollback!
  ports:
    - port: 80
      targetPort: 8080

---
# Blue deployment (old version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
      version: blue
  template:
    metadata:
      labels:
        app: order-service
        version: blue
    spec:
      containers:
        - name: order-service
          image: order-service:1.0.0

---
# Green deployment (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
      version: green
  template:
    metadata:
      labels:
        app: order-service
        version: green
    spec:
      containers:
        - name: order-service
          image: order-service:2.0.0
```

### Deployment Script

```bash
#!/bin/bash
# blue-green-deploy.sh

NEW_VERSION=$1
CURRENT=$(kubectl get svc order-service -o jsonpath='{.spec.selector.version}')
NEW_COLOR=$([ "$CURRENT" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT, New: $NEW_COLOR"

# 1. Deploy to inactive color
kubectl set image deployment/order-service-$NEW_COLOR \
    order-service=order-service:$NEW_VERSION

# 2. Wait for rollout
kubectl rollout status deployment/order-service-$NEW_COLOR

# 3. Run smoke tests
if ./smoke-tests.sh order-service-$NEW_COLOR; then
    # 4. Switch traffic
    kubectl patch svc order-service \
        -p "{\"spec\":{\"selector\":{\"version\":\"$NEW_COLOR\"}}}"
    echo "Switched to $NEW_COLOR"
else
    echo "Smoke tests failed! Rollback..."
    exit 1
fi
```

---

## 3. Canary Deployment

### How It Works

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      CANARY DEPLOYMENT                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Phase 1: 5% traffic to canary                                      │
│  ┌────────────────┐                                                  │
│  │  Load Balancer │                                                  │
│  └───────┬────────┘                                                  │
│      95% │    │ 5%                                                   │
│          ▼    ▼                                                      │
│  ┌──────────┐  ┌──────────┐                                         │
│  │ v1 (Prod)│  │v2 (Canary)│ ← Monitor errors, latency             │
│  │ 9 pods   │  │ 1 pod     │                                         │
│  └──────────┘  └──────────┘                                         │
│                                                                      │
│  Phase 2: If healthy, increase to 25%                               │
│      75% │    │ 25%                                                  │
│          ▼    ▼                                                      │
│  ┌──────────┐  ┌──────────┐                                         │
│  │ v1 (Prod)│  │v2 (Canary)│                                        │
│  │ 7 pods   │  │ 3 pods    │                                         │
│  └──────────┘  └──────────┘                                         │
│                                                                      │
│  Phase 3: Gradually increase to 100%                                │
│  Phase 4: Remove v1                                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Istio Traffic Splitting

```yaml
# VirtualService for traffic splitting
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
    - order-service
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: order-service
            subset: canary
    - route:
        - destination:
            host: order-service
            subset: stable
          weight: 95
        - destination:
            host: order-service
            subset: canary
          weight: 5

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
```

### Automated Canary with Flagger

```yaml
# Flagger Canary resource
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: order-service
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  service:
    port: 80
  analysis:
    # Canary analysis settings
    interval: 1m
    threshold: 5          # Max failed checks before rollback
    maxWeight: 50         # Max traffic percentage
    stepWeight: 10        # Increase by 10% each step
    
    metrics:
      - name: request-success-rate
        threshold: 99     # Rollback if success rate < 99%
        interval: 1m
      - name: request-duration
        threshold: 500    # Rollback if p99 > 500ms
        interval: 1m
    
    webhooks:
      - name: load-test
        url: http://flagger-loadtester/
        metadata:
          cmd: "hey -z 1m -q 10 http://order-service-canary/"
```

### Manual Canary Script

```java
// Feature-based canary in code
@Service
public class CanaryRouter {
    
    @Value("${canary.percentage:5}")
    private int canaryPercentage;
    
    @Autowired
    private UserClient stableClient;
    
    @Autowired
    private UserClient canaryClient;
    
    public User getUser(Long userId, String requestId) {
        // Consistent routing based on request ID
        int hash = Math.abs(requestId.hashCode() % 100);
        
        if (hash < canaryPercentage) {
            log.info("Routing to canary: {}", requestId);
            return canaryClient.getUser(userId);
        }
        
        return stableClient.getUser(userId);
    }
}
```

---

## 4. Rolling Update

### How It Works

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      ROLLING UPDATE                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Start:   [v1] [v1] [v1] [v1]   ← 4 pods running v1                │
│                                                                      │
│  Step 1:  [v2] [v1] [v1] [v1]   ← 1 new pod comes up               │
│                      ↓           ← 1 old pod terminates             │
│  Step 2:  [v2] [v2] [v1] [v1]   ← Continue...                      │
│                      ↓                                               │
│  Step 3:  [v2] [v2] [v2] [v1]                                       │
│                      ↓                                               │
│  Step 4:  [v2] [v2] [v2] [v2]   ← All pods running v2              │
│                                                                      │
│  During update: Mix of v1 and v2 serving traffic                    │
│  Rollback: Reverse the process (slower than Blue-Green)             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Kubernetes RollingUpdate

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1   # Max pods unavailable during update
      maxSurge: 1         # Max extra pods during update
  
  template:
    spec:
      containers:
        - name: order-service
          image: order-service:2.0.0
          
          # Crucial for zero-downtime
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          
          # Graceful shutdown
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
          
          terminationGracePeriodSeconds: 30
```

### Graceful Shutdown in Spring Boot

```java
// application.yml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s

// Programmatic graceful shutdown
@Component
public class GracefulShutdown implements ApplicationListener<ContextClosedEvent> {
    
    @Autowired
    private ExecutorService executorService;
    
    @Override
    public void onApplicationEvent(ContextClosedEvent event) {
        log.info("Shutting down gracefully...");
        
        // Stop accepting new requests
        // Complete in-flight requests
        executorService.shutdown();
        
        try {
            if (!executorService.awaitTermination(25, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
        }
        
        log.info("Graceful shutdown complete");
    }
}
```

---

## 5. Feature Flags

### Why Feature Flags?

```text
┌─────────────────────────────────────────────────────────────────────┐
│                       FEATURE FLAGS                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Problems solved:                                                    │
│  ├── Deploy code without releasing feature                          │
│  ├── A/B testing different implementations                          │
│  ├── Gradual rollout to percentage of users                        │
│  ├── Kill switch for problematic features                          │
│  └── Different features for different user tiers                   │
│                                                                      │
│  Example:                                                            │
│  if (featureFlags.isEnabled("new-checkout", user)) {                │
│      return newCheckoutFlow(order);                                 │
│  } else {                                                            │
│      return legacyCheckoutFlow(order);                              │
│  }                                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementation with LaunchDarkly/Unleash

```java
// Feature flag service
@Service
public class FeatureFlagService {
    
    @Autowired
    private UnleashClient unleash;
    
    // Simple on/off
    public boolean isEnabled(String feature) {
        return unleash.isEnabled(feature);
    }
    
    // User-specific
    public boolean isEnabled(String feature, User user) {
        UnleashContext context = UnleashContext.builder()
            .userId(user.getId().toString())
            .addProperty("tier", user.getTier().name())
            .addProperty("country", user.getCountry())
            .build();
        
        return unleash.isEnabled(feature, context);
    }
    
    // Get variant (A/B testing)
    public String getVariant(String feature, User user) {
        UnleashContext context = UnleashContext.builder()
            .userId(user.getId().toString())
            .build();
        
        Variant variant = unleash.getVariant(feature, context);
        return variant.getName();  // "control", "variant-a", "variant-b"
    }
}

// Usage in controller
@RestController
public class CheckoutController {
    
    @Autowired
    private FeatureFlagService flags;
    
    @PostMapping("/checkout")
    public CheckoutResult checkout(@RequestBody Order order, 
                                   @AuthenticatedUser User user) {
        
        if (flags.isEnabled("new-checkout-flow", user)) {
            log.info("Using new checkout for user {}", user.getId());
            return newCheckoutService.process(order);
        }
        
        return legacyCheckoutService.process(order);
    }
}
```

### Simple Custom Implementation

```java
// Redis-based feature flags
@Service
public class SimpleFeatureFlags {
    
    @Autowired
    private StringRedisTemplate redis;
    
    private static final String PREFIX = "feature:";
    
    // Toggle feature on/off
    public void setEnabled(String feature, boolean enabled) {
        redis.opsForValue().set(PREFIX + feature, String.valueOf(enabled));
    }
    
    // Check if feature is enabled
    public boolean isEnabled(String feature) {
        String value = redis.opsForValue().get(PREFIX + feature);
        return "true".equals(value);
    }
    
    // Percentage rollout
    public boolean isEnabled(String feature, String userId, int percentage) {
        if (percentage >= 100) return true;
        if (percentage <= 0) return false;
        
        // Consistent hashing ensures same user always gets same result
        int hash = Math.abs((feature + userId).hashCode() % 100);
        return hash < percentage;
    }
    
    // User whitelist
    public boolean isEnabledForUser(String feature, String userId) {
        return redis.opsForSet()
            .isMember(PREFIX + feature + ":users", userId);
    }
    
    public void enableForUser(String feature, String userId) {
        redis.opsForSet()
            .add(PREFIX + feature + ":users", userId);
    }
}
```

### Feature Flag Cleanup

```java
// Track feature flag usage
@Aspect
@Component
public class FeatureFlagAudit {
    
    @Around("@annotation(FeatureFlag)")
    public Object auditFeatureFlag(ProceedingJoinPoint pjp, 
                                   FeatureFlag flag) throws Throwable {
        
        String featureName = flag.value();
        LocalDate today = LocalDate.now();
        
        // Track last usage
        redis.opsForValue().set(
            "feature:audit:" + featureName + ":lastUsed",
            today.toString()
        );
        
        return pjp.proceed();
    }
}

// Scheduled cleanup job
@Scheduled(cron = "0 0 0 * * SUN")  // Weekly
public void reportStaleFeatureFlags() {
    Set<String> features = redis.keys("feature:*");
    
    for (String feature : features) {
        String lastUsed = redis.opsForValue()
            .get("feature:audit:" + feature + ":lastUsed");
        
        if (lastUsed != null) {
            LocalDate lastUsedDate = LocalDate.parse(lastUsed);
            if (lastUsedDate.isBefore(LocalDate.now().minusMonths(3))) {
                log.warn("Stale feature flag: {} (last used: {})", 
                    feature, lastUsed);
            }
        }
    }
}
```

---

## 6. Configuration Management

### Spring Cloud Config

```yaml
# config-server/application.yml
spring:
  cloud:
    config:
      server:
        git:
          uri: https://github.com/company/config-repo
          default-label: main
          search-paths: '{application}'

# Client service configuration
spring:
  application:
    name: order-service
  config:
    import: "configserver:http://config-server:8888"
  cloud:
    config:
      fail-fast: true
      retry:
        max-attempts: 5
```

```java
// Refresh configuration at runtime
@RestController
@RefreshScope
public class ConfigController {
    
    @Value("${order.max-items:10}")
    private int maxItems;
    
    @Value("${order.timeout-seconds:30}")
    private int timeoutSeconds;
    
    @GetMapping("/config")
    public Map<String, Object> getConfig() {
        return Map.of(
            "maxItems", maxItems,
            "timeoutSeconds", timeoutSeconds
        );
    }
}

// Trigger refresh: POST /actuator/refresh
// Or use Spring Cloud Bus for cluster-wide refresh
```

### Environment-Specific Configs

```yaml
# base config: application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/orders

---
# application-dev.yml
spring:
  config:
    activate:
      on-profile: dev
  datasource:
    url: jdbc:postgresql://dev-db:5432/orders
logging:
  level:
    root: DEBUG

---
# application-prod.yml  
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: jdbc:postgresql://prod-db:5432/orders
logging:
  level:
    root: INFO
```

---

## 7. Interview Questions

### Q1: How would you deploy a critical payment service with zero downtime?

```text
Answer:
"For a critical payment service, I'd use Blue-Green deployment:

1. PREPARATION:
   - Maintain two identical environments (Blue/Green)
   - Blue is currently serving production traffic

2. DEPLOYMENT:
   - Deploy v2 to Green environment
   - Run full integration test suite
   - Perform load testing to verify performance
   - Validate with synthetic transactions

3. SWITCH:
   - Update load balancer to point to Green
   - Monitor error rates and latency closely
   - Keep Blue running for 30 minutes

4. ROLLBACK PLAN:
   - If issues detected, switch back to Blue (instant)
   - No data loss since both share same database

5. DATABASE CHANGES:
   - Use expand-contract pattern
   - Add new columns first (expand)
   - Deploy app that uses both
   - Remove old columns later (contract)

Why Blue-Green over Canary for payments?
- Instant rollback is critical
- Inconsistent behavior between v1/v2 could cause issues
- Worth the 2x infrastructure cost for reliability"
```

### Q2: When would you use feature flags vs canary deployment?

```text
Answer:
"Both control feature rollout, but serve different purposes:

FEATURE FLAGS when:
├── Feature spans multiple services
├── Need user-specific targeting (premium users first)
├── Want to deploy code without releasing
├── Need kill switch for instant disable
├── A/B testing different implementations
└── Long-lived toggles (subscription tiers)

CANARY DEPLOYMENT when:
├── Infrastructure or performance changes
├── Testing under real production load
├── No user-specific targeting needed
├── Want automated rollback based on metrics
└── Temporary during deployment only

COMBINED APPROACH (best practice):
1. Deploy code with feature flag (disabled)
2. Canary deploy the binary (5% traffic)
3. Enable flag for 1% of canary users
4. Monitor, then gradually increase both
5. Remove flag after feature is stable

Example: New recommendation algorithm
- Deploy behind feature flag
- Enable for 1% of users on canary pods
- Monitor conversion rate and latency
- If successful, increase to 100%"
```

### Q3: How do you handle database schema changes during deployment?

```text
Answer:
"I use the Expand-Contract (parallel change) pattern:

NEVER DO:
- Rename column in one deploy
- Drop column immediately
- Change column type directly

EXPAND-CONTRACT STEPS:

1. EXPAND (v1.1):
   - Add new column 'email_new'
   - Deploy app that writes to BOTH columns
   - Backfill existing data
   
2. MIGRATE (v1.2):
   - Deploy app that reads from new, writes to both
   - Verify data consistency
   
3. CONTRACT (v1.3):
   - Deploy app that only uses new column
   - Drop old column (or keep for audit)

TOOLING:
- Flyway/Liquibase for versioned migrations
- Feature flags to control which column to read
- Monitoring for query errors

ROLLBACK SAFETY:
- At each step, old app version still works
- Can rollback without data loss
- Takes longer but zero-downtime guaranteed"
```

---

## Quick Reference Card

```text
┌──────────────────────────────────────────────────────────────────────┐
│               DEPLOYMENT STRATEGIES CHEAT SHEET                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ BLUE-GREEN:                                                           │
│   ├── Two identical environments                                     │
│   ├── Switch all traffic at once                                    │
│   ├── Instant rollback                                               │
│   └── Best for: Critical services, instant rollback needed          │
│                                                                       │
│ CANARY:                                                               │
│   ├── Route small % to new version                                  │
│   ├── Monitor metrics, gradually increase                           │
│   ├── Automated rollback with Flagger                               │
│   └── Best for: User-facing features, gradual validation            │
│                                                                       │
│ ROLLING UPDATE:                                                       │
│   ├── Replace pods one by one                                       │
│   ├── maxUnavailable + maxSurge settings                            │
│   ├── Requires proper readiness probes                              │
│   └── Best for: Stateless services, resource-efficient              │
│                                                                       │
│ FEATURE FLAGS:                                                        │
│   ├── Deploy code separately from release                           │
│   ├── User-specific targeting                                       │
│   ├── Instant enable/disable                                        │
│   └── Best for: A/B testing, gradual rollout, kill switch           │
│                                                                       │
│ KUBERNETES SETTINGS:                                                  │
│   maxUnavailable: 1     # Max pods down during update               │
│   maxSurge: 1           # Max extra pods during update              │
│   readinessProbe        # Required for zero-downtime                │
│   terminationGrace: 30s # Time for graceful shutdown                │
│                                                                       │
│ DATABASE CHANGES:                                                     │
│   Expand-Contract pattern                                            │
│   1. Add new column → 2. Migrate data → 3. Drop old column          │
│   Never break backward compatibility                                 │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Next:** [11. API Design →](../11-api-design/01-intro.md)
