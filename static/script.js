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
  const list = document.getElementById(elementId);
  list.innerHTML = '';

  data.files.forEach(file => {
    const li = document.createElement('li');

    const icon = document.createElement('span');
    icon.textContent = getIcon(file.name) + ' ';
    li.appendChild(icon);

    const link = document.createElement('a');
    link.href = `/download/${folder}/${file.name}`;
    link.textContent = file.name;
    link.style.marginRight = '10px';
    li.appendChild(link);

    const meta = document.createElement('span');
    meta.textContent = `(${formatSize(file.size)}, ${file.mtime})`;
    meta.style.fontSize = '0.9em';
    meta.style.marginLeft = '10px';
    li.appendChild(meta);

    if (file.name.endsWith('.mp3') || file.name.endsWith('.mp4')) {
      const preview = document.createElement('button');
      preview.textContent = '▶️';
      preview.onclick = () => {
        const player = document.getElementById('media-player');
        const media = file.name.endsWith('.mp3')
          ? `<audio controls src="/preview/${folder}/${file.name}" style="width:100%;"></audio>`
          : `<video controls src="/preview/${folder}/${file.name}" style="width:100%;" height="300"></video>`;
        player.innerHTML = media;
        player.scrollIntoView({ behavior: 'smooth' });
      };
      li.appendChild(preview);
    }

    const form = document.createElement('form');
    form.method = 'post';
    form.action = `/delete/${folder}/${file.name}`;
    form.style.display = 'inline';
    form.onsubmit = () => confirm(`Delete "${file.name}"?`);
    const btn = document.createElement('button');
    btn.textContent = '🗑️';
    btn.style.marginLeft = '10px';
    form.appendChild(btn);
    li.appendChild(form);

    list.appendChild(li);
  });
}

loadFiles('personal', 'personal-list');
loadFiles('shared', 'shared-list');

