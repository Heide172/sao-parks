import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

function buildEndpoint(): string {
	const raw = (env.MINIO_ENDPOINT || 'localhost').trim();

	// Allow both "host" and "https://host"
	if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

	const port = (env.MINIO_PORT || '9000').trim();
	return `http://${raw}:${port}`;
}

const s3Client = new S3Client({
	region: 'us-east-1', // для MinIO/S3-compatible обязателен
	endpoint: buildEndpoint(),
	forcePathStyle: true, // часто нужно для S3-compatible (оставим)
	credentials: {
		accessKeyId: env.MINIO_ACCESS_KEY || '',
		secretAccessKey: env.MINIO_SECRET_KEY || ''
	}
});

const BUCKET_NAME = env.MINIO_BUCKET || 'parks-photos';

export async function uploadPhoto(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const fileName = `${Date.now()}-${file.name}`;

	await s3Client.send(
		new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: fileName,
			Body: buffer,
			ContentType: file.type
		})
	);

	const base = env.ASSET_BASE_URL?.trim();
	console.log('[uploadPhoto] ASSET_BASE_URL =', base);

	if (!base) {
		throw new Error('ASSET_BASE_URL is not set');
	}

	if (base.includes('localhost') || base.includes('127.0.0.1')) {
		throw new Error(`ASSET_BASE_URL points to localhost: ${base}`);
	}

	return `${base.replace(/\/+$/, '')}/${BUCKET_NAME}/${fileName}`;
}

export async function deletePhoto(url: string): Promise<void> {
	const urlParts = url.split('/');
	const fileName = urlParts[urlParts.length - 1];

	await s3Client.send(
		new DeleteObjectCommand({
			Bucket: BUCKET_NAME,
			Key: fileName
		})
	);
}
