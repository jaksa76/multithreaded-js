import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '30s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    // http_req_duration: ['p(95)<5000'], // 95% of requests should complete within 5s
    http_req_failed: ['rate<0.1'],     // Less than 10% of requests should fail
  },
};

export default function () {
  const res = http.get('http://localhost:3000/fibonacci/42');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response contains result': (r) => r.body.includes('Fibonacci of 42'),
  });
  
  sleep(1); // Wait 1 second between iterations
}
