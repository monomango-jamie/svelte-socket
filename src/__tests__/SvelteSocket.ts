/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SvelteSocket } from '../lib/SvelteSocket.svelte';

// Mock WebSocket
class MockWebSocket {
	url: string;
	readyState: number = WebSocket.CONNECTING;
	onopen: ((event: Event) => void) | null = null;
	onclose: ((event: CloseEvent) => void) | null = null;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;

	private eventListeners: { [key: string]: ((event: any) => void)[] } = {};

	constructor(url: string) {
		this.url = url;
		// Simulate immediate connection
		setTimeout(() => {
			this.readyState = WebSocket.OPEN;
			this.dispatchEvent({ type: 'open' });
		}, 0);
	}

	addEventListener(type: string, listener: (event: any) => void) {
		if (!this.eventListeners[type]) {
			this.eventListeners[type] = [];
		}
		this.eventListeners[type].push(listener);
	}

	removeEventListener(type: string, listener: (event: any) => void) {
		if (this.eventListeners[type]) {
			const index = this.eventListeners[type].indexOf(listener);
			if (index > -1) {
				this.eventListeners[type].splice(index, 1);
			}
		}
	}

	dispatchEvent(event: any) {
		if (this.eventListeners[event.type]) {
			this.eventListeners[event.type].forEach((listener) => listener(event));
		}
	}

	close() {
		this.readyState = WebSocket.CLOSED;
		this.dispatchEvent({ type: 'close' });
	}

	send() {}
}

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket as any;
Object.defineProperty(global.WebSocket, 'CONNECTING', { value: 0 });
Object.defineProperty(global.WebSocket, 'OPEN', { value: 1 });
Object.defineProperty(global.WebSocket, 'CLOSING', { value: 2 });
Object.defineProperty(global.WebSocket, 'CLOSED', { value: 3 });

describe('SvelteSocket', () => {
	let socket: SvelteSocket;
	const testUrl = 'ws://localhost:8080';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		if (socket) {
			socket.removeSocket();
		}
	});

	describe('Constructor and Connection', () => {
		it('should initialize with URL and create socket', () => {
			socket = new SvelteSocket(testUrl);

			expect(socket).toBeDefined();
		});

		it('should not be connected initially (CONNECTING state)', () => {
			socket = new SvelteSocket(testUrl);

			// Socket starts in CONNECTING state
			expect(socket.isConnected).toBe(false);
		});

		it('should report connected when socket is in OPEN state', async () => {
			socket = new SvelteSocket(testUrl);

			// Wait for mock connection to open
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(socket.isConnected).toBe(true);
		});
	});

	describe('Socket Management', () => {
		it('should close socket connection', async () => {
			socket = new SvelteSocket(testUrl);

			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(socket.isConnected).toBe(true);

			socket.removeSocket();

			expect(socket.isConnected).toBe(false);
		});

		it('should handle closing non-existent socket gracefully', () => {
			socket = new SvelteSocket(testUrl);

			socket.removeSocket(); // Close once
			socket.removeSocket(); // Close again

			expect(socket.isConnected).toBe(false);
		});

		it('should handle socket 	connection errors', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.dispatchEvent({ type: 'error', error: new Error('Connection failed') });

			expect(consoleSpy).toHaveBeenCalledWith('🔌 SvelteSocket error:', expect.any(Object));
			consoleSpy.mockRestore();
		});

		it('should log when socket connects', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(consoleSpy).toHaveBeenCalledWith('🔌 SvelteSocket connected');
			consoleSpy.mockRestore();
		});
	});

	describe('addEventListener', () => {
		it('should add event listener to socket', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const messageHandler = vi.fn();
			socket.addEventListener('message', messageHandler);

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.dispatchEvent({ type: 'message', data: 'test' });

			expect(messageHandler).toHaveBeenCalled();
		});

		it('should throw error when socket is not connected', () => {
			socket = new SvelteSocket(testUrl);
			socket.removeSocket();

			expect(() => {
				socket.addEventListener('message', () => {});
			}).toThrow('Socket not connected');
		});

		it('should support multiple event types', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const openHandler = vi.fn();
			const closeHandler = vi.fn();
			const errorHandler = vi.fn();

			socket.addEventListener('open', openHandler);
			socket.addEventListener('close', closeHandler);
			socket.addEventListener('error', errorHandler);

			const mockSocket = socket['socket'] as unknown as MockWebSocket;

			mockSocket.dispatchEvent({ type: 'open' });
			mockSocket.dispatchEvent({ type: 'close' });
			mockSocket.dispatchEvent({ type: 'error' });

			expect(openHandler).toHaveBeenCalled();
			expect(closeHandler).toHaveBeenCalled();
			expect(errorHandler).toHaveBeenCalled();
		});
	});

	describe('isConnected', () => {
		it('should return false when socket is not initialized', () => {
			socket = new SvelteSocket(testUrl);
			socket.removeSocket();

			expect(socket.isConnected).toBe(false);
		});

		it('should return false when socket is connecting', () => {
			socket = new SvelteSocket(testUrl);

			expect(socket.isConnected).toBe(false);
		});

		it('should return true when socket is open', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(socket.isConnected).toBe(true);
		});

		it('should return false when socket is closed', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			socket.removeSocket();

			expect(socket.isConnected).toBe(false);
		});
	});

	describe('Socket Reconnection', () => {
		it('should close existing socket when creating a new one', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Manually trigger socket recreation (simulating reconnect)
			socket['createSocket'](testUrl);

			expect(consoleSpy).toHaveBeenCalledWith(
				'⚠️ SvelteSocket already exists, closing existing connection'
			);
			consoleSpy.mockRestore();
		});
	});
});
