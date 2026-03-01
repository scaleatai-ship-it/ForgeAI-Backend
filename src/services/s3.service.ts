import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

export class S3Service {
  private client: S3Client | null;

  constructor() {
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_S3_BUCKET) {
      this.client = new S3Client({
        region: env.AWS_REGION,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY
        }
      });
      return;
    }

    this.client = null;
  }

  async uploadJson(key: string, value: unknown) {
    if (!this.client || !env.AWS_S3_BUCKET) {
      return null;
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        Body: JSON.stringify(value),
        ContentType: "application/json"
      })
    );

    return `s3://${env.AWS_S3_BUCKET}/${key}`;
  }
}
