import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { facilities } from '$lib/server/db/schema';
import { isAuthenticated } from '$lib/server/auth';

// GET all facilities
export const GET: RequestHandler = async () => {
	try {
		const allFacilities = await db.select().from(facilities);
		return json(allFacilities);
	} catch (error) {
		console.error('Error fetching facilities:', error);
		return json({ error: 'Failed to fetch facilities' }, { status: 500 });
	}
};

// POST create new facility
export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const data = await request.json();

		const {
			externalId,
			name,
			type,
			latitude,
			longitude,
			photo,
			description,
			area,
			mafCount,
			typeCoverage,
			contractAction,
			contractWith,
			contractTerm,
			parkId
		} = data;

		const [newFacility] = await db
			.insert(facilities)
			.values({
				externalId: externalId || null,
				name: name || null,
				type: type || null,
				latitude: latitude || null,
				longitude: longitude || null,
				photo: photo || null,
				description: description || null,
				area: area || null,
				mafCount: mafCount || null,
				typeCoverage: typeCoverage || null,
				contractAction: contractAction || null,
				contractWith: contractWith || null,
				contractTerm: contractTerm || null,
				parkId: parkId || null,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning();

		return json(newFacility, { status: 201 });
	} catch (error) {
		console.error('Error creating facility:', error);
		return json({ error: 'Failed to create facility' }, { status: 500 });
	}
};
