// TekTune frontend JS

const API_BASE = '/api';

// Always define window.onSave as a no-op to avoid ReferenceError
window.onSave = () => {};

const state = {
  articles: [],
  selected: null,
  mode: 'view', // view | add | edit
  unsaved: false,
  // Add new state for article creation step
  creationStep: null, // null | 'title' | 'editor'
};

function $(id) {
  return document.getElementById(id);
}

function renderTopBar() {
  const right = $('action-buttons');
  right.innerHTML = '';
  if (state.mode === 'add' && state.creationStep === 'title') {
    // No buttons in topbar during title entry
    return;
  }
  if (state.mode === 'add' || state.mode === 'edit') {
    right.appendChild(actionButton('save', 'Save', window.onSave));
  } else {
    right.appendChild(actionButton('add', 'Add Article', onAdd));
    if (state.selected) {
      right.appendChild(actionButton('edit', 'Edit', onEdit));
      right.appendChild(actionButton('delete', 'Delete', onDelete));
    }
  }
}

function actionButton(icon, text, handler) {
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.onclick = handler;
  const img = document.createElement('img');
  img.src = `./icons/${icon}.svg`;
  img.alt = text;
  img.className = 'icon';
  btn.appendChild(img);
  const span = document.createElement('span');
  span.textContent = text;
  btn.appendChild(span);
  return btn;
}

async function fetchArticles() {
  const res = await fetch(`${API_BASE}/articles`);
  state.articles = await res.json();
  renderSidebar();
}

function renderSidebar() {
  const sidebar = $('article-index');
  sidebar.innerHTML = '';
  if (state.articles.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'empty-msg';
    msg.textContent = 'No articles found. Create your first article!';
    sidebar.appendChild(msg);
    renderContentArea('welcome');
    return;
  }
  state.articles.forEach(title => {
    const btn = document.createElement('button');
    btn.className = 'article-btn';
    btn.textContent = title;
    btn.onclick = () => selectArticle(title);
    if (state.selected === title) btn.classList.add('selected');
    sidebar.appendChild(btn);
  });
  if (!state.selected) {
    renderContentArea('choose');
  }
}

async function selectArticle(title) {
  state.selected = title;
  state.mode = 'view';
  renderTopBar();
  await renderContentArea('article');
  renderSidebar();
}

async function renderContentArea(mode) {
  const area = $('content-area');
  area.innerHTML = '';
  if (mode === 'welcome') {
    area.innerHTML = `<div class="welcome-msg">Welcome to TekTune! Start by creating your first article.</div>`;
    return;
  }
  if (mode === 'choose') {
    area.innerHTML = `<div class="choose-msg">Choose from an article on the list to begin.</div>`;
    return;
  }
  if (mode === 'article' && state.selected) {
    // Fetch and display article
    const filename = state.selected.replace(/ /g, '_') + '.txt';
    const res = await fetch(`${API_BASE}/articles/${filename}`);
    if (!res.ok) {
      area.innerHTML = `<div class="error-msg">Failed to load article.</div>`;
      return;
    }
    const data = await res.json();
    // Render Markdown to HTML
    const html = marked.parse(data.content);
    area.innerHTML = `<div class='article-title'>${data.title}</div><div class="article-body">${html}</div>`;
    // Add copy buttons to code blocks
    addCopyButtons(area.querySelector('.article-body'));
    // Highlight code blocks
    Prism.highlightAllUnder(area);
    return;
  }
}

function addCopyButtons(container) {
  if (!container) return;
  const blocks = container.querySelectorAll('pre > code');
  blocks.forEach(code => {
    const pre = code.parentElement;
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    const img = document.createElement('img');
    img.src = './icons/copy.svg';
    img.alt = 'Copy';
    img.className = 'icon';
    copyBtn.appendChild(img);
    const span = document.createElement('span');
    span.textContent = 'Copy';
    copyBtn.appendChild(span);
    copyBtn.onclick = () => {
      let textToCopy = code.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        // Remove line breaks for clipboard
        navigator.clipboard.writeText(textToCopy.replace(/\n/g, ' ')).then(() => {
          copyBtn.classList.add('copied');
          span.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            span.textContent = 'Copy';
          }, 1200);
        }).catch(() => {
          alert('Copy failed.');
        });
      } else {
        // Fallback for older browsers
        try {
          const range = document.createRange();
          range.selectNodeContents(code);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('copy');
          sel.removeAllRanges();
          copyBtn.classList.add('copied');
          span.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            span.textContent = 'Copy';
          }, 1200);
        } catch (e) {
          alert('Copy not supported in this browser.');
        }
      }
    };
    wrapper.appendChild(copyBtn);
    wrapper.style.position = 'relative';
    copyBtn.style.position = 'absolute';
    copyBtn.style.top = '8px';
    copyBtn.style.right = '8px';
  });
}

