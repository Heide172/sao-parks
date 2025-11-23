import { put, del } from '@vercel/blob';
import { env } from '$env/dynamic/private';

export async function uploadPhoto(file: File): Promise<string> {
	if (!env.BLOB_READ_WRITE_TOKEN) {
		throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
	}

	const blob = await put(file.name, file, {
		access: 'public',
		token: env.BLOB_READ_WRITE_TOKEN
	});

	return blob.url;
}

export async function deletePhoto(url: string): Promise<void> {
	if (!env.BLOB_READ_WRITE_TOKEN) {
		throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
	}

	await del(url, { token: env.BLOB_READ_WRITE_TOKEN });
}
