const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

const app = express();
const port = 3000;

// Configure multer for memory storage in local development
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 }
]);

// Serve static files from public directory
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// API endpoint for image comparison
app.post('/api/compare', async (req, res) => {
    try {
        upload(req, res, async function(err) {
            if (err) {
                console.error('Upload error:', err);
                return res.status(400).json({ error: err.message });
            }

            if (!req.files || !req.files.image1 || !req.files.image2) {
                return res.status(400).json({ error: 'Please upload both images' });
            }

            try {
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
                res.json({
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
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
