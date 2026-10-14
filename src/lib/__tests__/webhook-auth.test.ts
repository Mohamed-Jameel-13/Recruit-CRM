import { describe, it, expect } from 'vitest';
import { verifyWebhookRequest } from '../n8n/auth';
import { NextRequest } from 'next/server';

describe('n8n Authenticated Webhook Boundary', () => {
  it('should reject requests without authorization headers', () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/n8n/callback', {
      method: 'POST'
    });
    const result = verifyWebhookRequest(req);
    expect(result.authorized).toBe(false);
    expect(result.error).toContain('Missing authentication');
  });

  it('should reject requests with invalid secret', () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/n8n/callback', {
      method: 'POST',
      headers: {
        'x-n8n-secret': 'wrong-secret'
      }
    });
    const result = verifyWebhookRequest(req);
    expect(result.authorized).toBe(false);
    expect(result.error).toContain('Invalid webhook shared secret');
  });

  it('should authorize valid requests and extract idempotency key', () => {
    const secret = process.env.N8N_SHARED_SECRET || 'demo_shared_secret_2026';
    const req = new NextRequest('http://localhost:3000/api/webhooks/n8n/callback', {
      method: 'POST',
      headers: {
        'x-n8n-secret': secret,
        'x-idempotency-key': 'idem-test-999'
      }
    });
    const result = verifyWebhookRequest(req);
    expect(result.authorized).toBe(true);
    expect(result.idempotencyKey).toBe('idem-test-999');
  });
});
