# Plan — Allo take-home

## The core problem
Two customers checkout the last unit simultaneously. Naive approach has a
race condition: both read "1 available", both pass the check, both succeed.

## Concurrency fix
PostgreSQL row-level locking. The reservation handler opens a transaction
and does SELECT ... FOR UPDATE on the Stock row. Postgres guarantees only
one transaction holds that lock at a time. Alice grabs it, Bob blocks until
Alice commits, then Bob reads available=0 and gets 409.

## Data model
- Product, Warehouse, Stock (totalUnits, reservedUnits), Reservation
- available = totalUnits - reservedUnits (computed, never stored)

## Expiry
1. Vercel Cron hits /api/cron/cleanup every minute
2. Lazy cleanup inside confirm handler if user clicks after expiry
