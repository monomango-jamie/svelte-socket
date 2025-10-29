# svelte-socket

A reactive WebSocket wrapper for Svelte 5, built with runes for seamless state management and real-time connection handling.

## Features

- 🔌 **Reactive WebSocket Wrapper** - Built with Svelte 5 runes for automatic reactivity
- 📊 **Event Listener Tracking** - Track all registered event listeners with `SvelteSet`
- 📨 **Reactive Message History** - Automatically track sent messages with timestamps in a reactive array
- 🎯 **Context Provider Pattern** - Optional provider/consumer pattern for easy component integration
- 🐛 **Debug Component** - Built-in debugger UI to visualize connections, listeners, and messages
- ✅ **Fully Typed** - TypeScript support out of the box
- 🧪 **Well Tested** - Comprehensive test suite included

## Installation

```bash
npm install svelte-socket
```

## Quick Start

### Basic Usage

```svelte
<script>
  import { SvelteSocket } from 'svelte-socket';
  
  const socket = new SvelteSocket('ws://localhost:8080');
  
  // Add event listeners
  socket.addEventListener('message', (event) => {
    console.log('Received:', event.data);
  });
  
  // Send messages
  socket.sendMessage('Hello, Server!');
  
  // Check connection status
  console.log(socket.isConnected); // reactive property
  
  // Access sent message history
  console.log(socket.sentMessages); // reactive array
</script>

{#if socket.isConnected}
  <p>Connected! ✅</p>
{:else}
  <p>Disconnected ❌</p>
{/if}

<p>Sent {socket.sentMessages.length} messages</p>
```

### Using the Provider Pattern

```svelte
<!-- App.svelte -->
<script>
  import { SocketProvider } from 'svelte-socket';
</script>

<SocketProvider url="ws://localhost:8080">
  <YourComponent />
</SocketProvider>

<!-- YourComponent.svelte -->
<script>
  import { useSocket } from 'svelte-socket';
  
  const socket = useSocket();
  
  socket.addEventListener('message', (event) => {
    console.log('Message:', event.data);
  });
</script>
```

## API Reference

### `SvelteSocket`

The main WebSocket wrapper class with reactive state management.

#### Constructor

```typescript
new SvelteSocket(url: string)
```

Creates a new WebSocket connection to the specified URL.

**Parameters:**
- `url` - WebSocket server URL (e.g., `ws://localhost:8080`)

**Example:**
```javascript
const socket = new SvelteSocket('ws://localhost:8080');
```

#### Properties

##### `isConnected`

```typescript
isConnected: boolean (reactive)
```

Reactive boolean indicating whether the socket is currently connected.

**Example:**
```svelte
{#if socket.isConnected}
  <span>Connected</span>
{/if}
```

##### `sentMessages`

```typescript
sentMessages: Array<{ message: string; timestamp: number }> (reactive)
```

Reactive array containing the history of all sent messages with their timestamps.

**Example:**
```svelte
{#each socket.sentMessages as { message, timestamp }}
  <div>{new Date(timestamp).toLocaleTimeString()}: {message}</div>
{/each}
```

#### Methods

##### `addEventListener(event, callback)`

```typescript
addEventListener(event: string, callback: (event: any) => void): void
```

Adds an event listener to the WebSocket. The listener is tracked internally for debugging.

**Parameters:**
- `event` - Event type (`'message'`, `'close'`, `'open'`, `'error'`)
- `callback` - Function to call when the event occurs

**Throws:**
- Error if socket is not connected

**Example:**
```javascript
socket.addEventListener('message', (event) => {
  console.log('Received:', event.data);
});
```

##### `removeEventListener(event, callback)`

```typescript
removeEventListener(event: string, callback: (event: any) => void): void
```

Removes a specific event listener from the WebSocket.

**Parameters:**
- `event` - Event type
- `callback` - The callback function to remove

**Example:**
```javascript
const handler = (event) => console.log(event.data);
socket.addEventListener('message', handler);
socket.removeEventListener('message', handler);
```

##### `sendMessage(message)`

```typescript
sendMessage(message: string): void
```

Sends a message through the WebSocket and stores it in the message history.

**Parameters:**
- `message` - The message string to send

**Throws:**
- Error if socket is not connected
- Error if socket is not in OPEN state

**Example:**
```javascript
socket.sendMessage('Hello, World!');
socket.sendMessage(JSON.stringify({ type: 'ping' }));
```

##### `getEventListeners(event?)`

```typescript
getEventListeners(event?: string): Array | Map
```

Gets registered event listeners.

**Parameters:**
- `event` (optional) - Specific event type to filter by

**Returns:**
- If `event` provided: Array of listener functions for that event
- If no `event`: Map of all event types to their listeners

**Example:**
```javascript
// Get listeners for a specific event
const messageListeners = socket.getEventListeners('message');

// Get all listeners
const allListeners = socket.getEventListeners();
```

##### `clearSentMessages()`

```typescript
clearSentMessages(): void
```

Clears the sent message history.

