import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebRtcDataChannelManager } from '../WebRtcDataChannelManager.js';

class FakeDataChannel {
  readonly send = vi.fn();
  readonly close = vi.fn(() => {
    this.readyState = 'closed';
    this.onclose?.(new Event('close'));
  });

  readyState: RTCDataChannelState = 'connecting';
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  emitOpen(): void {
    this.readyState = 'open';
    this.onopen?.(new Event('open'));
  }

  emitMessage(data: string): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

class FakePeerConnection {
  static lastInstance: FakePeerConnection | null = null;

  readonly createDataChannel = vi.fn((_label: string, options?: RTCDataChannelInit) => {
    this.createdDataChannelOptions = options;
    this.dataChannel = new FakeDataChannel();
    return this.dataChannel as unknown as RTCDataChannel;
  });

  readonly createOffer = vi.fn(async () => ({ type: 'offer' as const, sdp: 'offer-sdp' }));
  readonly createAnswer = vi.fn(async () => ({ type: 'answer' as const, sdp: 'answer-sdp' }));
  readonly close = vi.fn(() => {
    this.connectionState = 'closed';
  });

  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  iceGatheringState: RTCIceGatheringState = 'new';
  connectionState: RTCPeerConnectionState = 'new';
  dataChannel: FakeDataChannel | null = null;
  createdDataChannelOptions?: RTCDataChannelInit;
  onconnectionstatechange: (() => void) | null = null;
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null;
  private iceGatheringListeners = new Set<() => void>();

  constructor() {
    FakePeerConnection.lastInstance = this;
  }

  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = description;
    this.iceGatheringState = 'complete';
    for (const listener of this.iceGatheringListeners) {
      listener();
    }
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = description;
  }

  addEventListener(eventName: string, listener: () => void): void {
    if (eventName === 'icegatheringstatechange') {
      this.iceGatheringListeners.add(listener);
    }
  }

  removeEventListener(eventName: string, listener: () => void): void {
    if (eventName === 'icegatheringstatechange') {
      this.iceGatheringListeners.delete(listener);
    }
  }

  emitIncomingDataChannel(): FakeDataChannel {
    const dataChannel = new FakeDataChannel();
    this.dataChannel = dataChannel;
    this.ondatachannel?.({ channel: dataChannel as unknown as RTCDataChannel } as RTCDataChannelEvent);
    return dataChannel;
  }
}

describe('WebRtcDataChannelManager', () => {
  beforeEach(() => {
    FakePeerConnection.lastInstance = null;
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection as unknown as typeof RTCPeerConnection);
  });

  it('hosts a room, publishes an offer, and sends ordered payloads over the data channel', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sdp: 'answer-sdp' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const onConnect = vi.fn();
    const manager = new WebRtcDataChannelManager({
      role: 'host',
      roomCode: 'ROOM123',
      onConnect,
    });

    await manager.connect();

    const peerConnection = FakePeerConnection.lastInstance;
    expect(peerConnection).toBeTruthy();
    expect(peerConnection?.createdDataChannelOptions).toEqual({ ordered: true });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/room/ROOM123/offer',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/room/ROOM123/answer',
      expect.objectContaining({ method: 'GET' }),
    );

    peerConnection?.dataChannel?.emitOpen();
    expect(onConnect).toHaveBeenCalledTimes(1);

    manager.send('{"type":"ping"}');
    expect(peerConnection?.dataChannel?.send).toHaveBeenCalledWith('{"type":"ping"}');
  });

  it('joins a room, posts an answer, and forwards incoming messages', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sdp: 'offer-sdp' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const onMessage = vi.fn();
    const onDisconnect = vi.fn();
    const manager = new WebRtcDataChannelManager({
      role: 'guest',
      roomCode: 'ROOM123',
      onMessage,
      onDisconnect,
    });

    await manager.connect();

    const peerConnection = FakePeerConnection.lastInstance;
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/room/ROOM123/offer',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/room/ROOM123/answer',
      expect.objectContaining({ method: 'POST' }),
    );

    const incomingChannel = peerConnection?.emitIncomingDataChannel();
    incomingChannel?.emitOpen();
    incomingChannel?.emitMessage('{"type":"ready"}');
    expect(onMessage).toHaveBeenCalledWith('{"type":"ready"}');

    manager.disconnect();
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });
});
