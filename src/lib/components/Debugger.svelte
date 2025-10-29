<!--
	@component
	A debug panel for visualizing SvelteSocket connection status, sent messages, and received messages.
	Useful for development and troubleshooting WebSocket connections.
	
	@prop {SvelteSocket} socket - The SvelteSocket instance to debug
	
	@example
	```svelte
	<script>
		import { SvelteSocket } from '$lib/SvelteSocket.svelte';
		import Debugger from '$lib/components/Debugger.svelte';
		
		const socket = new SvelteSocket({ url: 'ws://localhost:8080' });
	</script>
	
	<Debugger {socket} />
	```
-->
<script lang="ts">
	import type { SvelteSocket } from '../SvelteSocket.svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		socket: SvelteSocket;
	}

	let { socket }: Props = $props();

	// Reactive values that will update when socket state changes
	const isConnected = $derived(socket.connectionStatus === WebSocket.OPEN);
	const sentMessages = $derived(socket.sentMessages);
	const receivedMessages = $derived(socket.receivedMessages);

	function formatTimestamp(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3
		});
	}
</script>

<div
	class="absolute top-4 right-4 max-w-2xl rounded-lg border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-xl"
>
	<div class="mb-6 flex flex-col items-center justify-between gap-2">
		<h2 class="text-2xl font-bold text-slate-100">SvelteSocket Debugger</h2>
		<div class="flex items-center gap-2">
			<span class="relative flex h-3 w-3" class:animate-pulse={isConnected}>
				<span
					class="absolute inline-flex h-full w-full rounded-full opacity-75"
					class:bg-green-400={isConnected}
					class:bg-red-400={!isConnected}
				></span>
				<span
					class="relative inline-flex h-3 w-3 rounded-full"
					class:bg-green-500={isConnected}
					class:bg-red-500={!isConnected}
				></span>
			</span>
			<span
				class="text-sm font-medium"
				class:text-green-400={isConnected}
				class:text-red-400={!isConnected}
			>
				{isConnected ? 'Connected' : 'Disconnected'}
			</span>
		</div>
	</div>

	<!-- Connection Status Card -->
	<div class="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
		<h3 class="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">Status</h3>
		<div class="grid grid-cols-3 gap-4">
			<div class="flex flex-col">
				<span class="mb-1 text-xs text-slate-500">State</span>
				<span
					class="font-mono text-lg"
					class:text-green-400={socket.connectionStatus === WebSocket.OPEN}
					class:text-yellow-400={socket.connectionStatus === WebSocket.CONNECTING}
					class:text-orange-400={socket.connectionStatus === WebSocket.CLOSING}
					class:text-red-400={socket.connectionStatus === WebSocket.CLOSED}
				>
					{#if socket.connectionStatus === WebSocket.CONNECTING}
						CONNECTING
					{:else if socket.connectionStatus === WebSocket.OPEN}
						OPEN
					{:else if socket.connectionStatus === WebSocket.CLOSING}
						CLOSING
					{:else}
						CLOSED
					{/if}
				</span>
			</div>
			<div class="flex flex-col">
				<span class="mb-1 text-xs text-slate-500">Messages Sent</span>
				<span class="font-mono text-lg text-emerald-400">{sentMessages.length}</span>
			</div>
			<div class="flex flex-col">
				<span class="mb-1 text-xs text-slate-500">Messages Received</span>
				<span class="font-mono text-lg text-blue-400">{receivedMessages.length}</span>
			</div>
		</div>
	</div>

	<!-- Received Messages Card -->
	<div class="rounded-lg border border-slate-700 bg-slate-800 p-4">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-sm font-semibold tracking-wide text-slate-400 uppercase">
				Received Messages
			</h3>
			{#if receivedMessages.length > 0}
				<button
					onclick={() => (socket.receivedMessages = [])}
					class="rounded border border-blue-500/30 bg-blue-500/20 px-2 py-1 text-xs text-blue-300 transition-colors hover:bg-blue-500/30"
				>
					Clear
				</button>
			{/if}
		</div>

		{#if receivedMessages.length === 0}
			<div class="py-8 text-center text-slate-500">
				<svg
					class="mx-auto mb-3 h-12 w-12 opacity-50"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
					/>
				</svg>
				<p class="text-sm">No messages received yet</p>
			</div>
		{:else}
			<div class="max-h-64 space-y-2 overflow-y-auto">
				{#each receivedMessages as { message }, index (message)}
					<div
						class="rounded-md border border-slate-600 bg-slate-900 p-3"
						in:slide={{ duration: 200 }}
					>
						<div class="mb-2 flex items-start justify-between gap-2">
							{#if message.origin}
								<span class="font-mono text-xs text-blue-400">
									{message.origin}
								</span>
							{/if}
						</div>
						<div
							class="rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm break-all text-slate-300"
						>
							{message.data || '(empty message)'}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Sent Messages Card -->
	<div class="mt-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-sm font-semibold tracking-wide text-slate-400 uppercase">Sent Messages</h3>
			{#if sentMessages.length > 0}
				<button
					onclick={() => socket.clearSentMessages()}
					class="rounded border border-red-500/30 bg-red-500/20 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-500/30"
				>
					Clear
				</button>
			{/if}
		</div>

		{#if sentMessages.length === 0}
			<div class="py-8 text-center text-slate-500">
				<svg
					class="mx-auto mb-3 h-12 w-12 opacity-50"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					/>
				</svg>
				<p class="text-sm">No messages sent yet</p>
			</div>
		{:else}
			<div class="max-h-64 space-y-2 overflow-y-auto">
				{#each sentMessages as { message, timestamp }, index (timestamp)}
					<div
						class="rounded-md border border-slate-600 bg-slate-900 p-3"
						in:slide={{ duration: 200 }}
					>
						<div class="mb-2 flex items-start justify-between gap-2">
							<span class="font-mono text-xs text-emerald-400">
								{formatTimestamp(timestamp)}
							</span>
						</div>
						<div
							class="rounded border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm break-all text-slate-300"
						>
							{message}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
