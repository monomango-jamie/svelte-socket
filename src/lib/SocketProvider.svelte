<!--
	@component
	Provides a SvelteSocket instance to all child components via Svelte context.
	
	This component is optional - you can also instantiate SvelteSocket directly
	and use without the provider pattern.
	
	@example
	```svelte
	<SocketProvider url="ws://localhost:8080">
		<YourComponent />
	</SocketProvider>
	```
	
	Child components can access the socket using `getSocket()` from './context.js'.
	
	@prop {string} [url] - The WebSocket server URL to connect to (required if svelteSocket not provided)
	@prop {Snippet} [children] - Child components that will have access to the socket context
	@prop {SvelteSocket} [svelteSocket] - A pre-instantiated SvelteSocket instance to use instead of creating a new one (required if url not provided)
-->
<script lang="ts">
	import { setSocket } from './context.js';
	import { SvelteSocket } from './SvelteSocket.svelte';
	interface Props {
		children?: import('svelte').Snippet;
		url?: string;
		svelteSocket?: SvelteSocket;
	}

	let { children, url, svelteSocket }: Props = $props();

	// Validate that at least one of url or svelteSocket is provided
	if (!url && !svelteSocket) {
		throw new Error('SocketProvider requires either "url" or "svelteSocket" prop to be provided');
	}

	// Create socket from url if svelteSocket not provided
	const socket = svelteSocket ?? new SvelteSocket({ url: url! });

	setSocket(socket);
</script>

{@render children?.()}
