const multer = require('multer');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 }
]);

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

// Export the API handler function
module.exports = async (req, res) => {
    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader(
            'Access-Control-Allow-Headers',
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
        );
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Process the file upload
        await runMiddleware(req, res, upload);

        if (!req.files || !req.files.image1 || !req.files.image2) {
            return res.status(400).json({ error: 'Please upload both images' });
        }

        // Read images from buffer
        const img1Data = req.files.image1[0].buffer;
        const img2Data = req.files.image2[0].buffer;

        let img1, img2;
        try {
            img1 = PNG.sync.read(img1Data);
            img2 = PNG.sync.read(img2Data);
        } catch (error) {
            console.error('PNG parsing error:', error);
            return res.status(400).json({
                error: 'Error parsing images. Please ensure both files are valid PNG images.',
                details: error.message
            });
        }

        // Check if images have the same dimensions
        if (img1.width !== img2.width || img1.height !== img2.height) {
            return res.status(400).json({
                error: 'Images must have the same dimensions',
                dimensions1: `${img1.width}x${img1.height}`,
                dimensions2: `${img2.width}x${img2.height}`
            });
        }

        // Create output image
        const diff = new PNG({ width: img1.width, height: img1.height });
        
        // Compare images
        const numDiffPixels = pixelmatch(
            img1.data,
            img2.data,
            diff.data,
            img1.width,
            img1.height,
            { threshold: 0.1 }
        );

        // Calculate percentage difference
        const totalPixels = img1.width * img1.height;
        const percentDiff = ((numDiffPixels / totalPixels) * 100).toFixed(2);

        // Convert diff image to base64
        const diffBuffer = PNG.sync.write(diff);
        const diffBase64 = `data:image/png;base64,${diffBuffer.toString('base64')}`;

        // Send response
        res.status(200).json({
            difference: numDiffPixels,
            totalPixels: totalPixels,
            percentDiff: percentDiff,
            diffImage: diffBase64
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};