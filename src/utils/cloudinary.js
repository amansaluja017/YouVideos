import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uploadToCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (err) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (public_id) => {
  try {
    const response = await cloudinary.uploader.destroy(public_id);
  } catch (err) {
    console.error("Error deleting from cloudinary: ", err);
    return null;
  }
};

export { uploadToCloudinary, deleteFromCloudinary };
