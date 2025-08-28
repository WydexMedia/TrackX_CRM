#!/usr/bin/env node

/*
  Simple concurrent login load test
  Usage:
    HOST=http://localhost:3000 CODE=yourCode PASSWORD=yourPassword CONCURRENCY=10 node scripts/load-test-login.js
*/

const DEFAULT_HOST = process.env.HOST || 'http://localhost:3000';
const CODE = process.env.CODE || 'MuhsinaWydex';
const PASSWORD = process.env.PASSWORD || 'Muhsinaproskill@2025';
const CONCURRENCY = Number(process.env.CONCURRENCY || 10);
const TENANT = process.env.TENANT || ''; // optional subdomain header for multi-tenant

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginOnce(index) {
  const start = performance.now();
  try {
    const res = await fetch(`${DEFAULT_HOST}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(TENANT ? { 'x-tenant-subdomain': TENANT } : {}),
      },
      body: JSON.stringify({ code: CODE, password: PASSWORD }),
    });
    const ms = performance.now() - start;
    let bodyText = '';
    try {
      bodyText = await res.text();
    } catch {}
    return { ok: res.ok, status: res.status, ms, bodyText };
  } catch (err) {
    const ms = performance.now() - start;
    return { ok: false, status: 0, ms, error: String(err) };
  }
}

function summarize(results) {
  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p50 = latencies[Math.floor(0.5 * (latencies.length - 1))];
  const p90 = latencies[Math.floor(0.9 * (latencies.length - 1))];
  const p95 = latencies[Math.floor(0.95 * (latencies.length - 1))];
  const p99 = latencies[Math.floor(0.99 * (latencies.length - 1))];
  const success = results.filter((r) => r.ok).length;
  const failures = results.length - success;
  const statusCounts = results.reduce((acc, r) => {
    const key = r.status || 'ERR';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return { avg, p50, p90, p95, p99, success, failures, statusCounts };
}

(async () => {
  console.log(`Starting login load test → host=${DEFAULT_HOST}, concurrency=${CONCURRENCY}, tenant=${TENANT || '-'}\n`);

  const tasks = Array.from({ length: CONCURRENCY }, (_, i) => loginOnce(i));
  const results = await Promise.all(tasks);

  results.forEach((r, idx) => {
    const base = `#${idx + 1} ${r.ms.toFixed(1)}ms`;
    if (r.ok) {
      console.log(`${base} ✓ status=${r.status}`);
    } else {
      console.log(`${base} ✗ status=${r.status} ${r.error ? `error=${r.error}` : ''}`);
    }
  });

  const s = summarize(results);
  console.log('\nSummary');
  console.log('========');
  console.log(`Success: ${s.success}/${results.length}`);
  console.log(`Failures: ${s.failures}/${results.length}`);
  console.log(`Status counts: ${JSON.stringify(s.statusCounts)}`);
  console.log(`Latency avg=${s.avg.toFixed(1)}ms p50=${s.p50.toFixed(1)}ms p90=${s.p90.toFixed(1)}ms p95=${s.p95.toFixed(1)}ms p99=${s.p99.toFixed(1)}ms`);
})(); 