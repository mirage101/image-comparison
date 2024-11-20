const multer = require('multer');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to process multer upload
const runMiddleware = (req, res, fn) => {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Handle file upload
        await runMiddleware(req, res, upload.fields([
            { name: 'image1', maxCount: 1 },
            { name: 'image2', maxCount: 1 }
        ]));

        const files = req.files;
        
        if (!files || !files.image1 || !files.image2) {
            return res.status(400).json({ error: 'Please upload both images' });
        }

        // Read images from buffer
        const img1 = PNG.sync.read(files.image1[0].buffer);
        const img2 = PNG.sync.read(files.image2[0].buffer);

        // Check dimensions
        if (img1.width !== img2.width || img1.height !== img2.height) {
            return res.status(400).json({
                error: 'Images must have the same dimensions',
                dimensions: {
                    image1: `${img1.width}x${img1.height}`,
                    image2: `${img2.width}x${img2.height}`
                }
            });
        }

        // Create diff PNG
        const { width, height } = img1;
        const diff = new PNG({ width, height });

        // Compare images
        const numDiffPixels = pixelmatch(
            img1.data,
            img2.data,
            diff.data,
            width,
            height,
            { threshold: 0.1 }
        );

        // Convert diff to base64
        const diffBuffer = PNG.sync.write(diff);
        const diffBase64 = `data:image/png;base64,${diffBuffer.toString('base64')}`;

        // Send response
        res.status(200).json({
            diffImage: diffBase64,
            difference: numDiffPixels,
            totalPixels: width * height,
            percentDiff: ((numDiffPixels / (width * height)) * 100).toFixed(2)
        });
    } catch (error) {
        console.error('Comparison error:', error);
        res.status(500).json({
            error: 'Error processing images',
            details: error.message
        });
    }
}