---
title: "5. Normalization & Database Design"
sidebar_position: 6
description: Normal Forms, Denormalization, and Database Design Principles
---

# Normalization & Database Design

:::info Interview Importance ⭐⭐⭐⭐
Normalization is a classic database interview topic. Understanding when to normalize vs denormalize shows you understand trade-offs.
:::

---

## 1. What is Normalization?

**Simple Answer:** Normalization is organizing data to **reduce redundancy** and **improve data integrity**.

**Interview Answer:** Normalization is the process of structuring a relational database to minimize data redundancy and dependency by dividing large tables into smaller ones and defining relationships between them.

### Why Normalize?

**Problems Without Normalization:**

```
UNNORMALIZED TABLE: orders
┌─────────────────────────────────────────────────────────────────────────┐
│ order_id │ customer_name │ customer_email  │ product_name │ product_price│
├─────────────────────────────────────────────────────────────────────────┤
│    1     │ John Doe      │ john@email.com  │ iPhone 15    │    999      │
│    2     │ John Doe      │ john@email.com  │ MacBook Pro  │   2499      │
│    3     │ John Doe      │ john@new.com    │ AirPods      │    249      │ ← Email changed?
│    4     │ Jane Smith    │ jane@email.com  │ iPhone 15    │    899      │ ← Price different?
└─────────────────────────────────────────────────────────────────────────┘

Problems:
1. UPDATE ANOMALY: John's email changed - update all rows or inconsistency!
2. INSERT ANOMALY: Can't add customer without an order
3. DELETE ANOMALY: If John's only order is deleted, customer info is lost
4. STORAGE WASTE: Customer info repeated in every order
5. DATA INCONSISTENCY: iPhone 15 has two different prices!
```

---

## 2. Normal Forms

### First Normal Form (1NF)

**Rule:** 
- Each column contains **atomic (indivisible) values**
- No **repeating groups** or arrays
- Each row is unique (has primary key)

**❌ Violates 1NF:**

```
┌─────────────────────────────────────────────────────┐
│ order_id │ customer_name │ products                 │
├─────────────────────────────────────────────────────┤
│    1     │ John Doe      │ iPhone, MacBook, AirPods │ ← Multiple values!
└─────────────────────────────────────────────────────┘
```

**✅ In 1NF:**

```
┌─────────────────────────────────────────┐
│ order_id │ customer_name │ product      │
├─────────────────────────────────────────┤
│    1     │ John Doe      │ iPhone       │
│    1     │ John Doe      │ MacBook      │
│    1     │ John Doe      │ AirPods      │
└─────────────────────────────────────────┘
```

### Second Normal Form (2NF)

**Rule:**
- Must be in 1NF
- No **partial dependencies** (all non-key columns depend on the ENTIRE primary key)

**❌ Violates 2NF:**

```
Composite Primary Key: (order_id, product_id)

┌───────────────────────────────────────────────────────────────┐
│ order_id │ product_id │ product_name │ product_price │ qty   │
├───────────────────────────────────────────────────────────────┤
│    1     │    101     │ iPhone       │     999       │   2   │
│    2     │    101     │ iPhone       │     999       │   1   │
└───────────────────────────────────────────────────────────────┘
              ↑                ↑              ↑            ↑
         Part of PK      Depends only     Depends only   Depends on
                         on product_id!   on product_id!  full PK ✓

product_name and product_price depend only on product_id, not the full key!
```

**✅ In 2NF:**

```
ORDERS table:
┌────────────────────────────────────┐
│ order_id │ product_id │ quantity   │
├────────────────────────────────────┤
│    1     │    101     │     2      │
│    2     │    101     │     1      │
└────────────────────────────────────┘

PRODUCTS table:
┌────────────────────────────────────┐
│ product_id │ product_name │ price  │
├────────────────────────────────────┤
│    101     │ iPhone       │  999   │
└────────────────────────────────────┘
```

### Third Normal Form (3NF)

**Rule:**
- Must be in 2NF
- No **transitive dependencies** (non-key → non-key dependencies)

**❌ Violates 3NF:**

```
┌────────────────────────────────────────────────────────────────┐
│ employee_id │ department_id │ department_name │ dept_manager   │
├────────────────────────────────────────────────────────────────┤
│    E001     │     D01       │ Engineering     │ Alice          │
│    E002     │     D01       │ Engineering     │ Alice          │
│    E003     │     D02       │ Sales           │ Bob            │
└────────────────────────────────────────────────────────────────┘

employee_id (PK) → department_id → department_name
                                 → dept_manager

department_name depends on department_id, not on employee_id!
This is a transitive dependency.
```

