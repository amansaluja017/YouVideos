import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const uploadToCloudinary = async (filePath) => {
    try {
        if(!filePath) throw new Error('File path is required');

        const image = await cloudinary.uploader.upload(filePath, {
            resource_type: 'auto',
        });
        console.log('Uploading image to cloudinary', image.url);
        return image.url;

    }catch (err) {
        fs.unlinkSync(filePath);
        return null;
        console.error(err);
    }
}

export {uploadToCloudinary};