# svelte-socket

WebSocket wrapper for Svelte 5 using runes.

## Overview

This library provides:

- **SvelteSocket** - WebSocket wrapper class with reactive state properties (`connectionStatus`, `sentMessages`, `receivedMessages`)
- **SocketProvider** - Context provider component that instantiates `SvelteSocket` and makes it available to child components
- **Debugger** - UI panel component showing connection status, sent messages, and received messages
- **useSocket()** - Hook to access socket instance from context

## Features

- Constructor accepts configuration object with URL and optional callbacks (`onMessage`, `onOpen`, `onClose`, `onError`)
- Optional debug logging via `debug` flag
- Auto-reconnection with configurable delay and max attempts
- Reactive message history (sent and received)
- All state properties use Svelte 5 `$state` runes
- TypeScript support

## Installation

```bash
npm install svelte-socket
```

## Usage

```svelte
<script>
	import { SvelteSocket } from 'svelte-socket';

	// Callbacks can be added on construction...
	const socket = new SvelteSocket({ url: 'ws://localhost:8080', onOpen: () => console.log('Hello, server!') });
	const isConnected = $derived(socket.connectionStatus === WebSocket.OPEN);

	// ...or later using addEventListener
	socket.addEventListener('message', (event) => {
		console.log(event.data);
	});

	socket.sendMessage('text');
</script>

{#if isConnected}
	<p>Connected</p>
{/if}
```

## API

### `SvelteSocket`

#### Constructor

```typescript
new SvelteSocket(options: SocketConstructorArgs)
```

**Options:**

| Property           | Type                            | Required | Description                               |
| ------------------ | ------------------------------- | -------- | ----------------------------------------- |
| `url`              | `string`                        | Yes      | WebSocket server URL                      |
| `onMessage`        | `(event: MessageEvent) => void` | No       | Called when message received              |
| `onOpen`           | `(event: Event) => void`        | No       | Called when connection opens              |
| `onClose`          | `(event: CloseEvent) => void`   | No       | Called when connection closes             |
| `onError`          | `(event: Event) => void`        | No       | Called on error                           |
| `debug`            | `boolean`                       | No       | Enable console logging (default: `false`) |
| `reconnectOptions` | `ReconnectOptions`              | No       | Auto-reconnection config                  |

**ReconnectOptions:**

| Property      | Type      | Description                           |
| ------------- | --------- | ------------------------------------- |
| `enabled`     | `boolean` | Enable auto-reconnection              |
| `delay`       | `number`  | Milliseconds before reconnect attempt |
| `maxAttempts` | `number`  | Maximum reconnection attempts         |

**Example:**

```javascript
const socket = new SvelteSocket({
	url: 'ws://localhost:8080',
	debug: true,
	reconnectOptions: {
		enabled: true,
		delay: 1000,
		maxAttempts: 5
	},
	onMessage: (event) => console.log(event.data),
	onOpen: () => console.log('connected'),
	onClose: () => console.log('disconnected')
});
```

#### Properties

| Property           | Type                                          | Description                                                                 |
| ------------------ | --------------------------------------------- | --------------------------------------------------------------------------- |
| `connectionStatus` | `WebSocket['readyState']`                     | Connection state: `0` (CONNECTING), `1` (OPEN), `2` (CLOSING), `3` (CLOSED) |
| `sentMessages`     | `Array<{message: string, timestamp: number}>` | Sent message history (newest first)                                         |
| `receivedMessages` | `Array<{message: MessageEvent}>`              | Received message history (newest first)                                     |

**Example:**

```svelte
<script>
	const socket = new SvelteSocket({ url: 'ws://localhost:8080' });

	const connectionStatus = $derived(socket.connectionStatus);
	const sentMessages = $derived(socket.sentMessages);
	const receivedMessages = $derived(socket.receivedMessages);
</script>

{#if connectionStatus === WebSocket.OPEN}
	<p>Open</p>
{:else if connectionStatus === WebSocket.CONNECTING}
	<p>Connecting</p>
{:else}
	<p>Closed</p>
{/if}

<p>{sentMessages.length} sent</p>
<p>{receivedMessages.length} received</p>

{#each receivedMessages as { message }}
	<div>{message.data}</div>
{/each}
```

#### Methods

##### `addEventListener(event, callback)`

```typescript
addEventListener(
	event: 'message' | 'close' | 'open' | 'error',
	callback: (event: Event) => void
): void
```

Adds event listener to WebSocket.

Throws if socket not connected.

```javascript
socket.addEventListener('message', (event) => {
	console.log(event.data);
});
```

##### `removeEventListener(event, callback)`

```typescript
removeEventListener(
	event: 'message' | 'close' | 'open' | 'error',
	callback: (event: Event) => void
): void
```

Removes event listener.

```javascript
const handler = (event) => console.log(event.data);
socket.addEventListener('message', handler);
socket.removeEventListener('message', handler);
```

##### `sendMessage(message)`

```typescript
sendMessage(message: string): void
```

Sends message via WebSocket. Stores in `sentMessages` array.

