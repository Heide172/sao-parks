import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { districts } from '$lib/server/db/schema';
import { isAuthenticated } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

export const PUT: RequestHandler = async ({ params, request, cookies }) => {
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const id = parseInt(params.id!);
		const data = await request.json();
		const { name, geometry } = data;

		const [district] = await db
			.update(districts)
			.set({
				name,
				geometry,
				updatedAt: new Date()
			})
			.where(eq(districts.id, id))
			.returning();

		return json(district);
	} catch (error) {
		console.error('Error updating district:', error);
		return json({ error: 'Failed to update district' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const id = parseInt(params.id!);

		await db.delete(districts).where(eq(districts.id, id));

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting district:', error);
		return json({ error: 'Failed to delete district' }, { status: 500 });
	}
};
