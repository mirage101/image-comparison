# Image Comparison Tool

A web application that compares two images pixel by pixel using the pixelmatch library and shows the differences between them.

## Features

- Upload two images for comparison
- Real-time image preview
- Pixel-by-pixel comparison
- Visual difference highlighting
- Percentage difference calculation
- Responsive design

## Prerequisites

- Node.js (v12 or higher)
- npm (Node Package Manager)

## Installation

1. Clone this repository or download the files
2. Navigate to the project directory
3. Install dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to `http://localhost:3000`
3. Upload two images you want to compare
4. Click the "Compare Images" button
5. View the comparison results, including:
   - Original images side by side
   - Difference visualization
   - Percentage of different pixels

## Technical Details

- Backend: Node.js with Express
- Frontend: HTML5, CSS3, JavaScript
- Image Comparison: pixelmatch
- Image Processing: pngjs
- File Upload: multer
- Styling: Bootstrap 5

## Notes

- The application works best with PNG images
- Images should have the same dimensions for accurate comparison
- The difference threshold can be adjusted in the server code if needed
