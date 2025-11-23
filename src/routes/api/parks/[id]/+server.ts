import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { parks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '$lib/server/auth';

// GET single park
export const GET: RequestHandler = async ({ params }) => {
	try {
		const parkId = parseInt(params.id);

		if (isNaN(parkId)) {
			return json({ error: 'Invalid park ID' }, { status: 400 });
		}

		const [park] = await db.select().from(parks).where(eq(parks.id, parkId));

		if (!park) {
			return json({ error: 'Park not found' }, { status: 404 });
		}

		return json(park);
	} catch (error) {
		console.error('Error fetching park:', error);
		return json({ error: 'Failed to fetch park' }, { status: 500 });
	}
};

// PUT update park
export const PUT: RequestHandler = async ({ params, request, cookies }) => {
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const parkId = parseInt(params.id);

		if (isNaN(parkId)) {
			return json({ error: 'Invalid park ID' }, { status: 400 });
		}

		const data = await request.json();
		const { name, description, geometry, area, balanceHolder, districtId } = data;

		const [updatedPark] = await db
			.update(parks)
			.set({
				name,
				description: description || null,
				geometry: geometry || null,
				area: area || null,
				balanceHolder: balanceHolder || null,
				districtId: districtId || null,
				updatedAt: new Date()
			})
			.where(eq(parks.id, parkId))
			.returning();

		if (!updatedPark) {
			return json({ error: 'Park not found' }, { status: 404 });
		}

		return json(updatedPark);
	} catch (error) {
		console.error('Error updating park:', error);
		return json({ error: 'Failed to update park' }, { status: 500 });
	}
};

// DELETE park
export const DELETE: RequestHandler = async ({ params, cookies }) => {
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const parkId = parseInt(params.id);

		if (isNaN(parkId)) {
			return json({ error: 'Invalid park ID' }, { status: 400 });
		}

		const [deletedPark] = await db
			.delete(parks)
			.where(eq(parks.id, parkId))
			.returning();

		if (!deletedPark) {
			return json({ error: 'Park not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting park:', error);
		return json({ error: 'Failed to delete park' }, { status: 500 });
	}
};
