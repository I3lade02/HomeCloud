const cleanPath = (path) => path.split('/').filter(Boolean).join('/');

function getIcon(name, type) {
  if (type === 'folder') return '📁';
  if (name.match(/\.(mp3)$/i)) return '🎵';
  if (name.match(/\.(mp4|mkv)$/i)) return '🎥';
  if (name.match(/\.(jpg|jpeg|png|gif)$/i)) return '🖼️';
  if (name.match(/\.(pdf|docx?|xlsx?|txt)$/i)) return '📄';
  if (name.match(/\.(apk|aab)$/i)) return '🤖';
  return '📦';
}

function formatSize(bytes) {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

let currentSubpaths = { personal: '', shared: '' };

async function createFolder(folder) {
  const inputId = folder === 'personal' ? 'new-folder-personal' : 'new-folder-shared';
  const folderName = document.getElementById(inputId).value.trim();
  if (!folderName) return false;

  await fetch(`/new_folder/${folder}/${currentSubpaths[folder]}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ folder_name: folderName })
  });

  loadFiles(folder, `${folder}-list`, currentSubpaths[folder]);
  document.getElementById(inputId).value = '';
  return false;
}

async function uploadFile(folder) {
  const inputId = folder === 'personal' ? 'upload-input-personal' : 'upload-input-shared';
  const fileInput = document.getElementById(inputId);
  const file = fileInput.files[0];
  if (!file) return false;

  const formData = new FormData();
  formData.append('file', file);

  const subpath = currentSubpaths[folder];
  await fetch(`/upload/${folder}/${subpath}`, {
    method: 'POST',
    body: formData
  });

  loadFiles(folder, `${folder}-list`, subpath);
  fileInput.value = '';
  return false;
}

function filterFiles(folder) {
  const input = document.getElementById(`filter-${folder}`);
  const query = input.value.trim().toLowerCase();
  const cards = document.querySelectorAll(`#${folder}-list .file-card`);

  cards.forEach(card => {
    const link = card.querySelector('a');
    if (!link) return;

    const filename = link.textContent.toLowerCase();
    card.style.display = filename.includes(query) ? '' : 'none';
  });
}


async function loadFiles(folder, elementId, subpath = '') {
  currentSubpaths[folder] = subpath;
  const res = await fetch(`/files/${folder}/${subpath}`);
  const data = await res.json();
  const container = document.getElementById(elementId);
  container.innerHTML = '';

  const breadcrumb = document.getElementById(`${folder}-breadcrumbs`);
  breadcrumb.innerHTML = '';

  const pathParts = subpath.split('/').filter(Boolean);
  let fullPath = '';

  const root = document.createElement('a');
  root.href = '#';
  root.textContent = folder === 'personal' ? '📁 personal' : '📁 shared';
  root.onclick = () => loadFiles(folder, `${folder}-list`, '');
  breadcrumb.appendChild(root);

  pathParts.forEach((part, i) => {
    breadcrumb.innerHTML += ' / ';
    fullPath += (i > 0 ? '/' : '') + part;
    const crumb = document.createElement('a');
    crumb.href = '#';
    crumb.textContent = part;
    crumb.onclick = () => loadFiles(folder, `${folder}-list`, fullPath);
    breadcrumb.appendChild(crumb);
  });

  const up = subpath.split('/').filter(Boolean);
  if (up.length > 0) {
    const parentPath = up.slice(0, -1).join('/');
    const upCard = document.createElement('div');
    upCard.className = 'file-card';
    upCard.innerHTML = '<span>🔙</span><a href="#">..</a>';
    upCard.onclick = () => loadFiles(folder, elementId, parentPath);
    container.appendChild(upCard);
  }

  data.files.forEach(file => {
    try {
      const card = document.createElement('div');
      card.className = 'file-card';

      const icon = document.createElement('span');
      icon.textContent = getIcon(file.name, file.type);
      card.appendChild(icon);

      const nameLink = document.createElement('a');
      nameLink.textContent = file.name;

      const fullRelativePath = cleanPath(`${data.subpath}/${file.name}`);

      if (file.type === 'folder') {
        nameLink.href = '#';
        nameLink.onclick = () => loadFiles(folder, elementId, fullRelativePath);
      } else {
        nameLink.href = `/download/${folder}/${fullRelativePath}`;
      }

      card.appendChild(nameLink);

      if (file.type === 'file') {
        const meta = document.createElement('div');
        meta.textContent = `${formatSize(file.size)}, ${file.mtime}`;
        meta.style.fontSize = '0.85em';
        card.appendChild(meta);

        if (file.name.endsWith('.mp3') || file.name.endsWith('.mp4')) {
          const previewBtn = document.createElement('button');
          previewBtn.textContent = '▶️ Preview';
          previewBtn.onclick = () => {
            const player = document.getElementById('media-player');
            const media = file.name.endsWith('.mp3')
              ? `<audio controls src="/preview/${folder}/${fullRelativePath}" style="width:100%;"></audio>`
              : `<video controls src="/preview/${folder}/${fullRelativePath}" style="width:100%;" height="300"></video>`;
            player.innerHTML = media;
            player.scrollIntoView({ behavior: 'smooth' });
          };
          card.appendChild(previewBtn);
        }

        const delForm = document.createElement('form');
        delForm.method = 'post';
        delForm.action = `/delete/${folder}/${fullRelativePath}`;
        delForm.onsubmit = () => confirm(`Delete "${file.name}"?`);
        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑️ Delete';
        delForm.appendChild(delBtn);
        card.appendChild(delForm);
      }

      if (file.type === 'folder') {
        const delForm = document.createElement('form');
        delForm.method = 'post';
        delForm.action = `/delete_folder/${folder}/${fullRelativePath}`;
        delForm.onsubmit = () => confirm(`Delete folder "${file.name}"?\n(Note: must be empty)`);
        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑️ Delete Folder';
        delForm.appendChild(delBtn);
        card.appendChild(delForm);
      }

      container.appendChild(card);
    } catch (e) {
      console.error("Failed to render file:", file, e);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadFiles('personal', 'personal-list');
  loadFiles('shared', 'shared-list');
});