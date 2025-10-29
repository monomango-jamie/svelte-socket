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
	
	@prop {string} url - The WebSocket server URL to connect to
	@prop {Snippet} [children] - Child components that will have access to the socket context
-->
<script lang="ts">
	import { setSocket } from './context.js';
	import { SvelteSocket } from './SvelteSocket.svelte';
	interface Props {
		children?: import('svelte').Snippet;
		url: string;
	}

	let { children, url }: Props = $props();

	const socket = new SvelteSocket({ url });
	setSocket(socket);
</script>

{@render children?.()}
