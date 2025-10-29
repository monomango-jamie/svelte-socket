<script lang="ts">
	import SocketProvider from '$lib/SocketProvider.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<SocketProvider url="ws://localhost:9980">
	{@render children()}
</SocketProvider>
