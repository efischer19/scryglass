import { describe, expect, it } from 'vitest';
import { createCardCommitment, createCardCommitments, hashCard, sha256Hex } from './commit-reveal.js';
import type { Card } from './schemas/card.js';

function makeCard(name: string): Card {
  return { name, setCode: 'TST', collectorNumber: '1', cardType: 'nonland', tapped: false, faceDown: false };
}

describe('commit-reveal', () => {
  it('produces a known SHA-256 digest', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('produces the same hash for the same card and salt', () => {
    const card = makeCard('Sol Ring');

    expect(hashCard(card, 'fixed-salt')).toEqual(hashCard(card, 'fixed-salt'));
  });

  it('produces different hashes for the same card with different salts', () => {
    const card = makeCard('Sol Ring');

    expect(hashCard(card, 'salt-one').hash).not.toBe(hashCard(card, 'salt-two').hash);
  });

  it('generates unique commitments for duplicate cards', () => {
    const cards = [makeCard('Island'), makeCard('Island')];
    const commitments = createCardCommitments(cards);

    expect(commitments).toHaveLength(2);
    expect(commitments[0].cardHash.hash).not.toBe(commitments[1].cardHash.hash);
    expect(commitments[0].salt).not.toBe(commitments[1].salt);
  });

  it('returns the source card, salt, and masked hash together', () => {
    const card = makeCard('Counterspell');
    const commitment = createCardCommitment(card, 'demo-salt');

    expect(commitment.card).toEqual(card);
    expect(commitment.salt).toBe('demo-salt');
    expect(commitment.cardHash).toEqual(hashCard(card, 'demo-salt'));
  });
});
