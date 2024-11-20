document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('uploadForm');
    const image1Input = document.getElementById('image1');
    const image2Input = document.getElementById('image2');
    const resultsDiv = document.getElementById('results');

    // Validate file type and size
    function validateFile(file) {
        // Check if file exists
        if (!file) {
            return { valid: false, error: 'No file selected' };
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            return { valid: false, error: 'File must be an image' };
        }

        // Check file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return { valid: false, error: 'File size must be less than 5MB' };
        }

        return { valid: true };
    }

    // Preview image handlers
    function handleImagePreview(input, previewId) {
        const preview = document.getElementById(previewId);
        preview.innerHTML = '';

        if (input.files && input.files[0]) {
            // Validate file
            const validation = validateFile(input.files[0]);
            if (!validation.valid) {
                showError(validation.error);
                input.value = ''; // Clear the input
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
            }
            reader.readAsDataURL(input.files[0]);
        }
    }

    // Show error message
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show mt-3';
        errorDiv.role = 'alert';
        errorDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        form.insertAdjacentElement('afterend', errorDiv);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    image1Input.addEventListener('change', () => handleImagePreview(image1Input, 'image1Preview'));
    image2Input.addEventListener('change', () => handleImagePreview(image2Input, 'image2Preview'));

    // Form submission handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate both files
        const file1 = image1Input.files[0];
        const file2 = image2Input.files[0];

        if (!file1 || !file2) {
            showError('Please select both images before comparing.');
            return;
        }

        const validation1 = validateFile(file1);
        const validation2 = validateFile(file2);

        if (!validation1.valid) {
            showError('First image: ' + validation1.error);
            return;
        }

        if (!validation2.valid) {
            showError('Second image: ' + validation2.error);
            return;
        }

        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = 'Comparing images...';

        const formData = new FormData();
        formData.append('image1', file1);
        formData.append('image2', file2);

        try {
            const response = await fetch('/api/compare', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error comparing images');
            }

            // Display results
            document.getElementById('diffPercentage').textContent = data.percentDiff;
            
            // Show original images and diff
            document.getElementById('finalImage1').innerHTML = `<img src="${URL.createObjectURL(file1)}" alt="Image 1">`;
            document.getElementById('finalImage2').innerHTML = `<img src="${URL.createObjectURL(file2)}" alt="Image 2">`;
            // The diff image is now base64
            document.getElementById('diffImage').innerHTML = `<img src="${data.diffImage}" alt="Difference">`;
            
            resultsDiv.style.display = 'flex';
        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'Error comparing images. Please try again.');
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
});
