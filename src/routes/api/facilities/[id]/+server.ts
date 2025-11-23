import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { facilities } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '$lib/server/auth';
import { deletePhoto } from '$lib/server/blob';

// GET single facility
export const GET: RequestHandler = async ({ params }) => {
	try {
		const facilityId = parseInt(params.id);

		if (isNaN(facilityId)) {
			return json({ error: 'Invalid facility ID' }, { status: 400 });
		}

		const [facility] = await db.select().from(facilities).where(eq(facilities.id, facilityId));

		if (!facility) {
			return json({ error: 'Facility not found' }, { status: 404 });
		}

		return json(facility);
	} catch (error) {
		console.error('Error fetching facility:', error);
		return json({ error: 'Failed to fetch facility' }, { status: 500 });
	}
};

// PUT update facility
export const PUT: RequestHandler = async ({ params, request, cookies }) => {
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const facilityId = parseInt(params.id);

		if (isNaN(facilityId)) {
			return json({ error: 'Invalid facility ID' }, { status: 400 });
		}

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

		const [updatedFacility] = await db
			.update(facilities)
			.set({
				externalId: externalId || null,
				name,
				type,
				latitude,
				longitude,
				photo: photo || null,
				description: description || null,
				area: area || null,
				mafCount: mafCount || null,
				typeCoverage: typeCoverage || null,
				contractAction: contractAction || null,
				contractWith: contractWith || null,
				contractTerm: contractTerm || null,
				parkId,
				updatedAt: new Date()
			})
			.where(eq(facilities.id, facilityId))
			.returning();

		if (!updatedFacility) {
			return json({ error: 'Facility not found' }, { status: 404 });
		}

		return json(updatedFacility);
	} catch (error) {
		console.error('Error updating facility:', error);
		return json({ error: 'Failed to update facility' }, { status: 500 });
	}
};

// DELETE facility
export const DELETE: RequestHandler = async ({ params, cookies }) => {
	if (!isAuthenticated(cookies)) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const facilityId = parseInt(params.id);

		if (isNaN(facilityId)) {
			return json({ error: 'Invalid facility ID' }, { status: 400 });
		}

		// Get facility to check for photo
		const [facility] = await db.select().from(facilities).where(eq(facilities.id, facilityId));

		if (!facility) {
			return json({ error: 'Facility not found' }, { status: 404 });
		}

		// Delete photo from blob storage if exists
		if (facility.photo) {
			try {
				await deletePhoto(facility.photo);
			} catch (error) {
				console.error('Error deleting photo:', error);
				// Continue with facility deletion even if photo deletion fails
			}
		}

		// Delete facility
		await db.delete(facilities).where(eq(facilities.id, facilityId));

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting facility:', error);
		return json({ error: 'Failed to delete facility' }, { status: 500 });
	}
};
