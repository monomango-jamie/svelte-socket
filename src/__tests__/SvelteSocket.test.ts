/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SvelteSocket } from '../lib/SvelteSocket.svelte';
import type { SvelteSet } from 'svelte/reactivity';

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

		it('should handle socket connection errors', async () => {
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

		it('should track listeners in reactive state', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const messageHandler1 = vi.fn();
			const messageHandler2 = vi.fn();
			const closeHandler = vi.fn();

			socket.addEventListener('message', messageHandler1);
			socket.addEventListener('message', messageHandler2);
			socket.addEventListener('close', closeHandler);

			const messageListeners = socket.getEventListeners('message');
			const closeListeners = socket.getEventListeners('close');

			expect(messageListeners).toHaveLength(2);
			expect(messageListeners).toContain(messageHandler1);
			expect(messageListeners).toContain(messageHandler2);
			expect(closeListeners).toHaveLength(1);
			expect(closeListeners).toContain(closeHandler);
		});
	});

	describe('removeEventListener', () => {
		it('should remove event listener from socket', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const messageHandler = vi.fn();
			socket.addEventListener('message', messageHandler);
			socket.removeEventListener('message', messageHandler);

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.dispatchEvent({ type: 'message', data: 'test' });

			expect(messageHandler).not.toHaveBeenCalled();
		});

		it('should remove listener from tracked state', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const messageHandler = vi.fn();
			socket.addEventListener('message', messageHandler);
			
			expect(socket.getEventListeners('message')).toHaveLength(1);
			
			socket.removeEventListener('message', messageHandler);
			
			expect(socket.getEventListeners('message')).toHaveLength(0);
		});

		it('should handle removing non-existent listener gracefully', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const messageHandler = vi.fn();

			expect(() => {
				socket.removeEventListener('message', messageHandler);
			}).not.toThrow();
		});

		it('should only remove the specific listener', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const handler1 = vi.fn();
			const handler2 = vi.fn();

			socket.addEventListener('message', handler1);
			socket.addEventListener('message', handler2);
			socket.removeEventListener('message', handler1);

			const listeners = socket.getEventListeners('message');
			expect(listeners).toHaveLength(1);
			expect(listeners).toContain(handler2);
			expect(listeners).not.toContain(handler1);
		});
	});

	describe('getEventListeners', () => {
		it('should return empty array for event with no listeners', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(socket.getEventListeners('message')).toEqual([]);
		});

		it('should return all listeners for a specific event', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const handler1 = vi.fn();
			const handler2 = vi.fn();

			socket.addEventListener('message', handler1);
			socket.addEventListener('message', handler2);

			const listeners = socket.getEventListeners('message');
			expect(listeners).toHaveLength(2);
			expect(listeners).toContain(handler1);
			expect(listeners).toContain(handler2);
		});

		it('should return map of all listeners when no event specified', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const messageHandler = vi.fn();
			const closeHandler = vi.fn();

			socket.addEventListener('message', messageHandler);
			socket.addEventListener('close', closeHandler);

			const allListeners = socket.getEventListeners();
			expect(allListeners).toBeInstanceOf(Map);
			expect((allListeners as Map<string, SvelteSet<(event: any) => void>>).size).toBe(2);
			expect((allListeners as Map<string, SvelteSet<(event: any) => void>>).has('message')).toBe(true);
			expect((allListeners as Map<string, SvelteSet<(event: any) => void>>).has('close')).toBe(true);
		});

		it('should clear listeners when socket is removed', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const messageHandler = vi.fn();
			socket.addEventListener('message', messageHandler);

			expect(socket.getEventListeners('message')).toHaveLength(1);

			socket.removeSocket();

			const allListeners = socket.getEventListeners();
			expect((allListeners as Map<string, SvelteSet<(event: any) => void>>).size).toBe(0);
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

	describe('sendMessage', () => {
		it('should send message through socket', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			const sendSpy = vi.spyOn(mockSocket, 'send');

			socket.sendMessage('Hello, World!');

			expect(sendSpy).toHaveBeenCalledWith('Hello, World!');
		});

		it('should store sent message in history', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			socket.sendMessage('Test message 1');
			socket.sendMessage('Test message 2');

			const sentMessages = socket.sentMessages;
			expect(sentMessages).toHaveLength(2);
			expect(sentMessages[0].message).toBe('Test message 1');
			expect(sentMessages[1].message).toBe('Test message 2');
			expect(sentMessages[0].timestamp).toBeLessThanOrEqual(Date.now());
			expect(sentMessages[1].timestamp).toBeLessThanOrEqual(Date.now());
		});

		it('should throw error when socket is not connected', () => {
			socket = new SvelteSocket(testUrl);
			socket.removeSocket();

			expect(() => {
				socket.sendMessage('Test');
			}).toThrow('Socket not connected');
		});

		it('should throw error when socket is not in OPEN state', () => {
			socket = new SvelteSocket(testUrl);

			// Socket is in CONNECTING state initially
			expect(() => {
				socket.sendMessage('Test');
			}).toThrow('Socket is not in OPEN state');
		});

		it('should include timestamps with sent messages', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			const beforeTime = Date.now();
			socket.sendMessage('Test');
			const afterTime = Date.now();

			const sentMessages = socket.sentMessages;
			expect(sentMessages[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
			expect(sentMessages[0].timestamp).toBeLessThanOrEqual(afterTime);
		});
	});

	describe('getSentMessages', () => {
		it('should return empty array when no messages sent', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(socket.sentMessages).toEqual([]);
		});

		it('should return all sent messages', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			socket.sendMessage('Message 1');
			socket.sendMessage('Message 2');
			socket.sendMessage('Message 3');

			const messages = socket.sentMessages;
			expect(messages).toHaveLength(3);
			expect(messages.map(m => m.message)).toEqual(['Message 1', 'Message 2', 'Message 3']);
		});
	});

	describe('clearSentMessages', () => {
		it('should clear all sent messages', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			socket.sendMessage('Message 1');
			socket.sendMessage('Message 2');

			expect(socket.sentMessages).toHaveLength(2);

			socket.clearSentMessages();

			expect(socket.sentMessages).toEqual([]);
		});

		it('should not affect socket connection', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			socket.sendMessage('Test');
			socket.clearSentMessages();

			expect(socket.isConnected).toBe(true);
		});
	});

	describe('removeSocket with sent messages', () => {
		it('should clear sent messages when socket is removed', async () => {
			socket = new SvelteSocket(testUrl);
			await new Promise((resolve) => setTimeout(resolve, 10));

			socket.sendMessage('Message 1');
			socket.sendMessage('Message 2');

			expect(socket.sentMessages).toHaveLength(2);

			socket.removeSocket();

				expect(socket.sentMessages).toEqual([]);
		});
	});
});
