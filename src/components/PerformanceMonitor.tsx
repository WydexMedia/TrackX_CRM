"use client";

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  networkRequests: number;
}

export function PerformanceMonitor({ componentName }: { componentName: string }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    networkRequests: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    // Monitor memory usage if available
    const getMemoryUsage = () => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      return undefined;
    };

    // Monitor network requests
    let requestCount = 0;
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      requestCount++;
      return originalFetch(...args);
    };

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    setMetrics({
      loadTime: renderTime,
      renderTime,
      memoryUsage: getMemoryUsage(),
      networkRequests: requestCount
    });

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] ${componentName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        memoryUsage: metrics.memoryUsage ? `${metrics.memoryUsage.toFixed(2)}MB` : 'N/A',
        networkRequests: requestCount
      });
    }

    // Restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [componentName]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded z-50">
      <div className="font-bold">{componentName}</div>
      <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
      {metrics.memoryUsage && (
        <div>Memory: {metrics.memoryUsage.toFixed(2)}MB</div>
      )}
      <div>Requests: {metrics.networkRequests}</div>
    </div>
  );
}

// Higher-order component for performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    return (
      <>
        <Component {...props} />
        <PerformanceMonitor componentName={componentName} />
      </>
    );
  };
}





