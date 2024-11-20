document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('uploadForm');
    const image1Preview = document.getElementById('image1Preview');
    const image2Preview = document.getElementById('image2Preview');
    const diffImage = document.getElementById('diffImage');
    const resultText = document.getElementById('resultText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');

    // Preview image before upload
    function previewImage(file, imgElement) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imgElement.src = e.target.result;
            imgElement.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    // Handle image selection
    document.getElementById('image1').addEventListener('change', function(e) {
        if (e.target.files[0]) previewImage(e.target.files[0], image1Preview);
    });

    document.getElementById('image2').addEventListener('change', function(e) {
        if (e.target.files[0]) previewImage(e.target.files[0], image2Preview);
    });

    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Reset UI
        errorMessage.style.display = 'none';
        loadingSpinner.style.display = 'block';
        diffImage.style.display = 'none';
        resultText.textContent = '';

        const formData = new FormData(form);

        try {
            const response = await fetch('/api/compare', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error comparing images');
            }

            // Display results
            diffImage.src = result.diffImage;
            diffImage.style.display = 'block';
            resultText.textContent = `Difference: ${result.percentDiff}% (${result.difference} pixels out of ${result.totalPixels})`;
        } catch (error) {
            console.error('Error:', error);
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        } finally {
            loadingSpinner.style.display = 'none';
        }
    });
});