Throws if socket not connected or not in OPEN state.

```javascript
socket.sendMessage('hello');
socket.sendMessage(JSON.stringify({ type: 'ping' }));
```

##### `clearSentMessages()`

```typescript
clearSentMessages(): void
```

Clears `sentMessages` array.

```javascript
socket.clearSentMessages();
```

##### `removeSocket()`

```typescript
removeSocket(): void
```

Closes WebSocket connection. Clears message history. Prevents reconnection.

```javascript
socket.removeSocket();
```

---

### `SocketProvider`

Context provider component.

**Props:**

| Property   | Type      | Required |
| ---------- | --------- | -------- |
| `url`      | `string`  | Yes      |
| `children` | `Snippet` | No       |

**Example:**

```svelte
<script>
	import { SocketProvider } from 'svelte-socket';
</script>

<SocketProvider url="ws://localhost:8080">
	<YourComponent />
</SocketProvider>
```

---

### `useSocket()`

```typescript
useSocket(): SvelteSocket
```

Returns socket instance from context.

Throws if not used within `SocketProvider`.

**Example:**

```svelte
<script>
	import { useSocket } from 'svelte-socket';

	const socket = useSocket();
</script>
```

---

### `Debugger`

Debug UI component. Shows connection status, sent messages, received messages.

**Props:**

| Property | Type           | Required |
| -------- | -------------- | -------- |
| `socket` | `SvelteSocket` | Yes      |

**Example:**

```svelte
<script>
	import { SvelteSocket, Debugger } from 'svelte-socket';

	const socket = new SvelteSocket({ url: 'ws://localhost:8080' });
</script>

<Debugger {socket} />
```

Displays:

- Connection state (CONNECTING/OPEN/CLOSING/CLOSED)
- Message counts (sent/received)
- Sent message history with timestamps
- Received message history with data

Requires Tailwind CSS.

---

### Context Functions

#### `setSocket(socket)`

```typescript
setSocket(socket: SvelteSocket): void
```

Sets socket in Svelte context. Used by `SocketProvider`.

#### `getSocketContext()`

```typescript
getSocketContext(): SvelteSocket
```

Gets socket from context. Throws if not found.

## Examples

### Basic

```svelte
<script>
	import { SvelteSocket } from 'svelte-socket';

	const socket = new SvelteSocket({ url: 'ws://localhost:8080' });

	socket.addEventListener('message', (event) => {
		console.log(event.data);
	});

	function send() {
		socket.sendMessage('test');
	}
</script>

<button onclick={send}>Send</button>
```

### Auto-reconnect

```svelte
<script>
	import { SvelteSocket } from 'svelte-socket';

	const socket = new SvelteSocket({
		url: 'ws://localhost:8080',
		debug: true,
		reconnectOptions: {
			enabled: true,
			delay: 1000,
			maxAttempts: 5
		}
	});
</script>
```

### JSON Messages

```svelte
<script>
	import { SvelteSocket } from 'svelte-socket';

	const socket = new SvelteSocket({ url: 'ws://localhost:8080' });

	socket.addEventListener('message', (event) => {
		const data = JSON.parse(event.data);

		if (data.type === 'ping') {
			socket.sendMessage(JSON.stringify({ type: 'pong' }));
		}
	});
</script>
```

### Message History

```svelte
<script>
	import { SvelteSocket } from 'svelte-socket';

	const socket = new SvelteSocket({ url: 'ws://localhost:8080' });
	const sentMessages = $derived(socket.sentMessages);
	const receivedMessages = $derived(socket.receivedMessages);

	let input = $state('');

	function send() {
		if (input) {
			socket.sendMessage(input);
			input = '';
		}
	}
</script>

<input bind:value={input} />
<button onclick={send}>Send</button>

<h3>Sent ({sentMessages.length})</h3>
{#each sentMessages as { message, timestamp }}
	<div>
		{new Date(timestamp).toLocaleTimeString()}: {message}
	</div>
{/each}

<h3>Received ({receivedMessages.length})</h3>
{#each receivedMessages as { message }}
	<div>{message.data}</div>
{/each}

<button onclick={() => socket.clearSentMessages()}>Clear</button>
```

### With Provider

```svelte
<!-- App.svelte -->
<script>
	import { SocketProvider } from 'svelte-socket';
	import ChatComponent from './ChatComponent.svelte';
</script>

<SocketProvider url="ws://localhost:8080">
	<ChatComponent />
</SocketProvider>

<!-- ChatComponent.svelte -->
<script>
	import { useSocket } from 'svelte-socket';

	const socket = useSocket();

	socket.addEventListener('message', (event) => {
		console.log(event.data);
	});
</script>
```

## TouchDesigner Integration

Broadcast to all connected clients:

```python
# TouchDesigner Text DAT
def broadcast():
    webServer = op('webserver1')
    clients = webServer.clients

    for client in clients:
        webServer.webSocketSendText(client, "message")

    print(f"Sent to {len(clients)} clients")
```

## Requirements

- Svelte 5.0+
- WebSocket support

## License

MIT
