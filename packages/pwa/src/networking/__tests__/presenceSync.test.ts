import { describe, expect, it } from 'vitest';
import { createPresenceMessage, parsePresenceMessage } from '../presenceSync.js';

describe('presenceSync', () => {
  it('serializes compact presence payloads with rounded coordinates', () => {
    const message = createPresenceMessage({
      player: 'A',
      zone: 'battlefield',
      cardId: 'battlefield:c21:263:Sol Ring:0',
      interaction: 'drag',
      position: { x: 16.2, y: 27.7 },
    });

    expect(message).toBe('{"k":"p","p":"A","z":"battlefield","a":"d","c":"battlefield:c21:263:Sol Ring:0","x":16,"y":28}');
    expect(parsePresenceMessage(message)).toEqual({
      player: 'A',
      zone: 'battlefield',
      cardId: 'battlefield:c21:263:Sol Ring:0',
      interaction: 'drag',
      position: { x: 16, y: 28 },
      cleared: false,
    });
  });

  it('parses clear messages without cursor state', () => {
    const message = createPresenceMessage({
      player: 'B',
      zone: 'hand',
      cardId: 'hand:c21:263:Sol Ring:0',
      cleared: true,
    });

    expect(parsePresenceMessage(message)).toEqual({
      player: 'B',
      zone: 'hand',
      cardId: 'hand:c21:263:Sol Ring:0',
      interaction: null,
      position: null,
      cleared: true,
    });
  });

  it('ignores non-presence messages', () => {
    expect(parsePresenceMessage('{"kind":"action"}')).toBeNull();
    expect(parsePresenceMessage('not json')).toBeNull();
  });
});
