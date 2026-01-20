import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

const s3Client = new S3Client({
	region: 'us-east-1', // MinIO игнорирует регион, но он обязателен для SDK
	endpoint: `http://${env.MINIO_ENDPOINT || 'localhost'}:${env.MINIO_PORT || '9000'}`,
	forcePathStyle: true, // Обязательно для MinIO
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
			ContentType: file.type,
			ACL: 'public-read' // Попытка сделать файл публичным
		})
	);

	// Формируем URL.
	// Если приложение и MinIO в Docker, для клиента (браузера)
	// адрес может отличаться от внутреннего endpoint.
	const publicUrl = env.PUBLIC_ASSET_URL
		? `${env.PUBLIC_ASSET_URL}/${BUCKET_NAME}/${fileName}`
		: `http://localhost:9000/${BUCKET_NAME}/${fileName}`;

	return publicUrl;
}

export async function deletePhoto(url: string): Promise<void> {
	// Извлекаем имя файла из URL
	const urlParts = url.split('/');
	const fileName = urlParts[urlParts.length - 1];

	await s3Client.send(
		new DeleteObjectCommand({
			Bucket: BUCKET_NAME,
			Key: fileName
		})
	);
}
