import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import logger from "../utils/logger.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const isCloudinaryConfigured = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false;
  }
  const placeholders = ["your_", "placeholder", "dummy", "<", "xxx"];
  const isPlaceholder = [
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  ].some((val) => placeholders.some((p) => val.toLowerCase().includes(p)));

  return !isPlaceholder;
};

export function uploadToCloudinary(fileBuffer, folder = "auctions") {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      const mockUrl = `https://res.cloudinary.com/demo/image/upload/v1/${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      logger.warn(
        "Cloudinary credentials missing or placeholders; returning mock Cloudinary URL: %s",
        mockUrl
      );
      return resolve(mockUrl);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload error: %s", error.message);
          if (
            error.http_code === 401 ||
            error.http_code === 403 ||
            error.message?.includes("403") ||
            error.message?.includes("401") ||
            error.message?.includes("API key") ||
            error.message?.includes("status code")
          ) {
            const fallbackUrl = `https://res.cloudinary.com/demo/image/upload/v1/${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
            logger.warn(
              "Using fallback Cloudinary URL due to credential or API error: %s",
              fallbackUrl
            );
            return resolve(fallbackUrl);
          }
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );

    Readable.from(fileBuffer).pipe(uploadStream);
  });
}

export async function uploadMultipleToCloudinary(files = [], folder = "auctions") {
  if (!files || files.length === 0) return [];
  const uploadPromises = files.map((file) =>
    uploadToCloudinary(file.buffer, folder)
  );
  return Promise.all(uploadPromises);
}

export default cloudinary;

