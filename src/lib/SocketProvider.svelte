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
	@prop {SvelteSocket} [svelteSocket] - A pre-instantiated SvelteSocket instance to use instead of creating a new one
-->
<script lang="ts">
	import { setSocket } from './context.js';
	import { SvelteSocket } from './SvelteSocket.svelte';
	interface Props {
		children?: import('svelte').Snippet;
		url: string;
		svelteSocket?: SvelteSocket;
	}

	let { children, url, svelteSocket = new SvelteSocket({ url }) }: Props = $props();

	setSocket(svelteSocket);
</script>

{@render children?.()}
