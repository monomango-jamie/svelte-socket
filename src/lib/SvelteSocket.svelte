<script lang="ts" module>
	import { SvelteSet } from 'svelte/reactivity';

	/**
	 * A reactive WebSocket wrapper using Svelte 5 runes.
	 * Provides an interface for managing WebSocket connections with built-in state tracking.
	 */
	export class SvelteSocket {
		private socket = $state<WebSocket>();
		private listeners = $state<Map<string, SvelteSet<(event: any) => void>>>(new Map());
		public isConnected = $state(false);
		public sentMessages = $state<Array<{ message: string; timestamp: number }>>([]);
		/**
		 * Creates a new SvelteSocket instance and establishes the WebSocket connection.
		 *
		 * @param {string} url - The WebSocket server URL to connect to
		 */
		constructor(url: string) {
			this.createSocket(url);
		}

		/**
		 * Adds an event listener to the WebSocket connection.
		 * Tracks the listener in a reactive SvelteSet for later retrieval.
		 *
		 * @param {string} event - The event type to listen for (e.g., 'message', 'close', 'open', 'error')
		 * @param {(event: any) => void} callback - The callback function to execute when the event occurs
		 * @throws {Error} If the socket is not connected
		 */
		public addEventListener(event: string, callback: (event: any) => void) {
			if (!this.socket) {
				throw new Error('Socket not connected');
			}
			this.socket.addEventListener(event, callback);

			// Track the listener reactively
			if (!this.listeners.has(event)) {
				this.listeners.set(event, new SvelteSet());
			}
			this.listeners.get(event)!.add(callback);
		}

		/**
		 * Removes an event listener from the WebSocket connection.
		 *
		 * @param {string} event - The event type
		 * @param {(event: any) => void} callback - The callback function to remove
		 */
		public removeEventListener(event: string, callback: (event: any) => void) {
			if (this.socket) {
				this.socket.removeEventListener(event, callback);
			}

			// Remove from tracked listeners
			const eventListeners = this.listeners.get(event);
			if (eventListeners) {
				eventListeners.delete(callback);
				if (eventListeners.size === 0) {
					this.listeners.delete(event);
				}
			}
		}

		/**
		 * Gets all registered event listeners, optionally filtered by event type.
		 *
		 * @param {string} [event] - Optional event type to filter by
		 * @returns {Array | Map} Array of listeners for a specific event, or Map of all listeners
		 */
		public getEventListeners(event?: string) {
			if (event) {
				return Array.from(this.listeners.get(event) || []);
			}
			return this.listeners;
		}

		/**
		 * Sends a message through the WebSocket connection and stores it in the message history.
		 *
		 * @param {string} message - The message to send
		 * @throws {Error} If the socket is not connected or not in OPEN state
		 */
		public sendMessage(message: string): void {
			if (!this.socket) {
				throw new Error('Socket not connected');
			}
			if (this.socket.readyState !== WebSocket.OPEN) {
				throw new Error('Socket is not in OPEN state');
			}

			this.socket.send(message);
			this.sentMessages.push({
				message,
				timestamp: Date.now()
			});
		}

		/**
		 * Clears the sent messages history.
		 */
		public clearSentMessages(): void {
			this.sentMessages = [];
		}

		/**
		 * Creates and connects a new WebSocket connection.
		 * Sets up event listeners for connection open and error events.
		 * If a socket already exists, it will be closed before creating a new one.
		 *
		 * @param {string} url - The WebSocket server URL to connect to
		 * @private
		 */
		private createSocket(url: string): void {
			if (this.socket) {
				console.log('⚠️ SvelteSocket already exists, closing existing connection');
				this.removeSocket();
			}

			this.socket = new WebSocket(url);

			this.socket.addEventListener('open', () => {
				this.isConnected = true;
				console.log('🔌 SvelteSocket connected');
			});

			this.socket.addEventListener('close', () => {
				this.isConnected = false;
				console.log('🔌 SvelteSocket disconnected');
			});

			this.socket.addEventListener('error', (error) => {
				console.error('🔌 SvelteSocket error:', error);
			});

			return console.log('🔌 SvelteSocket created', this.socket);
		}

		/**
		 * Closes and removes the current WebSocket connection.
		 * Sets the socket instance to null and clears all tracked listeners and message history.
		 */
		public removeSocket(): void {
			if (this.socket) {
				console.log('🔌 Closing socket connection');
				this.socket.close();
				this.socket = undefined;
				this.listeners.clear();
				this.sentMessages = [];
			}
			return;
		}
	}
</script>
