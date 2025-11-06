<script lang="ts" module>
	/**
	 * Options for automatic reconnection.
	 */
	export interface ReconnectOptions {
		/** Whether automatic reconnection is enabled */
		enabled: boolean;

		/** Delay in milliseconds before attempting to reconnect */
		delay: number;

		/** Maximum number of reconnection attempts before giving up */
		maxAttempts: number;
	}

	/**
	 * Map of WebSocket event types to their corresponding event types
	 */
	type WebSocketEventMap = {
		message: MessageEvent;
		close: CloseEvent;
		open: Event;
		error: Event;
	};

	/**
	 * Configuration options for creating a new SvelteSocket instance.
	 */
	export interface SocketConstructorArgs {
		/** The WebSocket server URL to connect to (e.g., 'ws://localhost:8080') */
		url: string;

		/** Optional callback fired when a message is received from the server */
		onMessage?: (messageEvent: MessageEvent) => void;

		/** Optional callback fired when the WebSocket connection is established */
		onOpen?: (openEvent: Event) => void;

		/** Optional callback fired when the WebSocket connection is closed */
		onClose?: (closeEvent: CloseEvent) => void;

		/** Optional callback fired when a WebSocket error occurs */
		onError?: (errorEvent: Event) => void;

	/** Optional flag to enable debug console logging. Default: false */
	debug?: boolean;

	/** Optional configuration for automatic reconnection */
	reconnectOptions?: ReconnectOptions;

	/** Optional maximum number of messages to keep in history (sent and received). Default: 50 */
	maxMessageHistory?: number;
}

	/**
	 * A reactive WebSocket wrapper using Svelte 5 runes.
	 *
	 * @property {WebSocket['readyState']} connectionStatus - Current connection state (CONNECTING, OPEN, CLOSING, CLOSED)
	 * @property {Array<{message: string, timestamp: number}>} sentMessages - Reactive array of sent messages
	 * @property {Array<{message: MessageEvent}>} receivedMessages - Reactive array of received messages (stores MessageEvent objects)
	 *
	 * @example
	 * Basic usage:
	 * ```typescript
	 * const socket = new SvelteSocket({
	 *   url: 'ws://localhost:8080',
	 *   onMessage: (event) => console.log(event.data),
	 *   onOpen: () => console.log('Connected!')
	 * });
	 *
	 * socket.sendMessage('Hello, Server!');
	 *
	 * // Access received messages
	 * socket.receivedMessages.forEach(({ message }) => {
	 *   console.log(message.data, message.origin);
	 * });
	 * ```
	 *
	 * @example
	 * With auto-reconnect:
	 * ```typescript
	 * const socket = new SvelteSocket({
	 *   url: 'ws://localhost:8080',
	 *   debug: true,
	 *   reconnectOptions: {
	 *     enabled: true,
	 *     delay: 1000,
	 *     maxAttempts: 5
	 *   }
	 * });
	 * ```
	 */
	
	export class SvelteSocket {
		public socket = $state<WebSocket>();
		private onMessageEvent?: (messageEvent: MessageEvent) => void;
		private onOpenProp?: (openEvent: Event) => void;
		private onCloseProp?: (closeEvent: CloseEvent) => void;
		private onErrorProp?: (errorEvent: Event) => void;
	public connectionStatus = $state<WebSocket['readyState']>(WebSocket.CLOSED);
	public sentMessages = $state<Array<{ message: string | ArrayBuffer | Blob | ArrayBufferView; timestamp: number }>>([]);
	public receivedMessages = $state<Array<{ message: MessageEvent }>>([]);
	private debug: boolean;
	private reconnectOptions?: ReconnectOptions;
	public readonly maxMessageHistory: number;

	// Reconnection state
	private url: string = '';
	private reconnectAttempts = $state(0);
	private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
	private intentionalClose = false; // Flag to prevent reconnection on manual close

	/**
	 * Helper method to get a human-readable connection status string
	 */
	private getReadyStateString(): string {
		switch (this.connectionStatus) {
			case WebSocket.CONNECTING:
				return 'CONNECTING';
			case WebSocket.OPEN:
				return 'OPEN';
			case WebSocket.CLOSING:
				return 'CLOSING';
			case WebSocket.CLOSED:
				return 'CLOSED';
			default:
				return 'UNKNOWN';
		}
	}
		/**
		 * Creates a new SvelteSocket instance and establishes the WebSocket connection.
		 *
		 * @param {SocketConstructorArgs} options - Configuration options for the socket
		 * @param {string} options.url - The WebSocket server URL to connect to
		 * @param {(messageEvent: MessageEvent) => void} [options.onMessage] - Optional callback fired when a message is received
		 * @param {(openEvent: Event) => void} [options.onOpen] - Optional callback fired when the connection opens
		 * @param {(closeEvent: CloseEvent) => void} [options.onClose] - Optional callback fired when the connection closes
	 * @param {(errorEvent: Event) => void} [options.onError] - Optional callback fired when an error occurs
	 * @param {boolean} [options.debug=false] - Enable debug console logging
	 * @param {ReconnectOptions} [options.reconnectOptions] - Auto-reconnection configuration
	 * @param {number} [options.maxMessageHistory] - Maximum number of messages to keep in history
	 */
	constructor({
		url,
		onMessage,
		onOpen,
		onClose,
		onError,
		debug = false,
		reconnectOptions = undefined,
		maxMessageHistory = 50
	}: SocketConstructorArgs) {
		// Validate WebSocket URL
		if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
			throw new Error(`Invalid WebSocket URL: "${url}". URL must start with ws:// or wss://`);
		}

		this.url = url;
		this.onMessageEvent = onMessage;
		this.onOpenProp = onOpen;
		this.onCloseProp = onClose;
		this.onErrorProp = onError;
		this.debug = debug;
		this.reconnectOptions = reconnectOptions;
		this.maxMessageHistory = maxMessageHistory;
		this.createSocket(url);
	}

	/**
	 * Adds an event listener to the WebSocket connection.
	 *
	 * @param event - The event type to listen for
	 * @param callback - The callback function to execute when the event occurs
	 * @throws {Error} If the socket is not connected
	 */
	public addEventListener<K extends keyof WebSocketEventMap>(
		event: K,
		callback: (event: WebSocketEventMap[K]) => void
	): void {
		if (!this.socket) {
			throw new Error(
				`Cannot add event listener: Socket not connected. Current status: ${this.getReadyStateString()}`
			);
		}
		this.socket.addEventListener(event, callback as EventListener);
	}

	/**
	 * Removes an event listener from the WebSocket connection.
	 *
	 * @param event - The event type
	 * @param callback - The callback function to remove
	 */
	public removeEventListener<K extends keyof WebSocketEventMap>(
		event: K,
		callback: (event: WebSocketEventMap[K]) => void
	): void {
		if (!this.socket) {
			throw new Error(
				`Cannot remove event listener: Socket not connected. Current status: ${this.getReadyStateString()}`
			);
		}
		this.socket.removeEventListener(event, callback as EventListener);
	}

	/**
	 * Sends a message through the WebSocket connection and stores it in the message history.
	 * Supports text strings and binary data (ArrayBuffer, Blob, ArrayBufferView).
	 *
	 * @param {string | ArrayBuffer | Blob | ArrayBufferView} message - The message to send
	 * @throws {Error} If the socket is not connected or not in OPEN state
	 */
	public sendMessage(message: string | ArrayBuffer | Blob | ArrayBufferView): void {
		if (!this.socket) {
			throw new Error(
				`Cannot send message: Socket not connected. Current status: ${this.getReadyStateString()}`
			);
		}
		if (this.socket.readyState !== WebSocket.OPEN) {
			throw new Error(
				`Cannot send message: Socket is in ${this.getReadyStateString()} state. Expected OPEN state.`
			);
		}

		this.socket.send(message);
		this.sentMessages.unshift({
			message,
			timestamp: Date.now()
		});

		// Trim array to maintain FIFO - keep newest messages, remove oldest
		if (this.maxMessageHistory > 0 && this.sentMessages.length > this.maxMessageHistory) {
			this.sentMessages = this.sentMessages.slice(0, this.maxMessageHistory);
		}
	}

	/**
	 * Clears the sent messages history.
	 */
	public clearSentMessages(): void {
		this.sentMessages = [];
	}

	/**
	 * Clears the received messages history.
	 */
	public clearReceivedMessages(): void {
		this.receivedMessages = [];
	}

		/**
		 * Attempts to reconnect to the WebSocket server.
		 * @private
		 */
		private attemptReconnect(): void {
			// Don't reconnect if close was intentional
			if (this.intentionalClose) {
				return;
			}

			if (
				!this.reconnectOptions?.enabled ||
				this.reconnectAttempts >= this.reconnectOptions.maxAttempts
			) {
				return;
			}

			this.reconnectAttempts++;

			this.reconnectTimeoutId = setTimeout(() => {
				this.createSocket(this.url);
			}, this.reconnectOptions.delay);
		}

		/**
		 * Creates and connects a new WebSocket connection.
		 * Sets up internal event listeners for open, close, error, and message events.
		 * If a socket already exists, it will be closed before creating a new one.
		 * Automatic reconnection is handled via the attemptReconnect method on close events.
		 *
		 * @param {string} url - The WebSocket server URL to connect to
		 * @private
		 */
	private createSocket(url: string): void {
		// Reset intentional close flag when creating/reconnecting
		this.intentionalClose = false;

		if (this.socket) {
			if (this.debug) {
				console.log('⚠️ SvelteSocket already exists, closing existing connection');
			}
			// Close existing socket directly without calling removeSocket()
			// to avoid setting intentionalClose flag and clearing state
			this.socket.close();
		}
		this.connectionStatus = WebSocket.CONNECTING;
		this.socket = new WebSocket(url);

			this.socket.addEventListener('open', (event) => {
				this.connectionStatus = WebSocket.OPEN;
				this.reconnectAttempts = 0;
				if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);
				this.onOpenProp?.(event);
			});

			this.socket.addEventListener('close', (closeEvent: CloseEvent) => {
				this.connectionStatus = WebSocket.CLOSED;
				this.onCloseProp?.(closeEvent);
				this.attemptReconnect();
			});

			this.socket.addEventListener('error', (errorEvent: Event) => {
				if (this.debug) {
					console.error('🔌 SvelteSocket error:', errorEvent);
				}
				this.onErrorProp?.(errorEvent);
			});

		this.socket.addEventListener('message', (messageEvent: MessageEvent) => {
			if (this.debug) {
				console.log('🔌 SvelteSocket message:', messageEvent.data);
			}
			this.receivedMessages.unshift({
				message: messageEvent
			});

			// Trim array to maintain FIFO - keep newest messages, remove oldest
			if (this.maxMessageHistory > 0 && this.receivedMessages.length > this.maxMessageHistory) {
				this.receivedMessages = this.receivedMessages.slice(0, this.maxMessageHistory);
			}

			this.onMessageEvent?.(messageEvent);
		});

			if (this.debug) {
				console.log('🔌 SvelteSocket created', this.socket);
			}
			return;
		}

	/**
	 * Closes the WebSocket connection and prevents reconnection.
	 */
	public removeSocket(): void {
		// Set flag to prevent reconnection when close event fires
		this.intentionalClose = true;

			// Clear any pending reconnection timeout
			if (this.reconnectTimeoutId) {
				clearTimeout(this.reconnectTimeoutId);
				this.reconnectTimeoutId = null;
			}

			if (this.socket) {
				this.connectionStatus = WebSocket.CLOSING;
				this.socket.close();
				this.connectionStatus = WebSocket.CLOSED;
				this.socket = undefined;

				// Clear message history
				this.sentMessages = [];
				this.receivedMessages = [];
			}

			// Reset reconnection attempts
			this.reconnectAttempts = 0;
		}
	}
</script>
