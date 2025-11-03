import { NextRequest, NextResponse } from 'next/server';

// Cache configuration
export const CACHE_DURATION = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  STATIC: 86400, // 24 hours
};

// Simple in-memory cache for development
const cache = new Map<string, { data: any; expires: number }>();

export function getCachedResponse<T>(
  key: string,
  fetcher: () => Promise<T>,
  duration: number = CACHE_DURATION.MEDIUM
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);
  
  if (cached && cached.expires > now) {
    return Promise.resolve(cached.data);
  }
  
  return fetcher().then(data => {
    cache.set(key, { data, expires: now + duration * 1000 });
    return data;
  });
}

// Clear cache entry
export function clearCache(key: string) {
  cache.delete(key);
}

// Clear all cache
export function clearAllCache() {
  cache.clear();
}

// Add performance headers to response
export function addPerformanceHeaders(response: NextResponse, duration: number = CACHE_DURATION.MEDIUM) {
  response.headers.set('Cache-Control', `public, s-maxage=${duration}, stale-while-revalidate=${duration * 2}`);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
}

// Query optimization utilities
export function buildOptimizedQuery(baseQuery: string, filters: Record<string, any>): string {
  const conditions: string[] = [];
  
  // Add tenant filter first (most selective)
  if (filters.tenantId) {
    conditions.push(`tenant_id = ${filters.tenantId}`);
  }
  
  // Add other filters
  Object.entries(filters).forEach(([key, value]) => {
    if (key !== 'tenantId' && value !== undefined && value !== null) {
      if (typeof value === 'string') {
        conditions.push(`${key} = '${value}'`);
      } else if (typeof value === 'number') {
        conditions.push(`${key} = ${value}`);
      } else if (Array.isArray(value)) {
        conditions.push(`${key} IN (${value.map(v => `'${v}'`).join(',')})`);
      }
    }
  });
  
  return conditions.length > 0 ? `${baseQuery} WHERE ${conditions.join(' AND ')}` : baseQuery;
}

// Pagination helper
export function addPagination(query: string, page: number = 1, limit: number = 50): string {
  const offset = (page - 1) * limit;
  return `${query} LIMIT ${limit} OFFSET ${offset}`;
}

// Performance monitoring
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
) {
  return async (...args: T): Promise<R> => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`[PERF] ${name} (ERROR): ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  };
}

// Database connection pool monitoring
export function logPoolStats(pool: any) {
  if (pool && typeof pool.totalCount === 'number') {
    console.log(`[DB] Pool stats - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
  }
}





