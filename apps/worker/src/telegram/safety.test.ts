import { describe, expect, it } from 'vitest';

import { RetryableJobError, isAccountKilled, isFloodWait, isPermanentSendFailure, runTelegramCall } from './safety.js';

class FloodWait extends Error {
  seconds: number;
  constructor(sec: number) {
    super('flood');
    this.name = 'FloodWaitError';
    this.seconds = sec;
  }
}
class Banned extends Error {
  constructor() {
    super('banned');
    this.name = 'PhoneNumberBanned';
  }
}
class Forbidden extends Error {
  constructor() {
    super('forbidden');
    this.name = 'ChatWriteForbidden';
  }
}

describe('telegram safety', () => {
  it('classifies FloodWaitError', () => {
    expect(isFloodWait(new FloodWait(10))).toBe(true);
  });
  it('classifies account-killed errors', () => {
    expect(isAccountKilled(new Banned())).toBe(true);
  });
  it('classifies permanent send failures', () => {
    expect(isPermanentSendFailure(new Forbidden())).toBe(true);
  });

  it('runTelegramCall rewraps FloodWait as RetryableJobError with delay', async () => {
    await expect(
      runTelegramCall(async () => {
        throw new FloodWait(7);
      }),
    ).rejects.toBeInstanceOf(RetryableJobError);
  });

  it('runTelegramCall passes through unknown errors', async () => {
    const boom = new Error('other');
    await expect(runTelegramCall(async () => { throw boom; })).rejects.toBe(boom);
  });
});
