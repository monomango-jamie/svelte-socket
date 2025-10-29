<!--
	@component
	A debug panel for visualizing SvelteSocket connection status and registered event listeners.
	Useful for development and troubleshooting WebSocket connections.
	
	@prop {SvelteSocket} socket - The SvelteSocket instance to debug
	
	@example
	```svelte
	<script>
		import { SvelteSocket } from '$lib/SvelteSocket.svelte';
		import Debugger from '$lib/components/Debugger.svelte';
		
		const socket = new SvelteSocket('ws://localhost:8080');
	</script>
	
	<Debugger {socket} />
	```
-->
<script lang="ts">
	import type { SvelteSocket } from '../SvelteSocket.svelte';
	import type { SvelteSet } from 'svelte/reactivity';

	interface Props {
		socket: SvelteSocket;
	}

	let { socket }: Props = $props();

	// Reactive values that will update when socket state changes
	const isConnected = $derived(socket.isConnected);
	const allListeners = $derived(
		socket.getEventListeners() as Map<string, SvelteSet<(event: any) => void>>
	);
	const eventTypes = $derived(Array.from(allListeners.keys()));
	const totalListeners = $derived(
		Array.from(allListeners.values()).reduce((sum, set) => sum + set.size, 0)
	);
	const sentMessages = $derived(socket.sentMessages);

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
					class:text-green-400={isConnected}
					class:text-red-400={!isConnected}
				>
					{isConnected ? 'OPEN' : 'CLOSED'}
				</span>
			</div>
			<div class="flex flex-col">
				<span class="mb-1 text-xs text-slate-500">Total Listeners</span>
				<span class="font-mono text-lg text-blue-400">{totalListeners}</span>
			</div>
			<div class="flex flex-col">
				<span class="mb-1 text-xs text-slate-500">Messages Sent</span>
				<span class="font-mono text-lg text-emerald-400">{sentMessages.length}</span>
			</div>
		</div>
	</div>

	<!-- Event Listeners Card -->
	<div class="rounded-lg border border-slate-700 bg-slate-800 p-4">
		<h3 class="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
			Registered Event Listeners
		</h3>

		{#if eventTypes.length === 0}
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
				<p class="text-sm">No event listeners registered</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each eventTypes as eventType}
					{@const listeners = allListeners.get(eventType)}
					{@const count = listeners?.size || 0}
					<div class="rounded-md border border-slate-600 bg-slate-900 p-3">
						<div class="mb-2 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span
									class="rounded border border-purple-500/30 bg-purple-500/20 px-2 py-1 font-mono text-xs text-purple-300"
								>
									{eventType}
								</span>
								<span class="text-xs text-slate-400">
									{count}
									{count === 1 ? 'listener' : 'listeners'}
								</span>
							</div>
							<span class="font-mono text-xs text-slate-500">
								#{count}
							</span>
						</div>

						<!-- Listener Functions Preview -->
						<div class="mt-2 space-y-1">
							{#each Array.from(listeners || []) as listener, index}
								<div
									class="rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-500"
								>
									<span class="text-slate-600">fn_{index + 1}:</span>
									<span class="text-amber-400">{listener.name || 'anonymous'}</span>
								</div>
							{/each}
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
				{#each sentMessages as { message, timestamp }, index}
					<div class="rounded-md border border-slate-600 bg-slate-900 p-3">
						<div class="mb-2 flex items-start justify-between gap-2">
							<span class="font-mono text-xs text-slate-500">
								#{sentMessages.length - index}
							</span>
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