**Example:**
```javascript
socket.clearSentMessages();
```

##### `removeSocket()`

```typescript
removeSocket(): void
```

Closes the WebSocket connection and clears all tracked listeners and message history.

**Example:**
```javascript
socket.removeSocket();
```

---

### `SocketProvider`

A Svelte component that provides a `SvelteSocket` instance to child components via context.

#### Props

- `url` (string, required) - WebSocket server URL
- `children` (Snippet, optional) - Child components

#### Usage

```svelte
<script>
  import { SocketProvider } from 'svelte-socket';
</script>

<SocketProvider url="ws://localhost:8080">
  <YourComponents />
</SocketProvider>
```

---

### `useSocket()`

A hook function to access the `SvelteSocket` instance from context.

**Returns:** `SvelteSocket` instance

**Throws:** Error if not used within a `SocketProvider`

**Example:**
```svelte
<script>
  import { useSocket } from 'svelte-socket';
  
  const socket = useSocket();
  
  socket.addEventListener('message', (event) => {
    console.log(event.data);
  });
</script>
```

---

### `Debugger`

A visual debug component that displays connection status, event listeners, and sent messages.

#### Props

- `socket` (`SvelteSocket`, required) - The socket instance to debug

#### Features

- Real-time connection status with visual indicator
- List of all registered event listeners by type
- Scrollable history of sent messages with timestamps
- Clear button for message history
- Styled with Tailwind CSS

#### Usage

```svelte
<script>
  import { SvelteSocket, Debugger } from 'svelte-socket';
  
  const socket = new SvelteSocket('ws://localhost:8080');
</script>

<Debugger {socket} />
```

The debugger will display:
- Connection state (OPEN/CLOSED)
- Total listener count
- Number of messages sent
- Detailed list of event listeners
- Message history with timestamps (reactively updates as messages are sent)

---

### Context Functions

#### `setSocket(socket)`

```typescript
setSocket(socket: SvelteSocket): void
```

Manually sets a socket instance in Svelte context. Usually used by `SocketProvider`.

#### `getSocketContext()`

```typescript
getSocketContext(): SvelteSocket
```

Retrieves the socket instance from Svelte context.

**Throws:** Error if no socket found in context

## Examples

### Echo Client

```svelte
<script>
  import { SvelteSocket } from 'svelte-socket';
  
  const socket = new SvelteSocket('ws://localhost:8080');
  
  let messages = $state([]);
  let input = $state('');
  
  socket.addEventListener('message', (event) => {
    messages.push({ text: event.data, from: 'server' });
  });
  
  function send() {
    if (input.trim()) {
      socket.sendMessage(input);
      messages.push({ text: input, from: 'client' });
      input = '';
    }
  }
</script>

<div>
  {#each messages as msg}
    <p class:client={msg.from === 'client'}>
      {msg.from}: {msg.text}
    </p>
  {/each}
</div>

<input bind:value={input} onkeydown={(e) => e.key === 'Enter' && send()} />
<button onclick={send}>Send</button>
```

### JSON Message Handler

```svelte
<script>
  import { SvelteSocket } from 'svelte-socket';
  
  const socket = new SvelteSocket('ws://localhost:8080');
  
  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'ping':
          socket.sendMessage(JSON.stringify({ type: 'pong' }));
          break;
        case 'update':
          handleUpdate(data.payload);
          break;
      }
    } catch (err) {
      console.error('Invalid JSON:', err);
    }
  });
  
  function handleUpdate(payload) {
    // Handle update
  }
</script>
```

### Reactive Message History

```svelte
<script>
  import { SvelteSocket } from 'svelte-socket';
  
  const socket = new SvelteSocket('ws://localhost:8080');
  
  let input = $state('');
  
  function send() {
    if (input.trim()) {
      socket.sendMessage(input);
      input = '';
    }
  }
</script>

<div>
  <h2>Sent Messages: {socket.sentMessages.length}</h2>
  
  {#each socket.sentMessages as { message, timestamp }}
    <div>
      <span>{new Date(timestamp).toLocaleTimeString()}</span>
      <span>{message}</span>
    </div>
  {/each}
  
  <input bind:value={input} />
  <button onclick={send}>Send</button>
  <button onclick={() => socket.clearSentMessages()}>Clear History</button>
</div>
```

### Using with Debugger

```svelte
<script>
  import { SvelteSocket, Debugger } from 'svelte-socket';
  
  const socket = new SvelteSocket('ws://localhost:8080');
  
  socket.addEventListener('message', (event) => {
    console.log('Message:', event.data);
  });
  
  socket.addEventListener('error', (error) => {
    console.error('Error:', error);
  });
  
  function sendPing() {
    socket.sendMessage(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
  }
</script>

<div>
  <button onclick={sendPing}>Send Ping</button>
  
  <Debugger {socket} />
</div>
```

## Development

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

### Run tests

```bash
npm test
```

### Build library

```bash
npm run build
```

## Requirements

- Svelte 5.0.0 or higher
- Modern browser with WebSocket support

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
