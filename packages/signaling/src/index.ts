export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options: {
      expirationTtl: number;
    },
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  SCRYMAT_SIGNALING: KVNamespaceLike;
}

export const ROOM_TTL_SECONDS = 300;

const ROOM_CODE_PATTERN = /^[A-Za-z0-9]{1,32}$/;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

type RouteType = 'offer' | 'answer';

function jsonResponse(status: number, body: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, {
    status,
    headers: CORS_HEADERS,
  });
}

function parseRoute(pathname: string): { code: string; type: RouteType } | null {
  const match = pathname.match(/^\/api\/room\/([A-Za-z0-9]+)\/(offer|answer)$/);

  if (!match) {
    return null;
  }

  const [, code, type] = match;

  if (!ROOM_CODE_PATTERN.test(code)) {
    return null;
  }

  return {
    code,
    type: type as RouteType,
  };
}

function getRoomKey(code: string, type: RouteType): string {
  return `room:${code}:${type}`;
}

async function readSdp(request: Request): Promise<string> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new Error('Request body must be valid JSON.');
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof (payload as { sdp?: unknown }).sdp !== 'string' ||
    (payload as { sdp: string }).sdp.trim().length === 0
  ) {
    throw new Error('Request body must include a non-empty "sdp" string.');
  }

  return (payload as { sdp: string }).sdp;
}

async function handlePost(
  request: Request,
  env: Env,
  code: string,
  type: RouteType,
): Promise<Response> {
  const sdp = await readSdp(request);

  if (type === 'offer') {
    await Promise.all([
      env.SCRYMAT_SIGNALING.put(getRoomKey(code, 'offer'), sdp, {
        expirationTtl: ROOM_TTL_SECONDS,
      }),
      env.SCRYMAT_SIGNALING.delete(getRoomKey(code, 'answer')),
    ]);

    return emptyResponse(204);
  }

  const offer = await env.SCRYMAT_SIGNALING.get(getRoomKey(code, 'offer'));

  if (offer === null) {
    return jsonResponse(404, { error: 'Offer not found for room code.' });
  }

  await env.SCRYMAT_SIGNALING.put(getRoomKey(code, 'answer'), sdp, {
    expirationTtl: ROOM_TTL_SECONDS,
  });

  return emptyResponse(204);
}

async function handleGet(env: Env, code: string, type: RouteType): Promise<Response> {
  const key = getRoomKey(code, type);
  const sdp = await env.SCRYMAT_SIGNALING.get(key);

  if (sdp === null) {
    return jsonResponse(404, { error: `${type} not found for room code.` });
  }

  if (type === 'answer') {
    await Promise.all([
      env.SCRYMAT_SIGNALING.delete(getRoomKey(code, 'offer')),
      env.SCRYMAT_SIGNALING.delete(getRoomKey(code, 'answer')),
    ]);
  }

  return jsonResponse(200, { sdp });
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return emptyResponse(204);
  }

  const route = parseRoute(new URL(request.url).pathname);

  if (route === null) {
    return jsonResponse(404, { error: 'Route not found.' });
  }

  if (request.method === 'POST') {
    try {
      return await handlePost(request, env, route.code, route.type);
    } catch (error) {
      return jsonResponse(400, {
        error:
          error instanceof Error ? error.message : 'Request body could not be processed.',
      });
    }
  }

  if (request.method === 'GET') {
    return handleGet(env, route.code, route.type);
  }

  return jsonResponse(405, { error: 'Method not allowed.' });
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