function onAdd() {
  state.mode = 'add';
  state.selected = null;
  state.creationStep = 'title';
  renderTopBar();
  renderTitleInput();
}

function renderTitleInput() {
  const area = $('content-area');
  area.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'title-input-wrapper';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'large-title-input';
  input.placeholder = 'Enter article title...';
  input.maxLength = 100;
  wrapper.appendChild(input);
  const btnRow = document.createElement('div');
  btnRow.className = 'title-btn-row';
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'title-save-btn';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'title-cancel-btn';
  btnRow.appendChild(saveBtn);
  btnRow.appendChild(cancelBtn);
  wrapper.appendChild(btnRow);
  area.appendChild(wrapper);
  input.focus();
  saveBtn.onclick = async () => {
    const title = input.value.trim();
    if (!title || !/^[A-Za-z0-9 ]+$/.test(title)) {
      alert('Title is required, can only contain letters, numbers, and spaces, and must be at most 100 characters.');
      return;
    }
    // Create article with empty content
    const res = await fetch(`${API_BASE}/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: '' })
    });
    if (res.ok) {
      state.selected = title;
      state.mode = 'edit'; // Switch to edit mode so subsequent saves use PUT
      state.creationStep = 'editor';
      renderTopBar();
      renderEditor({ title, content: '' });
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to create article');
    }
  };
  cancelBtn.onclick = () => {
    state.mode = 'view';
    state.selected = null;
    state.creationStep = null;
    renderTopBar();
    renderSidebar();
  };
}

function onEdit() {
  state.mode = 'edit';
  renderTopBar();
  fetchCurrentArticleForEdit();
}

async function fetchCurrentArticleForEdit() {
  const filename = state.selected.replace(/ /g, '_') + '.txt';
  const res = await fetch(`${API_BASE}/articles/${filename}`);
  if (!res.ok) {
    renderContentArea('error');
    return;
  }
  const data = await res.json();
  renderEditor(data);
}

function renderEditor({ title, content }) {
  state.creationStep = 'editor';
  console.log('renderEditor called', { title, content });
  const area = $('content-area');
  area.innerHTML = '';
  // Title field
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'editor-title';
  titleInput.value = title;
  titleInput.placeholder = 'Article Title';
  titleInput.maxLength = 100;
  area.appendChild(titleInput);
  console.log('Title input appended');

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  toolbar.innerHTML = `
    <div class="toolbar-grid">
      <button type="button" data-cmd="h1" aria-label="Heading 1">
        <span class="toolbar-icon">H1</span>
        <span class="toolbar-label">heading 1</span>
      </button>
      <button type="button" data-cmd="h2" aria-label="Heading 2">
        <span class="toolbar-icon">H2</span>
        <span class="toolbar-label">heading 2</span>
      </button>
      <button type="button" data-cmd="h3" aria-label="Heading 3">
        <span class="toolbar-icon">H3</span>
        <span class="toolbar-label">heading 3</span>
      </button>
      <button type="button" data-cmd="bold" aria-label="Bold">
        <span class="toolbar-icon"><b>B</b></span>
        <span class="toolbar-label">bold</span>
      </button>
      <button type="button" data-cmd="italic" aria-label="Italic">
        <span class="toolbar-icon"><i>I</i></span>
        <span class="toolbar-label">italic</span>
      </button>
      <button type="button" data-cmd="underline" aria-label="Underline">
        <span class="toolbar-icon"><u>U</u></span>
        <span class="toolbar-label">underline</span>
      </button>
      <button type="button" data-cmd="code" aria-label="Code block">
        <span class="toolbar-icon">&lt;/&gt;</span>
        <span class="toolbar-label">code</span>
      </button>
      <button type="button" data-cmd="warning" aria-label="Warning box">
        <span class="toolbar-icon">&#9888;</span>
        <span class="toolbar-label">warning</span>
      </button>
      <button type="button" data-cmd="link" aria-label="Link">
        <span class="toolbar-icon">🔗</span>
        <span class="toolbar-label">link</span>
      </button>
      <button type="button" data-cmd="ol" aria-label="Numbered list">
        <span class="toolbar-icon">1.</span>
        <span class="toolbar-label">numbered</span>
      </button>
      <button type="button" data-cmd="ul" aria-label="Bullet list">
        <span class="toolbar-icon">•</span>
        <span class="toolbar-label">bullets</span>
      </button>
      <button type="button" data-cmd="image" aria-label="Image">
        <span class="toolbar-icon">🖼️</span>
        <span class="toolbar-label">image</span>
      </button>
      <button type="button" data-cmd="quote" aria-label="Quote">
        <span class="toolbar-icon">❝</span>
        <span class="toolbar-label">quote</span>
      </button>
      <button type="button" data-cmd="hr" aria-label="Horizontal rule">
        <span class="toolbar-icon">―</span>
        <span class="toolbar-label">divider</span>
      </button>
    </div>
  `;
  area.appendChild(toolbar);
  console.log('Toolbar appended');

  // Editor area
  const editor = document.createElement('div');
  editor.className = 'editor-area';
  editor.contentEditable = true;
  editor.spellcheck = true;
  editor.innerHTML = content ? marked.parse(content) : '';
  area.appendChild(editor);
  console.log('Editor area appended');

  // Image upload input (hidden)
  const imgInput = document.createElement('input');
  imgInput.type = 'file';
  imgInput.accept = 'image/*';
  imgInput.style.display = 'none';
  area.appendChild(imgInput);
  console.log('Image input appended');

  // Toolbar actions
  toolbar.addEventListener('click', (e) => {
    if (e.target.closest('button')) {
      const cmd = e.target.closest('button').dataset.cmd;
      handleToolbar(cmd, editor, imgInput);
    }
  });

  // Replace image upload logic:
  // imgInput.addEventListener('change', ...)
  imgInput.addEventListener('change', async (e) => {
    const file = imgInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/images/${title}`, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      insertAtCursor(editor, `![](${data.url})`);
    } else {
      alert('Image upload failed');
    }
    imgInput.value = '';
  });

  // Save handler
  window.onSave = async function () {
    const newTitle = titleInput.value.trim();
    const md = toMarkdown(editor);
    console.log('Save button clicked');
    console.log('Saving article with title:', newTitle);
    console.log('Content:', md);
    if (!newTitle) {
      alert('Title is required, can only contain letters, numbers, and spaces, and must be at most 100 characters.');
      return;
    }
    if (!/^[A-Za-z0-9 ]+$/.test(newTitle) || newTitle.length > 100) {
      alert('Title is required, can only contain letters, numbers, and spaces, and must be at most 100 characters.');
      return;
    }
    if (state.mode === 'add') {
      try {
        const res = await fetch(`${API_BASE}/articles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle, content: md })
        });
        console.log('POST /api/articles response:', res);
        if (res.ok) {
          state.mode = 'view';
          state.selected = newTitle;
          await fetchArticles();
          selectArticle(newTitle);
        } else {
          const err = await res.json();
          console.error('Error creating article:', err);
          alert(err.error || 'Failed to create article');
        }
      } catch (e) {
        console.error('Network or JS error during save:', e);
        alert('Network or JS error during save');
      }
    } else if (state.mode === 'edit') {
      try {
        const oldTitle = state.selected;
        const res = await fetch(`${API_BASE}/articles/${oldTitle}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle, content: md })
        });
        console.log('PUT /api/articles response:', res);
        if (res.ok) {
          state.mode = 'view';
          state.selected = newTitle;
          await fetchArticles();
          selectArticle(newTitle);
        } else {
          const err = await res.json();
          console.error('Error updating article:', err);
          alert(err.error || 'Failed to update article');
        }
      } catch (e) {
        console.error('Network or JS error during update:', e);
        alert('Network or JS error during update: ' + (e && e.message ? e.message : e));
      }
    }
  };
  // Ensure Save button uses the latest handler
  renderTopBar();
}

