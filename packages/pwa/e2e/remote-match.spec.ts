import { test, expect, type BrowserContext } from '@playwright/test';

type SignalingMessageType = 'offer' | 'answer';
type ChannelRole = 'host' | 'guest';
type RoomStore = Record<
  string,
  Partial<Record<SignalingMessageType, string>> & {
    channelQueues?: Record<ChannelRole, Array<{ type: 'message' | 'close'; data?: string }>>;
  }
>;

async function installFakeWebRtc(context: BrowserContext) {
  await context.addInitScript(() => {
    const connections: unknown[] = [];
    const deliveredMessages: string[] = [];
    let latestSignalRoomCode: string | null = null;

    Object.defineProperty(window, '__scrymatRtcConnections', {
      configurable: true,
      value: connections,
    });

    Object.defineProperty(window, '__scrymatDeliveredRtcMessages', {
      configurable: true,
      value: deliveredMessages,
    });

    const getRoomCode = () => window.location.pathname.match(/\/match\/([A-Z0-9]{1,32})\/?$/)?.[1] ?? 'SCRYMAT';
    const getActiveRoomCode = (fallbackRoomCode: string) => latestSignalRoomCode ?? fallbackRoomCode;

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const match = url.match(/\/api\/room\/([^/]+)\/(offer|answer|channel)(?:\/[^/]+)?$/);
      if (match != null) {
        latestSignalRoomCode = match[1];
      }

      return originalFetch(input, init);
    };

    class FakeRTCDataChannel {
      constructor(roomCode, role, onClose) {
        this.readyState = 'connecting';
        this.roomCode = roomCode;
        this.role = role;
        this.onClose = onClose;
        this.polling = false;
      }

      open() {
        if (this.readyState === 'open') {
          return;
        }

        this.readyState = 'open';
        this.polling = true;
        void this.poll();
        setTimeout(() => {
          this.onopen?.(new Event('open'));
        }, 0);
      }

      send(data) {
        if (this.readyState !== 'open') {
          throw new Error('RTCDataChannel is not open.');
        }

        this.roomCode = getActiveRoomCode(this.roomCode);
        void fetch(`/api/room/${this.roomCode}/channel/${this.role}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'message', data }),
        });
      }

      close(notifyRemote = true) {
        if (this.readyState === 'closed') {
          return;
        }

        this.readyState = 'closed';
        this.polling = false;
        if (notifyRemote) {
          this.roomCode = getActiveRoomCode(this.roomCode);
          void fetch(`/api/room/${this.roomCode}/channel/${this.role}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: 'close' }),
          });
        }
        this.onclose?.(new Event('close'));
        this.onClose?.();
      }

      async poll() {
        while (this.polling && this.readyState === 'open') {
          this.roomCode = getActiveRoomCode(this.roomCode);
          const response = await fetch(`/api/room/${this.roomCode}/channel/${this.role}`);
          if (response.status === 204) {
            await new Promise((resolve) => setTimeout(resolve, 10));
            continue;
          }

          if (response.ok) {
            const rawPayload = await response.text();
            if (rawPayload.length === 0) {
              await new Promise((resolve) => setTimeout(resolve, 10));
              continue;
            }

            const payload = JSON.parse(rawPayload);
            if (payload?.type === 'close') {
              this.close(false);
              return;
            }

            if (payload?.type === 'message') {
              deliveredMessages.push(payload.data);
              this.onmessage?.({ data: payload.data });
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    }

    class FakeRTCPeerConnection {
      constructor() {
        this.connectionState = 'new';
        this.iceGatheringState = 'complete';
        this.localDescription = null;
        this.remoteDescription = null;
        this.onconnectionstatechange = null;
        this.ondatachannel = null;
        this.channel = null;
        this.role = 'guest';
        connections.push(this);
      }

      createDataChannel() {
        this.role = 'host';
        this.channel = new FakeRTCDataChannel(getRoomCode(), 'host', () => {
          this.connectionState = 'disconnected';
          this.onconnectionstatechange?.();
        });
        return this.channel;
      }

      async createOffer() {
        this.role = 'host';
        return { type: 'offer', sdp: `fake-offer:${getRoomCode()}` };
      }

      async createAnswer() {
        this.role = 'guest';
        return { type: 'answer', sdp: `fake-answer:${getRoomCode()}` };
      }

      async setLocalDescription(description) {
        this.localDescription = description;
        if (description?.type === 'answer') {
          this.ensureGuestChannel();
          this.markConnected();
        }
      }

      async setRemoteDescription(description) {
        this.remoteDescription = description;
        if (description?.type === 'offer') {
          this.ensureGuestChannel();
        }

        if (description?.type === 'answer') {
          this.markConnected();
        }
      }

      addEventListener(eventName, listener) {
        if (eventName === 'icegatheringstatechange') {
          setTimeout(() => listener(), 0);
        }
      }

      removeEventListener() {}

      close() {
        this.connectionState = 'closed';
        this.channel?.close();
        this.onconnectionstatechange?.();
      }

      ensureGuestChannel() {
        if (this.channel != null) {
          return;
        }

        this.channel = new FakeRTCDataChannel(getRoomCode(), 'guest', () => {
          this.connectionState = 'disconnected';
          this.onconnectionstatechange?.();
        });

        setTimeout(() => {
          this.ondatachannel?.({ channel: this.channel });
          this.channel?.open();
          this.markConnected();
        }, 0);
      }

      markConnected() {
        this.connectionState = 'connected';
        this.channel?.open();
        this.onconnectionstatechange?.();
      }
    }

    Object.defineProperty(window, 'RTCPeerConnection', {
      configurable: true,
      writable: true,
      value: FakeRTCPeerConnection,
    });
  });
}

