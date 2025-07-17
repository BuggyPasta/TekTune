// TekTune frontend JS

const API_BASE = '/api';

// Always define window.onSave as a no-op to avoid ReferenceError
window.onSave = () => {};

const state = {
  articles: [],
  selected: null,
  mode: 'view', // view | add | edit
  unsaved: false,
};

function $(id) {
  return document.getElementById(id);
}

function renderTopBar() {
  const right = $('action-buttons');
  right.innerHTML = '';
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
    area.innerHTML = `<h2>${data.title}</h2><div class="article-body">${html}</div>`;
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
      navigator.clipboard.writeText(code.textContent);
      copyBtn.classList.add('copied');
      span.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        span.textContent = 'Copy';
      }, 1200);
    };
    wrapper.appendChild(copyBtn);
    wrapper.style.position = 'relative';
    copyBtn.style.position = 'absolute';
    copyBtn.style.top = '8px';
    copyBtn.style.right = '8px';
  });
}

function onAdd() {
  console.log('onAdd called');
  state.mode = 'add';
  state.selected = null;
  renderTopBar();
  renderEditor({ title: '', content: '' });
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
    <button type="button" data-cmd="h1"><b>H1</b></button>
    <button type="button" data-cmd="h2"><b>H2</b></button>
    <button type="button" data-cmd="h3"><b>H3</b></button>
    <button type="button" data-cmd="bold"><b>B</b></button>
    <button type="button" data-cmd="italic"><i>I</i></button>
    <button type="button" data-cmd="underline"><u>U</u></button>
    <button type="button" data-cmd="code">&lt;/&gt;</button>
    <button type="button" data-cmd="warning">&#9888;</button>
    <button type="button" data-cmd="link">🔗</button>
    <button type="button" data-cmd="ol">1.</button>
    <button type="button" data-cmd="ul">•</button>
    <button type="button" data-cmd="image">🖼️</button>
    <button type="button" data-cmd="quote">❝</button>
    <button type="button" data-cmd="hr">―</button>
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

  imgInput.addEventListener('change', async (e) => {
    const file = imgInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/images`, { method: 'POST', body: formData });
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
    if (!/^[A-Za-z0-9 ]+$/.test(newTitle)) {
      alert('Title can only contain letters, numbers, and spaces.');
      return;
    }
    const md = toMarkdown(editor);
    if (state.mode === 'add') {
      const res = await fetch(`${API_BASE}/articles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: md })
      });
      if (res.ok) {
        state.mode = 'view';
        state.selected = newTitle;
        await fetchArticles();
        selectArticle(newTitle);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create article');
      }
    } else if (state.mode === 'edit') {
      const oldFilename = state.selected.replace(/ /g, '_') + '.txt';
      const res = await fetch(`${API_BASE}/articles/${oldFilename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: md })
      });
      if (res.ok) {
        state.mode = 'view';
        state.selected = newTitle;
        await fetchArticles();
        selectArticle(newTitle);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update article');
      }
    }
  };
}

function handleToolbar(cmd, editor, imgInput) {
  document.execCommand('styleWithCSS', false, false);
  switch (cmd) {
    case 'h1':
      insertAtCursor(editor, '# ');
      break;
    case 'h2':
      insertAtCursor(editor, '## ');
      break;
    case 'h3':
      insertAtCursor(editor, '### ');
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
      surroundSelection(editor, '<div class="warning-box">', '</div>');
      break;
    case 'link':
      const url = prompt('Enter URL:');
      if (url) surroundSelection(editor, '[', `](${url})`);
      break;
    case 'ol':
      insertAtCursor(editor, '1. ');
      break;
    case 'ul':
      insertAtCursor(editor, '- ');
      break;
    case 'image':
      imgInput.click();
      break;
    case 'quote':
      insertAtCursor(editor, '> ');
      break;
    case 'hr':
      insertAtCursor(editor, '\n---\n');
      break;
  }
}

function insertAtCursor(editor, text) {
  document.execCommand('insertText', false, text);
}

function surroundSelection(editor, before, after) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const selected = range.toString();
  if (selected) {
    document.execCommand('insertText', false, before + selected + after);
  } else {
    document.execCommand('insertText', false, before + after);
    // Move cursor between before/after if possible
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
      <p>Are you sure you want to delete the article <b>${title}</b>? This action is NOT reversible, you WILL lose this data forever.</p>
      <button id="confirm-delete">Delete</button>
      <button id="cancel-delete">Cancel</button>
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