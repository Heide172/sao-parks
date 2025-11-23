import { json, type RequestHandler } from '@sveltejs/kit';
import { verifyCredentials, createSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return json({ error: 'Username and password are required' }, { status: 400 });
		}

		if (verifyCredentials(username, password)) {
			createSession(cookies);
			return json({ success: true });
		}

		return json({ error: 'Invalid credentials' }, { status: 401 });
	} catch (error) {
		return json({ error: 'Invalid request' }, { status: 400 });
	}
};