async function registerSignalingWorker(context: BrowserContext, rooms: RoomStore) {
  await context.route('**/api/room/**', async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/room\/([^/]+)\/(offer|answer|channel)(?:\/([^/]+))?$/);

    if (match == null) {
      await route.continue();
      return;
    }

    const [, roomCode, messageType, channelRole] = match;
    const room = rooms[roomCode] ?? (rooms[roomCode] = {});

    if (messageType === 'channel') {
      if (channelRole !== 'host' && channelRole !== 'guest') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Missing channel role.' }),
        });
        return;
      }

      room.channelQueues ??= { host: [], guest: [] };

      if (route.request().method() === 'POST') {
        const payload = JSON.parse(route.request().postData() ?? '{}') as { type?: 'message' | 'close'; data?: string };
        const targetRole: ChannelRole = channelRole === 'host' ? 'guest' : 'host';
        room.channelQueues[targetRole].push({
          type: payload.type === 'close' ? 'close' : 'message',
          ...(typeof payload.data === 'string' ? { data: payload.data } : {}),
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      const nextPayload = room.channelQueues[channelRole].shift();
      if (nextPayload == null) {
        await route.fulfill({
          status: 204,
          contentType: 'application/json',
          body: '',
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(nextPayload),
      });
      return;
    }

    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}') as { sdp?: string };
      room[messageType as SignalingMessageType] = body.sdp ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    const sdp = room[messageType as SignalingMessageType];
    if (typeof sdp === 'string' && sdp.length > 0) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sdp }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: `No ${messageType} found for room ${roomCode}.` }),
    });
  });
}

function makeCard(index: number) {
  return {
    name: `Test Card ${index}`,
    setCode: 'TST',
    collectorNumber: `${index}`,
    cardType: 'nonland' as const,
    tapped: false,
    faceDown: false,
  };
}

function makeSnapshot(playerALibrarySize: number, playerBLibrarySize: number) {
  return {
    players: {
      A: {
        library: Array.from({ length: playerALibrarySize }, (_, index) => makeCard(index + 1)),
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        commandZone: [],
        phase: 'playing',
        mulliganHand: [],
        mulliganCount: 0,
      },
      B: {
        library: Array.from({ length: playerBLibrarySize }, (_, index) => makeCard(index + 200)),
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        commandZone: [],
        phase: 'playing',
        mulliganHand: [],
        mulliganCount: 0,
      },
    },
    settings: {
      allowMulliganWith2or5Lands: false,
      localMode: false,
    },
    history: [],
  };
}

async function sendRemoteAction(page: import('@playwright/test').Page, action: unknown, sequence: number) {
  const message = JSON.stringify({
    kind: 'action',
    action,
    sentAt: Date.now() + sequence,
    sequence,
  });

  await page.evaluate((payload) => {
    const connections = (window as Window & {
      __scrymatRtcConnections?: Array<{ channel?: { send: (message: string) => void } }>;
    }).__scrymatRtcConnections ?? [];
    connections.at(-1)?.channel?.send(payload);
  }, message);
}