**✅ In 3NF:**

```
EMPLOYEES table:
┌──────────────────────────────┐
│ employee_id │ department_id  │
├──────────────────────────────┤
│    E001     │     D01        │
│    E002     │     D01        │
│    E003     │     D02        │
└──────────────────────────────┘

DEPARTMENTS table:
┌─────────────────────────────────────────────┐
│ department_id │ department_name │ manager   │
├─────────────────────────────────────────────┤
│     D01       │ Engineering     │ Alice     │
│     D02       │ Sales           │ Bob       │
└─────────────────────────────────────────────┘
```

### Boyce-Codd Normal Form (BCNF)

**Rule:**
- Must be in 3NF
- For every dependency A → B, A must be a **superkey**

**BCNF vs 3NF:**
- 3NF allows: non-prime → prime if prime is part of candidate key
- BCNF: stricter, every determinant must be a key

```
Example violating BCNF but satisfying 3NF:

┌─────────────────────────────────────────────────┐
│ student │ subject │ teacher                     │
├─────────────────────────────────────────────────┤
│ John    │ Math    │ Mr. Smith                   │
│ Jane    │ Math    │ Mr. Smith                   │
│ John    │ Physics │ Ms. Jones                   │
└─────────────────────────────────────────────────┘

Candidate Key: (student, subject)
Dependency: subject → teacher (determines teacher)

teacher depends on subject, but subject is not a superkey!
Violates BCNF.
```

### Normal Forms Summary

| Form | Rule | Eliminates |
|------|------|------------|
| **1NF** | Atomic values, no repeating groups | Repeating groups |
| **2NF** | 1NF + No partial dependencies | Partial dependencies |
| **3NF** | 2NF + No transitive dependencies | Transitive dependencies |
| **BCNF** | Every determinant is a key | Remaining anomalies |

### Quick Memory Trick

**"The key, the whole key, and nothing but the key"**
- 1NF: Has a key
- 2NF: Depends on the WHOLE key
- 3NF: Depends on NOTHING BUT the key

---

## 3. Denormalization

### What is Denormalization?

**Intentionally adding redundancy** to improve read performance at the cost of write complexity.

### When to Denormalize

| Scenario | Denormalize? |
|----------|-------------|
| Read-heavy workload (99% reads) | ✅ Yes |
| Frequent JOINs slowing queries | ✅ Yes |
| Write-heavy workload | ❌ No |
| Data changes frequently | ❌ No |
| Data integrity is critical | ❌ No |

### Denormalization Example

**Normalized (slow reads):**

```sql
-- 3 JOINs needed!
SELECT o.id, c.name, c.email, p.name as product, p.price
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.id = 1;
```

**Denormalized (fast reads):**

```sql
-- All data in one table
SELECT id, customer_name, customer_email, product_snapshot
FROM orders_denormalized
WHERE id = 1;
```

```
ORDERS_DENORMALIZED table:
┌───────────────────────────────────────────────────────────────────────┐
│ id │ customer_name │ customer_email │ product_snapshot (JSON)         │
├───────────────────────────────────────────────────────────────────────┤
│  1 │ John Doe      │ john@email.com │ {"name":"iPhone","price":999}   │
└───────────────────────────────────────────────────────────────────────┘
```

### Denormalization Strategies

#### 1. Duplicate Columns

```sql
-- Add frequently needed data to the same table
ALTER TABLE orders ADD COLUMN customer_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN customer_email VARCHAR(100);

-- Now no JOIN needed for common queries
SELECT id, customer_name FROM orders WHERE id = 1;
```

#### 2. Pre-computed Aggregates

```sql
-- Instead of COUNT(*) on every query
ALTER TABLE products ADD COLUMN review_count INT DEFAULT 0;
ALTER TABLE products ADD COLUMN avg_rating DECIMAL(2,1) DEFAULT 0.0;

-- Update on new review
UPDATE products 
SET review_count = review_count + 1,
    avg_rating = (avg_rating * (review_count - 1) + NEW.rating) / review_count
WHERE id = NEW.product_id;
```

#### 3. Materialized Views

```sql
-- PostgreSQL
CREATE MATERIALIZED VIEW product_stats AS
SELECT 
    p.id,
    p.name,
    COUNT(r.id) as review_count,
    AVG(r.rating) as avg_rating
FROM products p
LEFT JOIN reviews r ON p.id = r.product_id
GROUP BY p.id, p.name;

-- Refresh periodically
REFRESH MATERIALIZED VIEW product_stats;
```

### Trade-offs

