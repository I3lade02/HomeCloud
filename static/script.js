async function loadFiles(folder, elementId) {
  const res = await fetch(`/files/${folder}`);
  const data = await res.json();
  const list = document.getElementById(elementId);
  list.innerHTML = '';

  data.files.forEach(file => {
    const li = document.createElement('li');

    // Download link
    const link = document.createElement('a');
    link.href = `/download/${folder}/${file}`;
    link.textContent = file;
    link.style.marginRight = '10px';
    li.appendChild(link);

    // Media preview button
    if (file.endsWith('.mp3') || file.endsWith('.mp4')) {
      const preview = document.createElement('button');
      preview.textContent = '▶️ Preview';
      preview.onclick = () => {
        const player = document.getElementById('media-player');
        const media = file.endsWith('.mp3')
          ? `<audio controls src="/preview/${folder}/${file}" style="width:100%;"></audio>`
          : `<video controls src="/preview/${folder}/${file}" style="width:100%;" height="300"></video>`;
        player.innerHTML = media;
        player.scrollIntoView({ behavior: 'smooth' });
      };
      li.appendChild(preview);
    }

    // Delete button
    const form = document.createElement('form');
    form.method = 'post';
    form.action = `/delete/${folder}/${file}`;
    form.style.display = 'inline';
    form.onsubmit = () => confirm(`Delete "${file}"?`);
    const btn = document.createElement('button');
    btn.textContent = '🗑️';
    btn.style.marginLeft = '10px';
    form.appendChild(btn);
    li.appendChild(form);

    list.appendChild(li);
  });
}

// Load both folders on page load
loadFiles('personal', 'personal-list');
loadFiles('shared', 'shared-list');
