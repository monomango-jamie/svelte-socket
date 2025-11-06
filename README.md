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

### In parent components including +page.svelte or +layout.svelte...

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

<SocketProvider {svelteSocket}>
    {@render children()}
</SocketProvider >
```

### In any child component...


```svelte
<script>
	import { useSocket } from 'svelte-socket';
	let { children } = $props();
	const socket = useSocket()
	let isConnected = $derived(socket.connectionStatus === WebSocket.OPEN);
	let receivedMessages = $derived(socket.receivedMessages)
</script>

<p>{isConnected}</p>
{#each receivedMessages as msg, i}
	<p>{msg.origin}<p>
{/each}

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
| `maxMessageHistory` | `number`                       | No       | Max messages to keep in history (default: `50`). Set to `0` for unlimited |

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
	maxMessageHistory: 100, // Keep last 100 messages (default: 50)
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
| `sentMessages`     | `Array<{message: string \| ArrayBuffer \| Blob \| ArrayBufferView, timestamp: number}>` | Sent message history (newest first, via `unshift`). Auto-trimmed to `maxMessageHistory` |
| `receivedMessages` | `Array<{message: MessageEvent}>`              | Received message history (newest first, via `unshift`). Auto-trimmed to `maxMessageHistory` |
| `maxMessageHistory` | `number`                                     | Maximum number of messages to keep in history (default: `50`, readonly)     |

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
	callback: (event: MessageEvent | CloseEvent | Event) => void
): void
```

Adds event listener to WebSocket. The callback type is automatically inferred based on the event type:
- `'message'` → `(event: MessageEvent) => void`
- `'close'` → `(event: CloseEvent) => void`
- `'open'` → `(event: Event) => void`
- `'error'` → `(event: Event) => void`

Throws if socket not connected.

```javascript
socket.addEventListener('message', (event) => {
	console.log(event.data); // event is typed as MessageEvent
});
```

##### `removeEventListener(event, callback)`

```typescript
removeEventListener(
	event: 'message' | 'close' | 'open' | 'error',
	callback: (event: MessageEvent | CloseEvent | Event) => void
): void
```

Removes event listener. Callback types match `addEventListener`.

```javascript
const handler = (event) => console.log(event.data);
socket.addEventListener('message', handler);
socket.removeEventListener('message', handler);
```

##### `sendMessage(message)`

```typescript
sendMessage(message: string | ArrayBuffer | Blob | ArrayBufferView): void
```

Sends a text or binary message through the WebSocket. Supports strings, ArrayBuffer, Blob, TypedArray, and DataView. Stores in `sentMessages` array. Throws if not connected or not in OPEN state.

**Example:**

```javascript
// Send text
socket.sendMessage('Hello, server!');
socket.sendMessage(JSON.stringify({ type: 'ping' }));

// Send binary data
const buffer = new Uint8Array([1, 2, 3, 4]);
socket.sendMessage(buffer);
```

##### `clearSentMessages()`

```typescript
clearSentMessages(): void
```

Clears `sentMessages` array.

```javascript
socket.clearSentMessages();
```

##### `clearReceivedMessages()`

```typescript
clearReceivedMessages(): void
```

Clears `receivedMessages` array.

```javascript
socket.clearReceivedMessages();
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

Context provider component that makes a socket instance available to child components.

**Props:**

| Property       | Type           | Required | Description                                        |
| -------------- | -------------- | -------- | -------------------------------------------------- |
| `url`          | `string`       | Yes*     | WebSocket server URL (automatically creates socket) |
| `svelteSocket` | `SvelteSocket` | Yes*     | Pre-configured SvelteSocket instance      |
| `children`     | `Snippet`      | No       | Child components                                   |

*At least one of `url` or `svelteSocket` must be provided. If both are provided, `svelteSocket` takes precedence.

**Basic Usage:**

The simplest way to use the provider is to pass a `url`, which automatically creates a `SvelteSocket` for you:

```svelte
<script>
	import { SocketProvider } from 'svelte-socket';

	let { children } = $props();
</script>

<SocketProvider url="ws://localhost:8080">
	{@render children()}
</SocketProvider>
```

**Custom Socket Configuration:**

You can also create your own `SvelteSocket` with custom callbacks and options, then pass it to the provider:

```svelte
<script>
	import { SocketProvider, SvelteSocket } from 'svelte-socket';

	let { children } = $props();

	const svelteSocket = new SvelteSocket({
		url: 'ws://localhost:8080',
		debug: true,
		reconnectOptions: {
			enabled: true,
			delay: 1000,
			maxAttempts: 5
		},
		onMessage: (event) => {
			console.log('Received:', event.data);
		},
		onOpen: () => {
			console.log('Connected!');
		}
	});
</script>

<SocketProvider {svelteSocket}>
	{@render children()}
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

**Styling Requirements:**

This component requires Tailwind CSS. You must configure Tailwind to scan the package files:

**Tailwind v4:**
```css
/* app.css */
@import 'tailwindcss';
@source '../node_modules/@hardingjam/svelte-socket/dist/**/*.svelte';
```

**Tailwind v3:**
```js
// tailwind.config.js
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@hardingjam/svelte-socket/dist/**/*.svelte'
  ],
  // ... rest of config
}
```

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
<!-- +layout.svelte -->
<script>
	import { SocketProvider } from 'svelte-socket';

	let { children } = $props();
</script>

<SocketProvider url="ws://localhost:8080">
	{@render children()}
</SocketProvider>

<!-- +page.svelte -->
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