async function getReceivedActionTypes(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const messages = (window as Window & {
      __scrymatDeliveredRtcMessages?: string[];
    }).__scrymatDeliveredRtcMessages ?? [];

    return messages
      .map((message) => {
        try {
          const parsed = JSON.parse(message) as { action?: { type?: string } };
          return parsed.action?.type ?? null;
        } catch {
          return null;
        }
      })
      .filter((type): type is string => type != null);
  });
}

async function getConnectionDebug(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const connections = (window as Window & {
      __scrymatRtcConnections?: Array<{
        role?: string;
        roomCode?: string;
        channel?: { role?: string; roomCode?: string; readyState?: string };
      }>;
    }).__scrymatRtcConnections ?? [];

    return connections.map((connection) => ({
      role: connection.role ?? null,
      roomCode: connection.roomCode ?? null,
      channelRole: connection.channel?.role ?? null,
      channelRoomCode: connection.channel?.roomCode ?? null,
      readyState: connection.channel?.readyState ?? null,
    }));
  });
}

test('host and guest complete a WebRTC handshake, sync state, and recover after reconnect', async ({ browser }) => {
  test.setTimeout(90_000);

  const rooms: RoomStore = {};
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();

  await Promise.all([
    installFakeWebRtc(hostContext),
    installFakeWebRtc(guestContext),
    registerSignalingWorker(hostContext, rooms),
    registerSignalingWorker(guestContext, rooms),
  ]);

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await Promise.all([hostPage.goto('/'), guestPage.goto('/')]);

  await hostPage.getByRole('button', { name: 'Generate Room Code' }).click();
  const hostRoomCode = (await hostPage.locator('.remote-match-lobby__details dd').first().textContent())?.trim();
  expect(hostRoomCode).toMatch(/^[A-Z0-9]{6}$/);

  await guestPage.getByLabel('Room code').fill(hostRoomCode ?? '');
  await guestPage.getByRole('button', { name: 'Join Match' }).click();

  await expect(hostPage.locator('.remote-match-lobby__status-copy')).toContainText('Guest connected. Data channel is ready.', { timeout: 20_000 });
  await expect(guestPage.locator('.remote-match-lobby__status-copy')).toContainText('Connected to the host. Data channel is ready.', { timeout: 20_000 });
  await expect.poll(() => getConnectionDebug(hostPage), { timeout: 20_000 }).toEqual([
    {
      role: 'host',
      roomCode: null,
      channelRole: 'host',
      channelRoomCode: hostRoomCode,
      readyState: 'open',
    },
  ]);

  const openingSnapshot = makeSnapshot(3, 4);
  await sendRemoteAction(hostPage, { type: 'SYNC_STATE', payload: openingSnapshot }, 0);
  await expect.poll(() => getReceivedActionTypes(guestPage), { timeout: 20_000 }).toContain('SYNC_STATE');

  await sendRemoteAction(hostPage, { type: 'DRAW_CARD', payload: { player: 'A' } }, 1);
  await expect.poll(async () => (await getReceivedActionTypes(guestPage)).at(-1), { timeout: 20_000 }).toBe('DRAW_CARD');

  await guestPage.evaluate(() => {
    const connections = (window as Window & { __scrymatRtcConnections?: RTCPeerConnection[] }).__scrymatRtcConnections ?? [];
    connections.at(-1)?.close();
  });

  await expect(guestPage.locator('.remote-match-lobby__status-copy')).toContainText('Connected to the host. Data channel is ready.', { timeout: 20_000 });
  const syncCountBeforeResync = (await getReceivedActionTypes(guestPage)).filter((type) => type === 'SYNC_STATE').length;

  const resyncSnapshot = makeSnapshot(5, 2);
  await sendRemoteAction(hostPage, { type: 'SYNC_STATE', payload: resyncSnapshot }, 2);
  await expect.poll(async () => {
    const types = await getReceivedActionTypes(guestPage);
    return {
      lastType: types.at(-1) ?? null,
      syncCount: types.filter((type) => type === 'SYNC_STATE').length,
    };
  }, { timeout: 20_000 }).toEqual({
    lastType: 'SYNC_STATE',
    syncCount: syncCountBeforeResync + 1,
  });

  await Promise.all([hostContext.close(), guestContext.close()]);
});
