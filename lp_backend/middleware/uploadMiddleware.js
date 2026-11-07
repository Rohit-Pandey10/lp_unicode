import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only image files (JPEG, PNG, WEBP, etc.) are allowed"),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10, // Max 10 images
  },
  fileFilter,
});

export const handleAuctionImagesUpload = (req, res, next) => {
  const uploadArray = upload.array("images", 10);

  uploadArray(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ message: "File too large. Maximum size is 5MB per image." });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res
          .status(400)
          .json({ message: "Unexpected field. Upload images using the 'images' field." });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

export default handleAuctionImagesUpload;

