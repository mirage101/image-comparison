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
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight request
    if (req.method === 'OPTIONS') {
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

        // Validate files
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
        console.error('Server error:', error);
        res.status(500).json({
            error: 'Error processing images',
            details: error.message
        });
    }
};