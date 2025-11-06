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
		vi.useFakeTimers();
	});

	afterEach(() => {
		if (socket) {
			socket.removeSocket();
		}
		vi.restoreAllMocks();
	});

	describe('Constructor and Connection', () => {
		it('should initialize with URL object', () => {
			socket = new SvelteSocket({ url: testUrl });
			expect(socket).toBeDefined();
		});

		it('should throw error for invalid WebSocket URL', () => {
			expect(() => {
				new SvelteSocket({ url: 'http://localhost:8080' });
			}).toThrow('Invalid WebSocket URL: "http://localhost:8080". URL must start with ws:// or wss://');

			expect(() => {
				new SvelteSocket({ url: 'https://localhost:8080' });
			}).toThrow('Invalid WebSocket URL: "https://localhost:8080". URL must start with ws:// or wss://');

			expect(() => {
				new SvelteSocket({ url: 'localhost:8080' });
			}).toThrow('Invalid WebSocket URL: "localhost:8080". URL must start with ws:// or wss://');
		});

		it('should accept valid ws:// and wss:// URLs', () => {
			const wsSocket = new SvelteSocket({ url: 'ws://localhost:8080' });
			expect(wsSocket).toBeDefined();
			wsSocket.removeSocket();

			const wssSocket = new SvelteSocket({ url: 'wss://localhost:8080' });
			expect(wssSocket).toBeDefined();
			wssSocket.removeSocket();
		});

		it('should start in CONNECTING state', () => {
			socket = new SvelteSocket({ url: testUrl });
			expect(socket.connectionStatus).toBe(WebSocket.CONNECTING);
		});

		it('should transition to OPEN state when connected', async () => {
			socket = new SvelteSocket({ url: testUrl });
			await vi.runAllTimersAsync();
			expect(socket.connectionStatus).toBe(WebSocket.OPEN);
		});

		it('should call onOpen callback when connected', async () => {
			const onOpen = vi.fn();
			socket = new SvelteSocket({ url: testUrl, onOpen });
			await vi.runAllTimersAsync();
			expect(onOpen).toHaveBeenCalled();
		});

		it('should call onClose callback when disconnected', async () => {
			const onClose = vi.fn();
			socket = new SvelteSocket({ url: testUrl, onClose });
			await vi.runAllTimersAsync();

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.close();

			expect(onClose).toHaveBeenCalled();
		});

		it('should call onError callback on error', async () => {
			const onError = vi.fn();
			socket = new SvelteSocket({ url: testUrl, onError });
			await vi.runAllTimersAsync();

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.dispatchEvent({ type: 'error' });

			expect(onError).toHaveBeenCalled();
		});

		it('should call onMessage callback on message', async () => {
			const onMessage = vi.fn();
			socket = new SvelteSocket({ url: testUrl, onMessage });
			await vi.runAllTimersAsync();

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.dispatchEvent({ type: 'message', data: 'test' });

			expect(onMessage).toHaveBeenCalled();
		});
	});

	describe('Debug Mode', () => {
		it('should not log when debug is false', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			socket = new SvelteSocket({ url: testUrl, debug: false });
			await vi.runAllTimersAsync();
			expect(consoleSpy).not.toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it('should log when debug is true', async () => {
			vi.useRealTimers();
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			socket = new SvelteSocket({ url: testUrl, debug: true });
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});

	describe('Socket Management', () => {
		it('should close socket connection', async () => {
			socket = new SvelteSocket({ url: testUrl });
			await vi.runAllTimersAsync();
			expect(socket.connectionStatus).toBe(WebSocket.OPEN);

			socket.removeSocket();
			expect(socket['socket']).toBeUndefined();
		});

		it('should handle closing non-existent socket gracefully', () => {
			socket = new SvelteSocket({ url: testUrl });
			socket.removeSocket();
			socket.removeSocket(); // Should not throw
			expect(socket['socket']).toBeUndefined();
		});
	});

	describe('addEventListener', () => {
		it('should add event listener to socket', async () => {
			socket = new SvelteSocket({ url: testUrl });
			await vi.runAllTimersAsync();

			const messageHandler = vi.fn();
			socket.addEventListener('message', messageHandler);

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.dispatchEvent({ type: 'message', data: 'test' });

			expect(messageHandler).toHaveBeenCalled();
		});

		it('should throw error when socket is not connected', () => {
			socket = new SvelteSocket({ url: testUrl });
			socket.removeSocket();

			expect(() => {
				socket.addEventListener('message', () => {});
			}).toThrow('Socket not connected');
		});
	});

	describe('removeEventListener', () => {
		it('should remove event listener from socket', async () => {
			socket = new SvelteSocket({ url: testUrl });
			await vi.runAllTimersAsync();

			const messageHandler = vi.fn();
			socket.addEventListener('message', messageHandler);
			socket.removeEventListener('message', messageHandler);

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.dispatchEvent({ type: 'message', data: 'test' });

			expect(messageHandler).not.toHaveBeenCalled();
		});
	});

	describe('sendMessage', () => {
		it('should send message through socket', async () => {
			socket = new SvelteSocket({ url: testUrl });
			await vi.runAllTimersAsync();

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			const sendSpy = vi.spyOn(mockSocket, 'send');

			socket.sendMessage('Hello, World!');

			expect(sendSpy).toHaveBeenCalledWith('Hello, World!');
		});

		it('should store sent message in history', async () => {
			socket = new SvelteSocket({ url: testUrl });
			await vi.runAllTimersAsync();

			socket.sendMessage('Test message 1');
			socket.sendMessage('Test message 2');

			expect(socket.sentMessages).toHaveLength(2);
			expect(socket.sentMessages[0].message).toBe('Test message 2');
			expect(socket.sentMessages[1].message).toBe('Test message 1');
		});

		it('should throw error when socket is not connected', () => {
			socket = new SvelteSocket({ url: testUrl });
			socket.removeSocket();

			expect(() => {
				socket.sendMessage('Test');
			}).toThrow('Socket not connected');
		});

		it('should throw error when socket is not in OPEN state', () => {
			socket = new SvelteSocket({ url: testUrl });

			expect(() => {
				socket.sendMessage('Test');
			}).toThrow('Socket is not in OPEN state');
		});
	});

	describe('clearSentMessages', () => {
		it('should clear all sent messages', async () => {
			socket = new SvelteSocket({ url: testUrl });
			await vi.runAllTimersAsync();

			socket.sendMessage('Message 1');
			socket.sendMessage('Message 2');
			expect(socket.sentMessages).toHaveLength(2);

			socket.clearSentMessages();
			expect(socket.sentMessages).toEqual([]);
		});
	});

	describe('clearReceivedMessages', () => {
		it('should clear all received messages', async () => {
			socket = new SvelteSocket({ url: testUrl });
			await vi.runAllTimersAsync();

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.dispatchEvent({ type: 'message', data: 'Message 1' });
			mockSocket.dispatchEvent({ type: 'message', data: 'Message 2' });
			expect(socket.receivedMessages).toHaveLength(2);

			socket.clearReceivedMessages();
			expect(socket.receivedMessages).toEqual([]);
		});
	});

	describe('Reconnection', () => {
		it('should not reconnect when reconnection is disabled', async () => {
			socket = new SvelteSocket({ url: testUrl });
			await vi.runAllTimersAsync();

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.close();

			await vi.runAllTimersAsync();

			// Should not create a new socket
			expect(socket.connectionStatus).toBe(WebSocket.CLOSED);
		});

		it('should reconnect when enabled', async () => {
			socket = new SvelteSocket({
				url: testUrl,
				reconnectOptions: { enabled: true, delay: 1000, maxAttempts: 3 }
			});
			await vi.runAllTimersAsync();

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.close();

			// Should schedule reconnection
			await vi.advanceTimersByTimeAsync(1000);
			await vi.runAllTimersAsync();

			expect(socket.connectionStatus).toBe(WebSocket.OPEN);
		});

		it('should respect maxAttempts', async () => {
			socket = new SvelteSocket({
				url: testUrl,
				reconnectOptions: { enabled: true, delay: 100, maxAttempts: 2 }
			});
			await vi.runAllTimersAsync();

			// Simulate multiple disconnections
			for (let i = 0; i < 3; i++) {
				const mockSocket = socket['socket'] as unknown as MockWebSocket;
				if (mockSocket) {
					mockSocket.close();
					await vi.advanceTimersByTimeAsync(100);
					await vi.runAllTimersAsync();
				}
			}

			// Should stop after maxAttempts
			expect(socket['reconnectAttempts']).toBeLessThanOrEqual(2);
		});

		it('should reset reconnect attempts on successful connection', async () => {
			socket = new SvelteSocket({
				url: testUrl,
				reconnectOptions: { enabled: true, delay: 100, maxAttempts: 3 }
			});
			await vi.runAllTimersAsync();

			// Disconnect and reconnect
			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.close();
			await vi.advanceTimersByTimeAsync(100);
			await vi.runAllTimersAsync();

			expect(socket['reconnectAttempts']).toBe(0);
		});

		it('should disable reconnection on removeSocket', async () => {
			socket = new SvelteSocket({
				url: testUrl,
				reconnectOptions: { enabled: true, delay: 100, maxAttempts: 3 }
			});
			await vi.runAllTimersAsync();

			socket.removeSocket();

			// intentionalClose flag should be set to prevent reconnection
			expect(socket['intentionalClose']).toBe(true);
		});
	});

	describe('receivedMessages', () => {
		it('should track received messages', async () => {
			socket = new SvelteSocket({ url: testUrl });
			await vi.runAllTimersAsync();

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			mockSocket.dispatchEvent({
				type: 'message',
				data: 'test message',
				origin: 'ws://localhost:8080'
			});

			expect(socket.receivedMessages).toHaveLength(1);
			expect(socket.receivedMessages[0].message.origin).toBe('ws://localhost:8080');
			expect(socket.receivedMessages[0].message.data).toBe('test message');
		});
	});

	describe('maxMessageHistory', () => {
		it('should default to 50 messages', async () => {
			socket = new SvelteSocket({ url: testUrl });
			expect(socket.maxMessageHistory).toBe(50);
		});

		it('should allow custom maxMessageHistory', async () => {
			socket = new SvelteSocket({ url: testUrl, maxMessageHistory: 10 });
			expect(socket.maxMessageHistory).toBe(10);
		});

		it('should trim sent messages to maxMessageHistory (FIFO)', async () => {
			socket = new SvelteSocket({ url: testUrl, maxMessageHistory: 3 });
			await vi.runAllTimersAsync();

			// Send 5 messages
			socket.sendMessage('Message 1');
			socket.sendMessage('Message 2');
			socket.sendMessage('Message 3');
			socket.sendMessage('Message 4');
			socket.sendMessage('Message 5');

			// Should only keep the 3 most recent (newest first)
			expect(socket.sentMessages).toHaveLength(3);
			expect(socket.sentMessages[0].message).toBe('Message 5'); // newest
			expect(socket.sentMessages[1].message).toBe('Message 4');
			expect(socket.sentMessages[2].message).toBe('Message 3');
			// Message 1 and 2 should be removed (oldest)
		});

		it('should trim received messages to maxMessageHistory (FIFO)', async () => {
			socket = new SvelteSocket({ url: testUrl, maxMessageHistory: 3 });
			await vi.runAllTimersAsync();

			const mockSocket = socket['socket'] as unknown as MockWebSocket;
			
			// Receive 5 messages
			mockSocket.dispatchEvent({ type: 'message', data: 'Message 1' });
			mockSocket.dispatchEvent({ type: 'message', data: 'Message 2' });
			mockSocket.dispatchEvent({ type: 'message', data: 'Message 3' });
			mockSocket.dispatchEvent({ type: 'message', data: 'Message 4' });
			mockSocket.dispatchEvent({ type: 'message', data: 'Message 5' });

			// Should only keep the 3 most recent (newest first)
			expect(socket.receivedMessages).toHaveLength(3);
			expect(socket.receivedMessages[0].message.data).toBe('Message 5'); // newest
			expect(socket.receivedMessages[1].message.data).toBe('Message 4');
			expect(socket.receivedMessages[2].message.data).toBe('Message 3');
			// Message 1 and 2 should be removed (oldest)
		});

		it('should allow unlimited messages when maxMessageHistory is 0', async () => {
			socket = new SvelteSocket({ url: testUrl, maxMessageHistory: 0 });
			await vi.runAllTimersAsync();

			// Send many messages
			for (let i = 0; i < 100; i++) {
				socket.sendMessage(`Message ${i}`);
			}

			// Should keep all messages since limit is 0 (unlimited)
			expect(socket.sentMessages.length).toBeGreaterThan(50);
		});
	});
});
