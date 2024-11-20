const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

const app = express();
const port = 3000;

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Ensure we only accept image files
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed!'), false);
            return;
        }
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed!'), false);
            return;
        }
        cb(null, true);
    }
});

// Serve static files from public directory
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(400).json({ error: err.message || 'An error occurred' });
});

// Routes
app.post('/compare', (req, res, next) => {
    upload.fields([
        { name: 'image1', maxCount: 1 },
        { name: 'image2', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        console.log('Processing comparison request...');
        const files = req.files;
        
        if (!files || !files.image1 || !files.image2) {
            console.error('Missing files:', files);
            return res.status(400).json({ error: 'Please upload both images' });
        }

        console.log('Reading image files...');
        console.log('Image 1 path:', files.image1[0].path);
        console.log('Image 2 path:', files.image2[0].path);

        // Read images and create PNG instances
        const img1Data = fs.readFileSync(files.image1[0].path);
        const img2Data = fs.readFileSync(files.image2[0].path);
        
        console.log('Parsing PNG data...');
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
            console.log('Dimension mismatch:', {
                img1: `${img1.width}x${img1.height}`,
                img2: `${img2.width}x${img2.height}`
            });
            return res.status(400).json({ 
                error: 'Images must have the same dimensions',
                dimensions: {
                    image1: `${img1.width}x${img1.height}`,
                    image2: `${img2.width}x${img2.height}`
                }
            });
        }

        console.log('Creating diff...');
        const {width, height} = img1;
        const diff = new PNG({width, height});

        const numDiffPixels = pixelmatch(
            img1.data, 
            img2.data, 
            diff.data, 
            width, 
            height, 
            {threshold: 0.1}
        );

        console.log('Writing diff file...');
        const diffFilename = 'diff-' + Date.now() + '.png';
        const diffPath = path.join('uploads', diffFilename);
        
        // Write the diff file using a stream
        const writeStream = fs.createWriteStream(diffPath);
        const diffBuffer = PNG.sync.write(diff);
        writeStream.write(diffBuffer);
        writeStream.end();

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        console.log('Sending response...');
        res.json({
            diffImage: '/' + diffPath,
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
