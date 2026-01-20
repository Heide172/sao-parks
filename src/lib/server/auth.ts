import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function verifyCredentials(username: string, password: string): boolean {
	return username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD;
}

export function createSession(cookies: Cookies): void {
	// Simple session token - just a flag since we have only one admin
	const sessionToken = crypto.randomUUID();

	cookies.set(SESSION_COOKIE_NAME, sessionToken, {
		path: '/',
		httpOnly: true,
		secure: false,
		sameSite: 'lax',
		maxAge: SESSION_MAX_AGE
	});
}

export function destroySession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

export function isAuthenticated(cookies: Cookies): boolean {
	const session = cookies.get(SESSION_COOKIE_NAME);
	return !!session;
}