| Aspect | Normalized | Denormalized |
|--------|------------|--------------|
| **Read Speed** | Slower (JOINs) | Faster |
| **Write Speed** | Faster | Slower (update multiple places) |
| **Storage** | Less | More |
| **Data Integrity** | Easy (single source) | Hard (must sync) |
| **Complexity** | Simple writes | Complex writes |

---

## 4. Database Design Best Practices

### Start Normalized, Denormalize When Needed

```
1. Design in 3NF first
2. Identify slow queries (EXPLAIN ANALYZE)
3. If JOINs are the bottleneck, consider denormalization
4. Add indexes before denormalizing
5. Denormalize only specific hot paths
```

### Primary Key Design

```sql
-- ✅ Good: Surrogate key (auto-increment or UUID)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) UNIQUE
);

-- ⚠️ Careful: Natural key (real-world identifier)
CREATE TABLE countries (
    country_code CHAR(2) PRIMARY KEY,  -- 'US', 'IN'
    name VARCHAR(100)
);
-- What if country code changes?
```

### Foreign Key Constraints

```sql
-- Always add foreign keys for data integrity
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT  -- Prevent deletion if orders exist
        ON UPDATE CASCADE   -- Update if customer_id changes
);
```

### Index Strategy

```sql
-- Index foreign keys (for JOIN performance)
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Index columns used in WHERE, ORDER BY
CREATE INDEX idx_orders_date ON orders(order_date);

-- Composite index for common query patterns
CREATE INDEX idx_orders_status_date ON orders(status, order_date);
```

---

## 5. Top Interview Questions

### Q1: What are the normal forms? Explain with examples.

**Answer:**
- **1NF:** Atomic values, no repeating groups. Each cell has single value.
- **2NF:** 1NF + No partial dependencies. Non-key columns depend on entire PK.
- **3NF:** 2NF + No transitive dependencies. Non-key columns depend only on PK, not on other non-key columns.
- **BCNF:** Every determinant (column that determines another) must be a superkey.

### Q2: What is the difference between normalization and denormalization?

**Answer:**
- **Normalization:** Organizing data to reduce redundancy. Better for writes, data integrity. Slower reads (JOINs).
- **Denormalization:** Adding redundancy intentionally. Better for reads. Slower writes, harder to maintain consistency.

### Q3: When would you denormalize?

**Answer:**
1. **Read-heavy workload** (99% reads, 1% writes)
2. **JOINs are bottleneck** (after trying indexes)
3. **Analytics/reporting** queries need speed
4. **Caching is not feasible**

Avoid denormalization when data changes frequently or integrity is critical.

### Q4: What is a transitive dependency?

**Answer:** When a non-key column depends on another non-key column.

Example: In `employees(emp_id, dept_id, dept_name)`:
- `dept_name` depends on `dept_id` (not on `emp_id`)
- This is a transitive dependency: `emp_id → dept_id → dept_name`

Solution: Extract `departments(dept_id, dept_name)` to a separate table.

### Q5: What are the anomalies that normalization prevents?

**Answer:**
1. **Insert Anomaly:** Can't insert data without unrelated data (e.g., can't add customer without order)
2. **Update Anomaly:** Need to update multiple rows for one logical change (e.g., customer address change)
3. **Delete Anomaly:** Deleting one record loses unrelated data (e.g., deleting order loses customer info)

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────────────┐
│                NORMALIZATION CHEAT SHEET                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ NORMAL FORMS:                                                    │
│ ├── 1NF: Atomic values, no repeating groups                     │
│ ├── 2NF: No partial dependencies (full key dependence)          │
│ ├── 3NF: No transitive dependencies (only key dependence)       │
│ └── BCNF: Every determinant is a superkey                       │
│                                                                  │
│ MEMORY TRICK:                                                    │
│ "The key, the WHOLE key, and NOTHING BUT the key"               │
│                                                                  │
│ WHEN TO DENORMALIZE:                                             │
│ ├── Read-heavy workload (99% reads)                             │
│ ├── JOINs are performance bottleneck                            │
│ └── After indexes don't help enough                             │
│                                                                  │
│ DENORMALIZATION TECHNIQUES:                                      │
│ ├── Duplicate frequently-joined columns                         │
│ ├── Pre-computed aggregates (count, avg)                        │
│ └── Materialized views                                          │
│                                                                  │
│ ANOMALIES TO AVOID:                                              │
│ ├── Insert: Can't add data without unrelated data               │
│ ├── Update: Need to change many rows for one fact               │
│ └── Delete: Lose data unintentionally                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```
