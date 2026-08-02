export type ConnectionRole = 'host' | 'guest';
export type ConnectionStatus = 'idle' | 'hosting' | 'joining' | 'connected' | 'disconnected' | 'error';

type SignalingMessageType = 'offer' | 'answer';

export interface WebRtcDataChannelManagerOptions {
  role: ConnectionRole;
  roomCode: string;
  signalingBaseUrl?: string;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  onMessage?: (message: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

const DEFAULT_SIGNALING_BASE_URL = '/api/room';
const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_POLL_TIMEOUT_MS = 30_000;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_PATTERN = /[^A-Za-z0-9]/g;

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unknown WebRTC error.');
}

function toJsonMessage(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }

  return JSON.stringify(data);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { error?: unknown };
    return typeof payload.error === 'string' ? payload.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

export function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().replace(ROOM_CODE_PATTERN, '').slice(0, 32).toUpperCase();
}

export function generateRoomCode(): string {
  const values = new Uint32Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length]).join('');
}

export class WebRtcDataChannelManager {
  private readonly options: Required<Pick<WebRtcDataChannelManagerOptions, 'pollIntervalMs' | 'pollTimeoutMs'>> & WebRtcDataChannelManagerOptions;

  private readonly signalingBaseUrl: string;

  private readonly abortController = new AbortController();

  private peerConnection: RTCPeerConnection | null = null;

  private dataChannel: RTCDataChannel | null = null;

  private connected = false;

  constructor(options: WebRtcDataChannelManagerOptions) {
    this.options = {
      pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
      pollTimeoutMs: DEFAULT_POLL_TIMEOUT_MS,
      ...options,
    };
    this.signalingBaseUrl = normalizeBaseUrl(
      this.options.signalingBaseUrl ?? DEFAULT_SIGNALING_BASE_URL,
    );
  }

  async connect(): Promise<void> {
    try {
      this.peerConnection = new RTCPeerConnection();
      this.peerConnection.onconnectionstatechange = () => this.handleConnectionStateChange();

      if (this.options.role === 'host') {
        await this.connectAsHost();
      } else {
        await this.connectAsGuest();
      }
    } catch (error) {
      const normalizedError = toError(error);
      this.options.onError?.(normalizedError);
      this.disconnect();
      throw normalizedError;
    }
  }

  send(message: string): void {
    if (this.dataChannel?.readyState !== 'open') {
      throw new Error('RTCDataChannel is not open.');
    }

    this.dataChannel.send(message);
  }

  disconnect(): void {
    const wasConnected = this.connected;

    this.abortController.abort();
    this.connected = false;

    if (this.dataChannel) {
      this.dataChannel.onopen = null;
      this.dataChannel.onclose = null;
      this.dataChannel.onmessage = null;
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.ondatachannel = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (wasConnected) {
      this.options.onDisconnect?.();
    }
  }

  private async connectAsHost(): Promise<void> {
    const peerConnection = this.requirePeerConnection();
    const dataChannel = peerConnection.createDataChannel('scrymat', {
      ordered: true,
    });
    this.bindDataChannel(dataChannel);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await this.waitForIceGatheringComplete(peerConnection);
    await this.publishDescription('offer');

    const remoteSdp = await this.pollForDescription('answer');
    await peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: remoteSdp,
    });
  }

  private async connectAsGuest(): Promise<void> {
    const peerConnection = this.requirePeerConnection();
    peerConnection.ondatachannel = (event) => this.bindDataChannel(event.channel);

    const remoteSdp = await this.pollForDescription('offer');
    await peerConnection.setRemoteDescription({
      type: 'offer',
      sdp: remoteSdp,
    });

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    await this.waitForIceGatheringComplete(peerConnection);
    await this.publishDescription('answer');
  }

  private bindDataChannel(dataChannel: RTCDataChannel): void {
    this.dataChannel = dataChannel;
    dataChannel.onopen = () => {
      this.connected = true;
      this.options.onConnect?.();
    };
    dataChannel.onclose = () => {
      const wasConnected = this.connected;
      this.connected = false;
      if (wasConnected) {
        this.options.onDisconnect?.();
      }
    };
    dataChannel.onmessage = (event) => {
      this.options.onMessage?.(toJsonMessage(event.data));
    };
  }

  private handleConnectionStateChange(): void {
    const connectionState = this.peerConnection?.connectionState;

    if (connectionState === 'failed') {
      const error = new Error('Peer connection failed.');
      this.options.onError?.(error);
      this.disconnect();
      return;
    }

    if (connectionState === 'closed' || connectionState === 'disconnected') {
      this.disconnect();
    }
  }

  private async waitForIceGatheringComplete(peerConnection: RTCPeerConnection): Promise<void> {
    if (peerConnection.iceGatheringState === 'complete') {
      return;
    }

    await new Promise<void>((resolve) => {
      const handleChange = () => {
        if (peerConnection.iceGatheringState !== 'complete') {
          return;
        }

        peerConnection.removeEventListener('icegatheringstatechange', handleChange);
        resolve();
      };

      peerConnection.addEventListener('icegatheringstatechange', handleChange);
    });
  }

  private async publishDescription(type: SignalingMessageType): Promise<void> {
    const description = this.requirePeerConnection().localDescription;

    if (!description?.sdp) {
      throw new Error(`Missing local ${type} description.`);
    }

    const response = await fetch(this.getSignalingUrl(type), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sdp: description.sdp }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }
  }

  private async pollForDescription(type: SignalingMessageType): Promise<string> {
    const startedAt = Date.now();

    while (!this.abortController.signal.aborted) {
      const response = await fetch(this.getSignalingUrl(type), {
        method: 'GET',
        signal: this.abortController.signal,
      });

      if (response.ok) {
        const payload = await response.json() as { sdp?: unknown };
        if (typeof payload.sdp === 'string' && payload.sdp.length > 0) {
          return payload.sdp;
        }

        throw new Error(`Signaling worker returned an invalid ${type}.`);
      }

      if (response.status !== 404) {
        throw new Error(await readError(response));
      }

      if (Date.now() - startedAt >= this.options.pollTimeoutMs) {
        throw new Error(`Timed out waiting for ${type}.`);
      }

      await this.delay(this.options.pollIntervalMs);
    }

    throw new Error(`Stopped waiting for ${type}.`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.abortController.signal.removeEventListener('abort', handleAbort);
        resolve();
      }, ms);

      const handleAbort = () => {
        window.clearTimeout(timeoutId);
        reject(new Error('Connection attempt was cancelled.'));
      };

      this.abortController.signal.addEventListener('abort', handleAbort, { once: true });
    });
  }

  private getSignalingUrl(type: SignalingMessageType): string {
    return `${this.signalingBaseUrl}/${this.options.roomCode}/${type}`;
  }

  private requirePeerConnection(): RTCPeerConnection {
    if (!this.peerConnection) {
      throw new Error('Peer connection has not been created.');
    }

    return this.peerConnection;
  }
}
