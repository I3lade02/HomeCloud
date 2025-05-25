function getIcon(file) {
  if (file.match(/\.(mp3)$/i)) return '🎵';
  if (file.match(/\.(mp4|mkv)$/i)) return '🎥';
  if (file.match(/\.(jpg|jpeg|png|gif)$/i)) return '🖼️';
  if (file.match(/\.(pdf|docx?|xlsx?|txt)$/i)) return '📄';
  if (file.match(/\.(apk|aab)$/i)) return '🤖';
  return '📦';
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function loadFiles(folder, elementId) {
  const res = await fetch(`/files/${folder}`);
  const data = await res.json();
  const container = document.getElementById(elementId);
  container.innerHTML = '';

  data.files.forEach(file => {
    const card = document.createElement('div');
    card.className = 'file-card';

    const icon = document.createElement('span');
    icon.textContent = getIcon(file.name);
    card.appendChild(icon);

    const link = document.createElement('a');
    link.href = `/download/${folder}/${file.name}`;
    link.textContent = file.name;
    card.appendChild(link);

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
          ? `<audio controls src="/preview/${folder}/${file.name}" style="width:100%;"></audio>`
          : `<video controls src="/preview/${folder}/${file.name}" style="width:100%;" height="300"></video>`;
        player.innerHTML = media;
        player.scrollIntoView({ behavior: 'smooth' });
      };
      card.appendChild(previewBtn);
    }

    const delForm = document.createElement('form');
    delForm.method = 'post';
    delForm.action = `/delete/${folder}/${file.name}`;
    delForm.onsubmit = () => confirm(`Delete "${file.name}"?`);
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️ Delete';
    delForm.appendChild(delBtn);
    card.appendChild(delForm);

    container.appendChild(card);
  });
}

loadFiles('personal', 'personal-list');
loadFiles('shared', 'shared-list');

