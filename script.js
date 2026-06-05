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
fileInput.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(addPhoto);
    fileInput.value = '';
});

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
        const zipFile = new File([zipBlob], "fotos_reporte.zip", { type: "application/zip" });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(zipFile);
        zipInput.files = dataTransfer.files;

   
        form.submit();

    } catch (error) {
        console.error(error);
        alert("Error al comprimir las fotos.");
        submitBtn.disabled = false;
        loadingOverlay.classList.add('hidden');
    }
});
