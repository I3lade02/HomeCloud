const cleanPath = (path) => path.split('/').filter(Boolean).join('/');

function getIcon(file, type) {
  if (type === 'folder') return '📁';
  if (file.match(/\.(mp3)$/i)) return '🎵';
  if (file.match(/\.(mp4|mkv)$/i)) return '🎥';
  if (file.match(/\.(jpg|jpeg|png|gif)$/i)) return '🖼️';
  if (file.match(/\.(pdf|docx?|xlsx?|txt)$/i)) return '📄';
  if (file.match(/\.(apk|aab)$/i)) return '🤖';
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

async function loadFiles(folder, elementId, subpath = '') {
  currentSubpaths[folder] = subpath;
  const res = await fetch(`/files/${folder}/${subpath}`);
  const data = await res.json();
  const container = document.getElementById(elementId);
  container.innerHTML = '';

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
    const card = document.createElement('div');
    card.className = 'file-card';

    const icon = document.createElement('span');
    icon.textContent = getIcon(file.name, file.type);
    card.appendChild(icon);

    const nameLink = document.createElement('a');
    nameLink.textContent = file.name;

    if (file.type === 'folder') {
      nameLink.href = '#';
      nameLink.onclick = () => loadFiles(folder, elementId, `${data.subpath}/${file.name}`.replace(/^\/\//, ''));
    } else {
      nameLink.href = `/download/${folder}/${data.subpath}/${file.name}`.replace(/\/+/g, '/');
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
            ? `<audio controls src="/preview/${folder}/${data.subpath}/${file.name}" style="width:100%;"></audio>`
            : `<video controls src="/preview/${folder}/${data.subpath}/${file.name}" style="width:100%;" height="300"></video>`;
          player.innerHTML = media;
          player.scrollIntoView({ behavior: 'smooth' });
        };
        card.appendChild(previewBtn);
      }

      const delForm = document.createElement('form');
      delForm.method = 'post';
      delForm.action = `/delete/${folder}/${data.subpath}/${file.name}`;
      delForm.onsubmit = () => confirm(`Delete "${file.name}"?`);
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️ Delete';
      delForm.appendChild(delBtn);
      card.appendChild(delForm);
    }

    if (file.type === 'folder') {
      const delForm = document.createElement('form');
      delForm.method = 'post';
      delForm.action = `/delete_folder/${folder}/${cleanPath(`${data.subpath}/${file.name}`)}`;
      delForm.onsubmit = () => confirm(`Delete folder "${file.name}"?\n(Note: must be empty)`);
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️ Delete Folder';
      delForm.appendChild(delBtn);
      card.appendChild(delForm);
    }

    container.appendChild(card);
  });
}

loadFiles('personal', 'personal-list');
loadFiles('shared', 'shared-list');