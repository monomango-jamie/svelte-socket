import { getContext, setContext } from 'svelte';
import type { SvelteSocket } from './SvelteSocket.svelte';

/**
 * The context key used to store and retrieve the SvelteSocket instance
 */
export const SOCKET_CONTEXT_KEY = 'svelte-socket:socket';

/**
 * Sets the SvelteSocket instance in Svelte's context
 *
 * @param {SvelteSocket} socket - The SvelteSocket instance to store in context
 * @returns {void}
 */
export function setSocket(socket: SvelteSocket) {
	setContext(SOCKET_CONTEXT_KEY, socket);
}

/**
 * Retrieves the SvelteSocket instance from Svelte's context
 *
 * @returns {SvelteSocket} The SvelteSocket instance
 * @throws {Error} If no SvelteSocket is found in context
 */
export function getSocketContext(): SvelteSocket {
	const socket = getContext<SvelteSocket | undefined>(SOCKET_CONTEXT_KEY);
	if (!socket) {
		throw new Error('SvelteSocket not found. Did you forget to use SocketProvider?');
	}
	return socket;
}