function handleToolbar(cmd, editor, imgInput) {
  document.execCommand('styleWithCSS', false, false);
  switch (cmd) {
    case 'h1':
      surroundSelection(editor, '# ', '', true);
      break;
    case 'h2':
      surroundSelection(editor, '## ', '', true);
      break;
    case 'h3':
      surroundSelection(editor, '### ', '', true);
      break;
    case 'bold':
      surroundSelection(editor, '**', '**');
      break;
    case 'italic':
      surroundSelection(editor, '*', '*');
      break;
    case 'underline':
      surroundSelection(editor, '<u>', '</u>');
      break;
    case 'code':
      surroundSelection(editor, '```\n', '\n```');
      break;
    case 'warning':
      surroundSelection(editor, '<div class="warning-box"><span class="warning-icon">&#9888;</span><span class="warning-divider"></span><span class="warning-content">', '</span></div>');
      break;
    case 'link': {
      const selText = window.getSelection().toString();
      if (/^https?:\/\//.test(selText)) {
        surroundSelection(editor, '[', `](${selText})`);
      } else {
        const url = prompt('Enter URL:');
        if (url) surroundSelection(editor, '[', `](${url})`);
      }
      break;
    }
    case 'ol': {
      // Robustly prefix each selected line with 1. and replace selection
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const selected = range.toString();
      if (selected) {
        const lines = selected.split(/\r?\n/);
        const newText = lines.map(line => line ? '1. ' + line : '').join('\n');
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
      } else {
        document.execCommand('insertText', false, '1. ');
      }
      break;
    }
    case 'ul': {
      // Robustly prefix each selected line with - and replace selection
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const selected = range.toString();
      if (selected) {
        const lines = selected.split(/\r?\n/);
        const newText = lines.map(line => line ? '- ' + line : '').join('\n');
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
      } else {
        document.execCommand('insertText', false, '- ');
      }
      break;
    }
    case 'image':
      imgInput.click();
      break;
    case 'quote':
      surroundSelection(editor, '> ', '', true);
      break;
    case 'hr':
      insertAtCursor(editor, '\n---\n');
      break;
  }
}

