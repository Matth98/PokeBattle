// Redimensionne une image (File) en data URL JPEG carrée centrée.
// Garde la taille de payload raisonnable pour MongoDB (~30-50 KB max).
export const resizeImageToDataUrl = (file, maxSize = 256, quality = 0.85) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Aucun fichier'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('Pas une image'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Centre-crop carré sur l'image source
        const sourceSize = Math.min(img.width, img.height);
        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Image illisible'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.readAsDataURL(file);
  });
