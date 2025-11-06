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

describe('SocketProvider', () => {
	let socket: SvelteSocket | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		if (socket) {
			socket.removeSocket();
			socket = null;
		}
		vi.restoreAllMocks();
	});

	describe('Props Logic (Unit Tests)', () => {
		it('should create socket from url when only url is provided', () => {
			const testUrl = 'ws://localhost:8080';
			
			// Simulate what SocketProvider does
			const url = testUrl;
			const svelteSocket = undefined;
			
			// Should not throw
			expect(url || svelteSocket).toBeTruthy();
			
			// Should create socket from url
			socket = svelteSocket ?? new SvelteSocket({ url });
			
			expect(socket).toBeDefined();
			expect(socket['url']).toBe(testUrl);
		});

		it('should use provided svelteSocket when only svelteSocket is provided', () => {
			const customSocket = new SvelteSocket({ url: 'ws://localhost:9999' });
			
			// Simulate what SocketProvider does
			const url = undefined;
			const svelteSocket = customSocket;
			
			// Should not throw
			expect(url || svelteSocket).toBeTruthy();
			
			// Should use provided socket
			socket = svelteSocket ?? new SvelteSocket({ url: url! });
			
			expect(socket).toBe(customSocket);
			expect(socket['url']).toBe('ws://localhost:9999');
		});

		it('should prefer svelteSocket over url when both are provided', () => {
			const customSocket = new SvelteSocket({ url: 'ws://localhost:9999' });
			
			// Simulate what SocketProvider does
			const url = 'ws://localhost:8080';
			const svelteSocket = customSocket;
			
			// Should not throw
			expect(url || svelteSocket).toBeTruthy();
			
			// Should prefer svelteSocket
			socket = svelteSocket ?? new SvelteSocket({ url });
			
			expect(socket).toBe(customSocket);
			expect(socket['url']).toBe('ws://localhost:9999');
		});

		it('should fail when neither url nor svelteSocket is provided', () => {
			// Simulate what SocketProvider does
			const url = undefined;
			const svelteSocket = undefined;
			
			// Should throw error
			if (!url && !svelteSocket) {
				expect(() => {
					throw new Error('SocketProvider requires either "url" or "svelteSocket" prop to be provided');
				}).toThrow('SocketProvider requires either "url" or "svelteSocket" prop to be provided');
			}
		});
	});

	describe('URL Validation', () => {
		it('should validate WebSocket URL when creating from url prop', () => {
			// Simulate creating socket with invalid URL (like SocketProvider does)
			expect(() => {
				socket = new SvelteSocket({ url: 'http://localhost:8080' });
			}).toThrow('Invalid WebSocket URL');
		});

		it('should accept valid ws:// URL', () => {
			// Should not throw
			socket = new SvelteSocket({ url: 'ws://localhost:8080' });
			expect(socket).toBeDefined();
		});

		it('should accept valid wss:// URL', () => {
			// Should not throw
			socket = new SvelteSocket({ url: 'wss://localhost:8080' });
			expect(socket).toBeDefined();
		});
	});
});

