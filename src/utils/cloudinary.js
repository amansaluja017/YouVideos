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
    await cloudinary.uploader.destroy(public_id);
  } catch (err) {
    console.error("Error deleting from cloudinary: ", err);
  }
};

const deleteResourcesFromCloudinary = async (public_id) => {
  try {
    const imageResult = await cloudinary.uploader.destroy(public_id, {
      resource_type: "image",
    });
    const videoResult = await cloudinary.uploader.destroy(public_id, {
      resource_type: "video",
    });
    console.table([videoResult, imageResult]);
  } catch (err) {
    console.error("Error deleting resources from cloudinary: ", err);
  }
};

export {
  uploadToCloudinary,
  deleteFromCloudinary,
  deleteResourcesFromCloudinary,
};
