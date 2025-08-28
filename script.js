document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const imagesContainer = document.getElementById('imagesContainer');
    const compressBtn = document.getElementById('compressBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const maxWidthInput = document.getElementById('maxWidth');
    const maxHeightInput = document.getElementById('maxHeight');
    const formatSelect = document.getElementById('format');
    
    // Image storage
    const images = [];
    
    // Update quality value display
    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = `${qualitySlider.value}%`;
    });
    
    // Setup drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
        dropArea.classList.remove('highlight');
    }
    
    // Handle file selection
    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFiles, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files } });
    }
    
    function handleFiles(e) {
        const fileList = e.target.files;
        if (fileList.length > 0) {
            Array.from(fileList).forEach(file => {
                if (file.type.match('image.*')) {
                    addImageToList(file);
                }
            });
            compressBtn.disabled = false;
        }
    }
    
    // Add image to the list
    function addImageToList(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const template = document.getElementById('imageTemplate');
            const clone = document.importNode(template.content, true);
            
            const img = clone.querySelector('img');
            img.src = e.target.result;
            
            const filename = clone.querySelector('.filename');
            filename.textContent = file.name;
            
            const originalSize = clone.querySelector('.original-size');
            originalSize.textContent = `Original: ${formatBytes(file.size)}`;
            
            const compressedSize = clone.querySelector('.compressed-size');
            compressedSize.textContent = 'Compressed: -';
            
            const savings = clone.querySelector('.savings');
            savings.textContent = 'Saved: -';
            
            const compressBtn = clone.querySelector('.compress-btn');
            const downloadBtn = clone.querySelector('.download-btn');
            const removeBtn = clone.querySelector('.remove-btn');
            
            const imageItem = clone.querySelector('.image-item');
            const imageIndex = images.length;
            
            imageItem.dataset.index = imageIndex;
            
            compressBtn.addEventListener('click', () => compressImage(imageIndex));
            downloadBtn.addEventListener('click', () => downloadImage(imageIndex));
            removeBtn.addEventListener('click', () => removeImage(imageItem, imageIndex));
            
            imagesContainer.appendChild(clone);
            
            // Store image data
            images.push({
                file,
                element: imageItem,
                originalUrl: e.target.result,
                compressedUrl: null,
                compressedSize: 0
            });
        };
        
        reader.readAsDataURL(file);
    }
    
    // Compress single image
    function compressImage(index) {
        const imageData = images[index];
        if (!imageData) return;
        
        const quality = parseInt(qualitySlider.value) / 100;
        const maxWidth = parseInt(maxWidthInput.value);
        const maxHeight = parseInt(maxHeightInput.value);
        const format = formatSelect.value;
        
        const img = new Image();
        img.onload = function() {
            // Calculate new dimensions
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
            
            // Create canvas and compress
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Get compressed image
            let mimeType;
            switch(format) {
                case 'png':
                    mimeType = 'image/png';
                    break;
                case 'webp':
                    mimeType = 'image/webp';
                    break;
                default:
                    mimeType = 'image/jpeg';
            }
            
            const compressedUrl = canvas.toDataURL(mimeType, quality);
            
            // Update image data
            imageData.compressedUrl = compressedUrl;
            
            // Calculate compressed size
            const base64 = compressedUrl.split(',')[1];
            const compressedSize = Math.ceil((base64.length * 3) / 4);
            imageData.compressedSize = compressedSize;
            
            // Update UI
            const element = imageData.element;
            const compressedSizeEl = element.querySelector('.compressed-size');
            compressedSizeEl.textContent = `Compressed: ${formatBytes(compressedSize)}`;
            
            const savingsEl = element.querySelector('.savings');
            const savingsPercent = Math.round((1 - (compressedSize / imageData.file.size)) * 100);
            savingsEl.textContent = `Saved: ${savingsPercent}%`;
            
            // Update image preview
            element.querySelector('img').src = compressedUrl;
            
            // Enable download button
            element.querySelector('.download-btn').disabled = false;
            
            // Check if all images are compressed
            checkAllCompressed();
        };
        
        img.src = imageData.originalUrl;
    }
    
    // Compress all images
    compressBtn.addEventListener('click', () => {
        images.forEach((_, index) => compressImage(index));
    });
    
    // Download single image
    function downloadImage(index) {
        const imageData = images[index];
        if (!imageData || !imageData.compressedUrl) return;
        
        const link = document.createElement('a');
        link.href = imageData.compressedUrl;
        
        // Create filename with format
        const originalName = imageData.file.name;
        const format = formatSelect.value;
        const dotIndex = originalName.lastIndexOf('.');
        
        let newFilename;
        if (dotIndex !== -1) {
            newFilename = originalName.substring(0, dotIndex) + '-compressed.' + format;
        } else {
            newFilename = originalName + '-compressed.' + format;
        }
        
        link.download = newFilename;
        link.click();
    }
    
    // Download all compressed images
    downloadAllBtn.addEventListener('click', () => {
        images.forEach((imageData, index) => {
            if (imageData.compressedUrl) {
                downloadImage(index);
            }
        });
    });
    
    // Remove image from list
    function removeImage(element, index) {
        element.remove();
        images[index] = null;
        
        // Check if all images are removed
        const hasImages = images.some(img => img !== null);
        compressBtn.disabled = !hasImages;
        
        checkAllCompressed();
    }
    
    // Check if all images are compressed
    function checkAllCompressed() {
        const allCompressed = images.every(img => img === null || img.compressedUrl);
        downloadAllBtn.disabled = !allCompressed || images.every(img => img === null);
    }
    
    // Format bytes to human-readable size
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});