function insertAtCursor(editor, text) {
  document.execCommand('insertText', false, text);
}

function surroundSelection(editor, before, after, prefixOnly = false) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const selected = range.toString();
  if (selected) {
    if (prefixOnly) {
      // For H1, H2, H3, bullets, numbered, quote: prefix each line
      const lines = selected.split('\n');
      const prefix = before;
      const newText = lines.map(line => line ? prefix + line : '').join('\n');
      document.execCommand('insertText', false, newText);
    } else {
      document.execCommand('insertText', false, before + selected + after);
    }
  } else {
    if (prefixOnly) {
      document.execCommand('insertText', false, before);
    } else {
      document.execCommand('insertText', false, before + after);
    }
  }
}

function toMarkdown(editor) {
  // Convert HTML back to Markdown (simple approach)
  // For now, just use innerText (improve later if needed)
  return editor.innerText;
}

function onDelete() {
  // Show confirmation modal
  showDeleteModal(state.selected);
}

function showDeleteModal(title) {
  const area = $('content-area');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="delete-modal-texts">
        <div class="delete-modal-line1">Are you sure you want to delete the article below?</div>
        <div class="delete-modal-title">${title}</div>
        <div class="delete-modal-line3">This action is <b>NOT</b> reversible, you <b>WILL</b> lose this data forever.</div>
      </div>
      <div class="delete-modal-buttons">
        <button id="cancel-delete" class="delete-cancel-btn" autofocus>No do NOT delete this article, I need it!</button>
        <button id="confirm-delete" class="delete-confirm-btn">Yes, I do not want this article anymore</button>
      </div>
    </div>
  `;
  area.appendChild(modal);
  document.getElementById('confirm-delete').onclick = async () => {
    const filename = title.replace(/ /g, '_') + '.txt';
    const res = await fetch(`${API_BASE}/articles/${filename}`, { method: 'DELETE' });
    if (res.ok) {
      state.selected = null;
      state.mode = 'view';
      await fetchArticles();
      renderTopBar();
      renderSidebar();
    } else {
      alert('Failed to delete article');
    }
    modal.remove();
  };
  document.getElementById('cancel-delete').onclick = () => {
    modal.remove();
  };
}

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  renderTopBar();
  fetchArticles();
});

// For clipboard paste, add:
document.addEventListener('paste', async (e) => {
  if (state.mode !== 'add' && state.mode !== 'edit') return;
  if (state.creationStep !== 'editor') return;
  const editor = document.querySelector('.editor-area');
  if (!editor) return;
  const items = (e.clipboardData || window.clipboardData).items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      // Count existing pasted images in the editor content
      const content = editor.innerHTML;
      const matches = content.match(/image_(\d{3})\.png/g) || [];
      let maxNum = 0;
      matches.forEach(name => {
        const num = parseInt(name.match(/(\d{3})/)[1], 10);
        if (num > maxNum) maxNum = num;
      });
      const nextNum = (maxNum + 1).toString().padStart(3, '0');
      const filename = `image_${nextNum}.png`;
      const formData = new FormData();
      formData.append('file', new File([file], filename, { type: file.type }));
      const res = await fetch(`${API_BASE}/images/${state.selected}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        insertAtCursor(editor, `![](${data.url})`);
      } else {
        alert('Image upload failed');
      }
      break;
    }
  }
});

function title_to_folder(title) {
  return title.replace(/ /g, '_');
} 