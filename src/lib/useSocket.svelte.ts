import { getSocketContext } from './context.js';

/**
 * Hook for accessing the WebSocket instance from context.
 * Use this hook in child components to access the SvelteSocket instance
 * that was provided by SocketProvider.
 *
 * @returns The SvelteSocket instance
 *
 * @example
 * ```svelte
 * <script>
 *   import useSocket from '$lib/useSocket.svelte';
 *
 *   const socket = useSocket();
 *
 *   socket.addEventListener('message', (event) => {
 *     console.log('Received:', event.data);
 *   });
 * </script>
 * ```
 */
export default function useSocket() {
	return getSocketContext();
}
