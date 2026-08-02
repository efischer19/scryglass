import { describe, expect, it } from 'vitest';

import { handleRequest, ROOM_TTL_SECONDS, type KVNamespaceLike } from './index.js';

class MemoryKVNamespace implements KVNamespaceLike {
  readonly values = new Map<string, string>();
  readonly puts: Array<{
    key: string;
    value: string;
    expirationTtl: number;
  }> = [];
  readonly deletes: string[] = [];

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async put(
    key: string,
    value: string,
    options: {
      expirationTtl: number;
    },
  ): Promise<void> {
    this.puts.push({
      key,
      value,
      expirationTtl: options.expirationTtl,
    });
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.deletes.push(key);
    this.values.delete(key);
  }
}

function createEnv() {
  return {
    SCRYMAT_SIGNALING: new MemoryKVNamespace(),
  };
}

function request(pathname: string, init?: RequestInit): Request {
  return new Request(`https://example.com${pathname}`, init);
}

describe('@scryglass/signaling', () => {
  it('stores offers with a strict five-minute TTL and returns them over GET', async () => {
    const env = createEnv();

    const postResponse = await handleRequest(
      request('/api/room/ROOM123/offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sdp: 'offer-sdp' }),
      }),
      env,
    );

    expect(postResponse.status).toBe(204);
    expect(env.SCRYMAT_SIGNALING.puts).toEqual([
      {
        key: 'room:ROOM123:offer',
        value: 'offer-sdp',
        expirationTtl: ROOM_TTL_SECONDS,
      },
    ]);

    const getResponse = await handleRequest(
      request('/api/room/ROOM123/offer', { method: 'GET' }),
      env,
    );

    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toEqual({ sdp: 'offer-sdp' });
    expect(getResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('requires an existing offer before accepting an answer', async () => {
    const env = createEnv();

    const response = await handleRequest(
      request('/api/room/ROOM123/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sdp: 'answer-sdp' }),
      }),
      env,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Offer not found for room code.',
    });
  });

  it('purges the room immediately after the host retrieves the answer', async () => {
    const env = createEnv();

    await handleRequest(
      request('/api/room/ROOM123/offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sdp: 'offer-sdp' }),
      }),
      env,
    );

    const postAnswerResponse = await handleRequest(
      request('/api/room/ROOM123/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sdp: 'answer-sdp' }),
      }),
      env,
    );

    expect(postAnswerResponse.status).toBe(204);
    expect(env.SCRYMAT_SIGNALING.puts.at(-1)).toEqual({
      key: 'room:ROOM123:answer',
      value: 'answer-sdp',
      expirationTtl: ROOM_TTL_SECONDS,
    });

    const getAnswerResponse = await handleRequest(
      request('/api/room/ROOM123/answer', { method: 'GET' }),
      env,
    );

    expect(getAnswerResponse.status).toBe(200);
    await expect(getAnswerResponse.json()).resolves.toEqual({ sdp: 'answer-sdp' });
    expect(env.SCRYMAT_SIGNALING.deletes).toContain('room:ROOM123:offer');
    expect(env.SCRYMAT_SIGNALING.deletes).toContain('room:ROOM123:answer');
    expect(env.SCRYMAT_SIGNALING.values.size).toBe(0);

    const missingAnswerResponse = await handleRequest(
      request('/api/room/ROOM123/answer', { method: 'GET' }),
      env,
    );

    expect(missingAnswerResponse.status).toBe(404);
  });

  it('handles preflight requests and malformed bodies with CORS-enabled responses', async () => {
    const env = createEnv();

    const optionsResponse = await handleRequest(
      request('/api/room/ROOM123/offer', { method: 'OPTIONS' }),
      env,
    );
    expect(optionsResponse.status).toBe(204);
    expect(optionsResponse.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, POST, OPTIONS',
    );

    const badRequestResponse = await handleRequest(
      request('/api/room/ROOM123/offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sdp: '' }),
      }),
      env,
    );

    expect(badRequestResponse.status).toBe(400);
    expect(badRequestResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
    await expect(badRequestResponse.json()).resolves.toEqual({
      error: 'Request body must include a non-empty "sdp" string.',
    });
  });
});
