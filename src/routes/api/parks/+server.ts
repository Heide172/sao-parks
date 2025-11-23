import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { parks } from '$lib/server/db/schema';
import { isAuthenticated } from '$lib/server/auth';

// GET all parks
export const GET: RequestHandler = async () => {
	try {
		const allParks = await db.select().from(parks);
		return json(allParks);
	} catch (error) {
		console.error('Error fetching parks:', error);
		return json({ error: 'Failed to fetch parks' }, { status: 500 });
	}
};

// POST create new park
export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const data = await request.json();

		const { name, description, geometry, area, balanceHolder, districtId } = data;

		const [newPark] = await db
			.insert(parks)
			.values({
				name: name || null,
				description: description || null,
				geometry: geometry || null,
				area: area || null,
				balanceHolder: balanceHolder || null,
				districtId: districtId || null,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning();

		return json(newPark, { status: 201 });
	} catch (error) {
		console.error('Error creating park:', error);
		return json({ error: 'Failed to create park' }, { status: 500 });
	}
};
