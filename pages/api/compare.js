import formidable from 'formidable';
import { compareImages } from '../../utils/imageCompare';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new formidable.IncomingForm();
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    if (!files.image1 || !files.image2) {
      return res.status(400).json({ error: 'Both images are required' });
    }

    const result = await compareImages(files.image1.filepath, files.image2.filepath);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({ error: 'Error processing images' });
  }
}
