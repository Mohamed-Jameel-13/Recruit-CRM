import { NextRequest } from 'next/server';

export interface WebhookAuthResult {
  authorized: boolean;
  error?: string;
  idempotencyKey?: string;
}

export function verifyWebhookRequest(req: NextRequest): WebhookAuthResult {
  const configuredSecret = process.env.N8N_SHARED_SECRET || 'demo_shared_secret_2026';

  const authHeader = req.headers.get('authorization');
  const customHeader = req.headers.get('x-n8n-secret');
  const idempotencyKey = req.headers.get('x-idempotency-key') || req.headers.get('idempotency-key') || undefined;

  let providedToken = '';

  if (customHeader) {
    providedToken = customHeader.trim();
  } else if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      providedToken = authHeader.substring(7).trim();
    } else {
      providedToken = authHeader.trim();
    }
  }

  if (!providedToken) {
    return {
      authorized: false,
      error: 'Missing authentication secret in Authorization or X-N8N-Secret header'
    };
  }

  if (providedToken !== configuredSecret) {
    return {
      authorized: false,
      error: 'Invalid webhook shared secret token'
    };
  }

  return {
    authorized: true,
    idempotencyKey
  };
}
