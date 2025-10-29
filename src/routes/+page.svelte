<script lang="ts">
	import Debugger from '$lib/components/Debugger.svelte';
	import useSocket from '$lib/useSocket.svelte';

	const socket = useSocket();
</script>

<button
	class="rounded-md bg-blue-500 p-2 text-white"
	on:click={() => socket.sendMessage('Hello, world!')}>Send Message</button
>
<Debugger {socket} />
