const form = document.getElementById('report-form');
const openCameraBtn = document.getElementById('open-camera');
const browseFilesBtn = document.getElementById('browse-files');
const fileInput = document.getElementById('file-upload');
const photoPreview = document.getElementById('photo-preview');
const countSpan = document.getElementById('count');
const zipInput = document.getElementById('zip-input');

const cameraModal = document.getElementById('camera-modal');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture-photo');
const closeCameraBtn = document.getElementById('close-camera');

let capturedFiles = []; 


openCameraBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        cameraModal.classList.remove('hidden');
    } catch (err) { alert("Acceso denegado a la cámara."); }
});

closeCameraBtn.addEventListener('click', () => {
    if(video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
    cameraModal.classList.add('hidden');
});

captureBtn.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
        addPhoto(new File([blob], `camara_${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, 'image/jpeg', 0.6);
});


browseFilesBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.remove('hidden');
    document.querySelector('#loading-overlay p').innerText = "Procesando imágenes...";

    for (const file of files) {
        if (file.type.startsWith('image/')) {
            const compressed = await compressImage(file);
            addPhoto(compressed);
        } else {
            addPhoto(file);
        }
    }
    
    fileInput.value = '';
    loadingOverlay.classList.add('hidden');
    document.querySelector('#loading-overlay p').innerText = "Comprimiendo fotos... por favor espere";
});

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1200;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: "image/jpeg" }));
                }, 'image/jpeg', 0.7);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function addPhoto(file) {
    capturedFiles.push(file);
    renderPreviews();
}

function removePhoto(index) {
    capturedFiles.splice(index, 1);
    renderPreviews();
}

function renderPreviews() {
    photoPreview.innerHTML = '';
    capturedFiles.forEach((file, i) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `<img src="${URL.createObjectURL(file)}"><button type="button" class="btn-remove" onclick="removePhoto(${i})">×</button>`;
        photoPreview.appendChild(div);
    });
    countSpan.innerText = capturedFiles.length;
}


form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (capturedFiles.length === 0) return alert("Captura al menos una foto.");

    const submitBtn = document.getElementById('submit-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    submitBtn.disabled = true;
    loadingOverlay.classList.remove('hidden');

    try {
        const zip = new JSZip();

        capturedFiles.forEach((file, i) => {
            zip.file(file.name, file);
        });


        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        
        if (zipBlob.size > 5 * 1024 * 1024) {
            alert("El archivo es demasiado grande (máximo 5MB). Por favor, tome menos fotos o elimine algunas de la galería.");
            submitBtn.disabled = false;
            loadingOverlay.classList.add('hidden');
            return;
        }

        const zipFile = new File([zipBlob], "fotos_reporte.zip", { type: "application/zip" });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(zipFile);
        zipInput.files = dataTransfer.files;

        form.submit();

    } catch (error) {
        console.error(error);
        alert("Error al enviar el reporte: " + error.message);
        submitBtn.disabled = false;
        loadingOverlay.classList.add('hidden');
    }
});
