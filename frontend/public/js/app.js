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
  if (state.mode === 'edit') {
    right.appendChild(actionButton('close', 'Close', onClose));
    right.appendChild(actionButton('save', 'Save', window.onSave));
  } else {
    right.appendChild(actionButton('add', 'Add Article', onAdd));
    // Show Edit and Delete only if an article is selected and in read-only mode
    if (state.selected && state.mode === 'view') {
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

// 1. Fix scrolling: set body overflow based on mode
function setBodyScroll() {
  if (state.mode === 'edit') {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

// Call setBodyScroll in renderContentArea and when switching modes
async function renderContentArea(mode) {
  setBodyScroll();
  const area = $('content-area');
  // Set class for scrolling behavior
  if (mode === 'article' && state.mode === 'edit') {
    area.className = 'content editing';
  } else {
    area.className = 'content readonly';
  }
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
    const res = await fetch(`${API_BASE}/articles/${encodeURIComponent(state.selected)}`);
    if (!res.ok) {
      area.innerHTML = `<div class="error-msg">Failed to load article.</div>`;
      return;
    }
    const data = await res.json();
    // Render HTML directly
    area.innerHTML = `<div class='article-title'>${data.title}</div><div class="article-body">${data.content}</div>`;
    // Add copy buttons to code blocks
    addCopyButtons(area.querySelector('.article-body'));
    // Highlight code blocks
    Prism.highlightAllUnder(area);
    // Set all links to open in new tab
    const links = area.querySelectorAll('.article-body a');
    links.forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
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
  const res = await fetch(`${API_BASE}/articles/${encodeURIComponent(state.selected)}`);
  if (!res.ok) {
    renderContentArea('error');
    return;
  }
  const data = await res.json();
  renderEditor(data);
}

// 3. & 4. Preserve formatting and line breaks in editor
// Store and restore editor HTML directly for editing
let lastSavedContent = '';
function renderEditor({ title, content }) {
  state.creationStep = 'editor';
  lastSavedContent = content;
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
  // Use HTML content directly for editing
  editor.innerHTML = content || '';
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
    // Save editor HTML as content
    const htmlContent = editor.innerHTML;
    console.log('Save button clicked');
    console.log('Saving article with title:', newTitle);
    console.log('Content:', htmlContent);
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
          body: JSON.stringify({ title: newTitle, content: htmlContent })
        });
        console.log('POST /api/articles response:', res);
        if (res.ok) {
          lastSavedContent = htmlContent;
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
          body: JSON.stringify({ title: newTitle, content: htmlContent })
        });
        console.log('PUT /api/articles response:', res);
        if (res.ok) {
          lastSavedContent = htmlContent;
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

// Improved toMarkdown: preserve line breaks
function toMarkdown(editor) {
  // Convert HTML to Markdown, preserving line breaks
  let html = editor.innerHTML;
  // Replace <div> and <br> with \n
  html = html.replace(/<div><br><\/div>/g, '\n'); // empty divs
  html = html.replace(/<div>/g, '\n');
  html = html.replace(/<br>/g, '\n');
  html = html.replace(/<\/div>/g, '');
  // Remove any remaining HTML tags (simple)
  html = html.replace(/<[^>]+>/g, '');
  return html;
}

// Improved list logic: use insertHTML for <ul>/<ol>/<li>
function handleToolbar(cmd, editor, imgInput) {
  document.execCommand('styleWithCSS', false, false);
  switch (cmd) {
    case 'h1': {
      document.execCommand('formatBlock', false, 'H1');
      break;
    }
    case 'h2': {
      document.execCommand('formatBlock', false, 'H2');
      break;
    }
    case 'h3': {
      document.execCommand('formatBlock', false, 'H3');
      break;
    }
    case 'bold':
      document.execCommand('bold');
      break;
    case 'italic':
      document.execCommand('italic');
      break;
    case 'underline':
      document.execCommand('underline');
      break;
    case 'code': {
      document.execCommand('formatBlock', false, 'PRE');
      break;
    }
    case 'warning': {
      // Wrap selection in a warning box div
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const selected = range.extractContents();
      const box = document.createElement('div');
      box.className = 'warning-box';
      const icon = document.createElement('span');
      icon.className = 'warning-icon';
      icon.innerHTML = '&#9888;';
      const divider = document.createElement('span');
      divider.className = 'warning-divider';
      const content = document.createElement('span');
      content.className = 'warning-content';
      content.appendChild(selected);
      box.appendChild(icon);
      box.appendChild(divider);
      box.appendChild(content);
      range.insertNode(box);
      break;
    }
    case 'link': {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const url = prompt('Enter URL:');
      if (url) {
        document.execCommand('createLink', false, url);
      }
      break;
    }
    case 'ol':
      document.execCommand('insertOrderedList');
      break;
    case 'ul':
      document.execCommand('insertUnorderedList');
      break;
    case 'image':
      imgInput.click();
      break;
    case 'quote': {
      document.execCommand('formatBlock', false, 'BLOCKQUOTE');
      break;
    }
    case 'hr':
      document.execCommand('insertHorizontalRule');
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
        <button id="cancel-delete" class="delete-cancel-btn" autofocus>No, do NOT delete this article, I need it!</button>
        <button id="confirm-delete" class="delete-confirm-btn">Yes, I do not want this article anymore</button>
      </div>
    </div>
  `;
  area.appendChild(modal);
  document.getElementById('confirm-delete').onclick = () => {
    // Show second confirmation modal
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal';
    confirmModal.innerHTML = `
      <div class="modal-content">
        <div class="delete-modal-texts">
          <div class="delete-modal-line1">Are you sure?</div>
        </div>
        <div class="delete-modal-buttons">
          <button id="final-cancel-delete" class="delete-cancel-btn" autofocus>No</button>
          <button id="final-confirm-delete" class="delete-confirm-btn">Yes</button>
        </div>
      </div>
    `;
    area.appendChild(confirmModal);
    document.getElementById('final-confirm-delete').onclick = async () => {
      const res = await fetch(`${API_BASE}/articles/${encodeURIComponent(title)}`, { method: 'DELETE' });
      if (res.ok) {
        state.selected = null;
        state.mode = 'view';
        await fetchArticles();
        renderTopBar();
        renderSidebar();
      } else {
        alert('Failed to delete article');
      }
      confirmModal.remove();
      modal.remove();
    };
    document.getElementById('final-cancel-delete').onclick = () => {
      confirmModal.remove();
    };
  };
  document.getElementById('cancel-delete').onclick = () => {
    modal.remove();
  };
}

function onClose() {
  const editor = document.querySelector('.editor-area');
  const currentContent = editor.innerHTML;
  if (currentContent !== lastSavedContent) {
    // Show modal
    showSaveChangesModal();
  } else {
    // No changes, just close
    state.mode = 'view';
    renderTopBar();
    renderContentArea('article');
    renderSidebar();
  }
}

// 2. Save changes modal: blue buttons, ensure they work
function showSaveChangesModal() {
  const area = $('content-area');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="delete-modal-texts">
        <div class="delete-modal-line1">Save changes?</div>
      </div>
      <div class="delete-modal-buttons">
        <button id="save-changes-yes" class="action-btn">Yes please</button>
        <button id="save-changes-no" class="action-btn">No, thank you</button>
      </div>
    </div>
  `;
  area.appendChild(modal);
  document.getElementById('save-changes-yes').onclick = async () => {
    await window.onSave();
    modal.remove();
    state.mode = 'view';
    renderTopBar();
    renderContentArea('article');
    renderSidebar();
  };
  document.getElementById('save-changes-no').onclick = () => {
    modal.remove();
    state.mode = 'view';
    renderTopBar();
    renderContentArea('article');
    renderSidebar();
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