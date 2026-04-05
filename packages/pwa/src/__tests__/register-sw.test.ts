import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

describe('registerServiceWorker', () => {
  let originalServiceWorker: ServiceWorkerContainer;
  let mockRegister: Mock;
  let mockAddEventListener: Mock;

  beforeEach(() => {
    originalServiceWorker = navigator.serviceWorker;
    mockRegister = vi.fn();
    mockAddEventListener = vi.fn();

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        addEventListener: mockAddEventListener,
        controller: null,
      },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: originalServiceWorker,
      configurable: true,
    });
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('should register /sw.js when serviceWorker is supported', async () => {
    mockRegister.mockResolvedValue({
      addEventListener: vi.fn(),
    });

    const { registerServiceWorker } = await import('../register-sw.js');
    registerServiceWorker();

    expect(mockRegister).toHaveBeenCalledWith('/sw.js');
  });

  it('should not register when serviceWorker is not supported', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });

    const { registerServiceWorker } = await import('../register-sw.js');
    registerServiceWorker();

    // No error thrown and register was never called
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should listen for controllerchange events', async () => {
    mockRegister.mockResolvedValue({
      addEventListener: vi.fn(),
    });

    const { registerServiceWorker } = await import('../register-sw.js');
    registerServiceWorker();

    expect(mockAddEventListener).toHaveBeenCalledWith(
      'controllerchange',
      expect.any(Function)
    );
  });

  it('should handle registration failure gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRegister.mockRejectedValue(new Error('Registration failed'));

    const { registerServiceWorker } = await import('../register-sw.js');
    registerServiceWorker();

    // Wait for the rejection to be caught
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Service worker registration failed:',
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it('should listen for updatefound on registration', async () => {
    const regAddEventListener = vi.fn();
    mockRegister.mockResolvedValue({
      addEventListener: regAddEventListener,
    });

    const { registerServiceWorker } = await import('../register-sw.js');
    registerServiceWorker();

    await vi.waitFor(() => {
      expect(regAddEventListener).toHaveBeenCalledWith(
        'updatefound',
        expect.any(Function)
      );
    });
  });

  it('should prompt user when a new worker is installed and controller exists', async () => {
    const mockConfirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', mockConfirm);

    const workerListeners: Record<string, Function> = {};
    const mockWorker = {
      state: 'installing',
      addEventListener: (event: string, handler: Function) => {
        workerListeners[event] = handler;
      },
      postMessage: vi.fn(),
    };

    const regListeners: Record<string, Function> = {};
    mockRegister.mockResolvedValue({
      installing: mockWorker,
      addEventListener: (event: string, handler: Function) => {
        regListeners[event] = handler;
      },
    });

    // Simulate having an existing controller
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        addEventListener: mockAddEventListener,
        controller: { state: 'activated' },
      },
      configurable: true,
    });

    const { registerServiceWorker } = await import('../register-sw.js');
    registerServiceWorker();

    await vi.waitFor(() => {
      expect(regListeners['updatefound']).toBeDefined();
    });

    // Trigger updatefound
    regListeners['updatefound']();

    // Simulate worker becoming installed
    mockWorker.state = 'installed';
    workerListeners['statechange']();

    expect(mockConfirm).toHaveBeenCalledWith(
      'Update available — refresh to update'
    );

    vi.unstubAllGlobals();
  });

  it('should post skipWaiting when user confirms update', async () => {
    const mockConfirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', mockConfirm);

    const workerListeners: Record<string, Function> = {};
    const mockWorker = {
      state: 'installing',
      addEventListener: (event: string, handler: Function) => {
        workerListeners[event] = handler;
      },
      postMessage: vi.fn(),
    };

    const regListeners: Record<string, Function> = {};
    mockRegister.mockResolvedValue({
      installing: mockWorker,
      addEventListener: (event: string, handler: Function) => {
        regListeners[event] = handler;
      },
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockRegister,
        addEventListener: mockAddEventListener,
        controller: { state: 'activated' },
      },
      configurable: true,
    });

    const { registerServiceWorker } = await import('../register-sw.js');
    registerServiceWorker();

    await vi.waitFor(() => {
      expect(regListeners['updatefound']).toBeDefined();
    });

    regListeners['updatefound']();
    mockWorker.state = 'installed';
    workerListeners['statechange']();

    expect(mockWorker.postMessage).toHaveBeenCalledWith('skipWaiting');

    vi.unstubAllGlobals();
  });
});
