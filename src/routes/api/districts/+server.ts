import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { districts } from '$lib/server/db/schema';
import { isAuthenticated } from '$lib/server/auth';

export const GET: RequestHandler = async () => {
	try {
		const allDistricts = await db.select().from(districts);
		return json(allDistricts);
	} catch (error) {
		console.error('Error fetching districts:', error);
		return json({ error: 'Failed to fetch districts' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const data = await request.json();
		const { name, geometry } = data;

		const [district] = await db
			.insert(districts)
			.values({
				name,
				geometry,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning();

		return json(district);
	} catch (error) {
		console.error('Error creating district:', error);
		return json({ error: 'Failed to create district' }, { status: 500 });
	}
};
