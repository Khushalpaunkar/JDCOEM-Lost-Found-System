(() => {
  const form = document.querySelector('.report-form');
  if (!form) return;

  const submitButton = form.querySelector('.report-submit');
  const submitLabel = document.getElementById('report-submit-label');
  const validationMessage = document.getElementById('report-validation-message');
  const upload = document.getElementById('report-upload');
  const fileInput = document.getElementById('report-images');
  const uploadList = document.getElementById('upload-list');
  const uploadEmpty = document.getElementById('upload-empty');
  const uploadMessage = document.getElementById('upload-message');
  const uploadPrompt = upload.querySelector('.report-upload-prompt');
  const imageLightbox = document.getElementById('report-lightbox');
  const lightboxImage = document.getElementById('report-lightbox-image');
  const lightboxCaption = document.getElementById('report-lightbox-caption');
  const lightboxClose = document.getElementById('report-lightbox-close');
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const allowedExtensions = /\.(jpe?g|png|webp)$/i;
  const maxFiles = 5;
  const maxFileSize = 5 * 1024 * 1024;
  let selectedFiles = [];
  const previewUrls = new Map();
  const reportPage = document.querySelector('.report-page');

  function syncFileInput() {
    if (typeof DataTransfer !== 'function') return;

    const transfer = new DataTransfer();
    selectedFiles.forEach((file) => transfer.items.add(file));
    fileInput.files = transfer.files;
  }

  if (
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animationFrame = 0;
    let hasCursorPosition = false;

    function moveCursorGlow() {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      reportPage.style.setProperty('--report-cursor-x', `${currentX}px`);
      reportPage.style.setProperty('--report-cursor-y', `${currentY}px`);

      if (Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) {
        animationFrame = window.requestAnimationFrame(moveCursorGlow);
      } else {
        animationFrame = 0;
      }
    }

    reportPage.addEventListener('pointermove', (event) => {
      const bounds = reportPage.getBoundingClientRect();
      targetX = event.clientX - bounds.left;
      targetY = event.clientY - bounds.top;

      if (!hasCursorPosition) {
        currentX = targetX;
        currentY = targetY;
        hasCursorPosition = true;
      }

      reportPage.classList.add('has-cursor-glow');
      if (!animationFrame) animationFrame = window.requestAnimationFrame(moveCursorGlow);
    });

    reportPage.addEventListener('pointerleave', () => {
      reportPage.classList.remove('has-cursor-glow');
      hasCursorPosition = false;
    });
  }

  function updateReportType() {
    const status = form.querySelector('input[name="status"]:checked').value;
    submitLabel.textContent = status === 'found' ? 'Submit Found Report' : 'Submit Lost Report';
  }

  function showUploadMessage(message, isError) {
    uploadMessage.textContent = message;
    uploadMessage.classList.toggle('is-error', isError);
  }

  function openImagePreview(file) {
    const previewUrl = previewUrls.get(fileKey(file));
    if (!previewUrl) return;

    lightboxImage.src = previewUrl;
    lightboxImage.alt = `Full-size preview of ${file.name}`;
    lightboxCaption.textContent = file.name;
    imageLightbox.showModal();
  }

  function handleImageError(fileName, image) {
    console.error(`Image preview failed to load: ${fileName}`, {
      source: image.currentSrc || image.src
    });
    showUploadMessage(`Could not display ${fileName}. Please choose the image again.`, true);
  }

  function renderFiles() {
    const selectedKeys = new Set(selectedFiles.map(fileKey));
    for (const [key, previewUrl] of previewUrls) {
      if (!selectedKeys.has(key)) {
        URL.revokeObjectURL(previewUrl);
        previewUrls.delete(key);
      }
    }

    uploadList.replaceChildren();
    uploadEmpty.hidden = selectedFiles.length > 0;

    selectedFiles.forEach((file, index) => {
      const key = fileKey(file);
      if (!previewUrls.has(key)) previewUrls.set(key, URL.createObjectURL(file));

      const row = document.createElement('li');
      row.className = 'report-upload-item';

      const previewButton = document.createElement('button');
      previewButton.className = 'report-upload-preview-button';
      previewButton.type = 'button';
      previewButton.setAttribute('aria-label', `View full-size image: ${file.name}`);

      const image = document.createElement('img');
      image.className = 'report-upload-preview';
      image.alt = `Preview of ${file.name}`;
      image.src = previewUrls.get(key);
      image.addEventListener('error', () => handleImageError(file.name, image));
      previewButton.append(image);
      previewButton.addEventListener('click', () => openImagePreview(file));

      const details = document.createElement('span');
      details.className = 'report-upload-file-details';
      const filename = document.createElement('strong');
      filename.textContent = file.name;
      const filesize = document.createElement('small');
      filesize.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      details.append(filename, filesize);

      const remove = document.createElement('button');
      remove.className = 'report-upload-remove';
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
      remove.addEventListener('click', () => {
        selectedFiles.splice(index, 1);
        syncFileInput();
        renderFiles();
        showUploadMessage(
          selectedFiles.length
            ? `${selectedFiles.length} image${selectedFiles.length === 1 ? '' : 's'} selected. They will be uploaded with your report.`
            : 'No images selected.',
          false
        );
      });

      row.append(previewButton, details, remove);
      uploadList.append(row);
    });
  }

  function isSupportedImage(file) {
    const fileType = file.type.toLowerCase();
    const supportedMime = allowedTypes.has(fileType) || ['image/jpg', 'image/pjpeg'].includes(fileType);
    const genericMime = !fileType || fileType === 'application/octet-stream';
    return supportedMime || (genericMime && allowedExtensions.test(file.name));
  }

  function fileKey(file) {
    return [file.name, file.size, file.lastModified, file.type].join(':');
  }

  function revokeAllPreviewUrls() {
    previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    previewUrls.clear();
  }

  function addFiles(fileList) {
    const seenFiles = new Set(selectedFiles.map(fileKey));
    const incoming = Array.from(fileList).filter((file) => {
      const key = fileKey(file);
      if (seenFiles.has(key)) return false;
      seenFiles.add(key);
      return true;
    });

    if (!incoming.length) {
      if (fileList.length) showUploadMessage('Those images are already selected.', false);
      return;
    }

    const invalidType = incoming.find((file) => !isSupportedImage(file));
    const oversized = incoming.find((file) => file.size > maxFileSize);
    const nextFiles = [...selectedFiles, ...incoming];

    if (invalidType) {
      syncFileInput();
      showUploadMessage(`${invalidType.name} is not a supported image. Choose a JPG, JPEG, PNG, or WEBP file.`, true);
      return;
    }
    if (oversized) {
      syncFileInput();
      showUploadMessage(`${oversized.name} is larger than 5 MB. Choose a smaller image.`, true);
      return;
    }
    if (nextFiles.length > maxFiles) {
      syncFileInput();
      showUploadMessage('You can add up to 5 images. Remove an image before adding another.', true);
      return;
    }

    selectedFiles = nextFiles;
    syncFileInput();
    renderFiles();
    showUploadMessage(
      `${selectedFiles.length} image${selectedFiles.length === 1 ? '' : 's'} selected. They will be uploaded with your report.`,
      false
    );
  }

  form.querySelectorAll('input[name="status"]').forEach((radio) => {
    radio.addEventListener('change', updateReportType);
  });

  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
  });

  uploadPrompt.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  upload.addEventListener('dragover', (event) => {
    event.preventDefault();
    upload.classList.add('is-dragging');
  });
  upload.addEventListener('dragleave', (event) => {
    if (!upload.contains(event.relatedTarget)) upload.classList.remove('is-dragging');
  });
  upload.addEventListener('drop', (event) => {
    event.preventDefault();
    upload.classList.remove('is-dragging');
    addFiles(event.dataTransfer.files);
  });

  lightboxClose.addEventListener('click', () => imageLightbox.close());
  lightboxImage.addEventListener('error', () => {
    handleImageError(lightboxCaption.textContent || 'selected image', lightboxImage);
  });
  imageLightbox.addEventListener('click', (event) => {
    if (event.target === imageLightbox) imageLightbox.close();
  });
  imageLightbox.addEventListener('close', () => {
    lightboxImage.removeAttribute('src');
    lightboxImage.alt = '';
    lightboxCaption.textContent = '';
  });
  window.addEventListener('pagehide', revokeAllPreviewUrls, { once: true });

  form.addEventListener('submit', (event) => {
    if (!form.checkValidity()) {
      event.preventDefault();
      validationMessage.textContent = 'Please complete all required fields before submitting.';
      form.querySelector(':invalid')?.focus();
      return;
    }

    validationMessage.textContent = '';
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Submitting report...';
  });

  form.addEventListener('input', () => {
    if (form.checkValidity()) validationMessage.textContent = '';
  });

  updateReportType();
})();