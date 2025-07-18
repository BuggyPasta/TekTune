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

// Move renderToolbar to top-level so it is always defined before use
function renderToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';
  toolbar.innerHTML =
    `<div class="toolbar-grid">
      <button type="button" data-cmd="h1" aria-label="Heading 1"><span class="toolbar-icon">H1</span><span class="toolbar-label">Heading 1</span></button>
      <button type="button" data-cmd="h2" aria-label="Heading 2"><span class="toolbar-icon">H2</span><span class="toolbar-label">Heading 2</span></button>
      <button type="button" data-cmd="h3" aria-label="Heading 3"><span class="toolbar-icon">H3</span><span class="toolbar-label">Heading 3</span></button>
      <button type="button" data-cmd="bold" aria-label="Bold"><span class="toolbar-icon"><b>B</b></span><span class="toolbar-label">Bold</span></button>
      <button type="button" data-cmd="italic" aria-label="Italic"><span class="toolbar-icon"><i>I</i></span><span class="toolbar-label">Italic</span></button>
      <button type="button" data-cmd="underline" aria-label="Underline"><span class="toolbar-icon"><u>U</u></span><span class="toolbar-label">Underline</span></button>
      <button type="button" data-cmd="code" aria-label="Code block"><span class="toolbar-icon">&lt;/&gt;</span><span class="toolbar-label">Code</span></button>
      <button type="button" data-cmd="warning" aria-label="Warning box"><span class="toolbar-icon">&#9888;</span><span class="toolbar-label">Warning</span></button>
      <button type="button" data-cmd="link" aria-label="Link"><span class="toolbar-icon">🔗</span><span class="toolbar-label">Link</span></button>
      <button type="button" data-cmd="ol" aria-label="Numbered list"><span class="toolbar-icon">1.</span><span class="toolbar-label">Numbered</span></button>
      <button type="button" data-cmd="ul" aria-label="Bullet list"><span class="toolbar-icon">•</span><span class="toolbar-label">Bullets</span></button>
      <button type="button" data-cmd="image" aria-label="Image"><span class="toolbar-icon">🖼️</span><span class="toolbar-label">Image</span></button>
      <button type="button" data-cmd="quote" aria-label="Quote"><span class="toolbar-icon">❝</span><span class="toolbar-label">Quote</span></button>
      <button type="button" data-cmd="hr" aria-label="Horizontal rule"><span class="toolbar-icon">―</span><span class="toolbar-label">Divider</span></button>
    </div>`;
  return toolbar;
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

// Remove all calls to renderContentArea and any code referencing #content-area
// Remove legacy renderContentArea, setBodyScroll, and any code using #content-area
// Update all sidebar logic to use #article-list
function renderSidebar() {
  const sidebar = document.getElementById('article-list');
  sidebar.innerHTML = '';
  if (state.articles.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'empty-msg';
    msg.textContent = 'No articles found. Create your first article!';
    sidebar.appendChild(msg);
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
  const html = document.documentElement;
  const body = document.body;
  const app = document.getElementById('app');
  const mainLayout = document.querySelector('.main-layout');
  if (state.mode === 'edit') {
    html.classList.add('editing-mode');
    body.classList.add('editing-mode');
    if (app) app.classList.add('editing-mode');
    if (mainLayout) mainLayout.classList.add('editing-mode');
  } else {
    html.classList.remove('editing-mode');
    body.classList.remove('editing-mode');
    if (app) app.classList.remove('editing-mode');
    if (mainLayout) mainLayout.classList.remove('editing-mode');
  }
}

// Call setBodyScroll in renderContentArea and when switching modes
async function renderContentArea(mode) {
  setBodyScroll();
  const area = $('#article-content');
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
    // Convert markdown image syntax to <img> tags in the content
    let htmlContent = data.content.replace(/!\[.*?\]\((.*?)\)/g, '<img src="$1" alt="Image" style="max-width:100%;display:block;margin:1.2em auto;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.10);" />');
    // Render HTML directly
    area.innerHTML = `<div class='article-title'>${data.title}</div><div class="article-body">${htmlContent}</div>`;
    // Highlight code blocks
    Prism.highlightAllUnder(area);
    // Add copy buttons to code blocks (must be after Prism)
    addCopyButtons(area.querySelector('.article-body'));
    // Set all links to open in new tab
    const links = area.querySelectorAll('.article-body a');
    links.forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });
    return;
  }
  if (mode === 'article' && !state.selected) {
    area.innerHTML = `<div class="choose-msg">Choose from an article on the list to begin.</div>`;
    return;
  }
}

// Ensure editor is properly disabled when switching to view mode
function disableEditor() {
  const editor = document.querySelector('.editor-area');
  const titleInput = document.querySelector('.editor-title');
  if (editor) {
    editor.contentEditable = 'false';
    editor.style.pointerEvents = 'none';
  }
  if (titleInput) {
    titleInput.readOnly = true;
    titleInput.style.pointerEvents = 'none';
  }
}

// Ensure editor is properly enabled when switching to edit mode
function enableEditor() {
  const editor = document.querySelector('.editor-area');
  const titleInput = document.querySelector('.editor-title');
  if (editor) {
    editor.contentEditable = 'true';
    editor.style.pointerEvents = 'auto';
  }
  if (titleInput) {
    titleInput.readOnly = false;
    titleInput.style.pointerEvents = 'auto';
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
  // Bulletproof: clear and rebuild both AREA B1 and B2
  renderAddArticleUI();
}

function renderAddArticleUI() {
  // Completely re-render AREA B2
  const areaB2 = document.getElementById('article-content');
  areaB2.innerHTML = '';

  // Title input
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'editor-title';
  titleInput.placeholder = 'Enter article title...';
  titleInput.value = '';
  areaB2.appendChild(titleInput);

  // Editor area
  const editor = document.createElement('div');
  editor.className = 'editor-area';
  editor.contentEditable = 'true';
  editor.innerHTML = '<p>Start writing your article...</p>';
  areaB2.appendChild(editor);

  // Enable editor
  enableEditor();

  // Focus on title input
  titleInput.focus();

  // Attach event handlers
  titleInput.addEventListener('input', () => {
    state.unsaved = true;
  });

  editor.addEventListener('input', () => {
    state.unsaved = true;
  });

  // Handle paste events for images
  editor.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/images/untitled`, { method: 'POST', body: formData });
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

  // Handle toolbar clicks
  const toolbar = document.querySelector('.editor-toolbar');
  if (toolbar) {
    toolbar.addEventListener('click', (e) => {
      if (e.target.closest('button')) {
        const cmd = e.target.closest('button').dataset.cmd;
        handleToolbar(cmd, editor);
      }
    });
  }

  // Set state
  state.mode = 'add';
  state.creationStep = 'editor';
  state.unsaved = false;
}

// --- Modal Root Helper ---
function getModalRoot() {
  let modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  }
  return modalRoot;
}

// --- Delete Modal ---
function showDeleteModal(title) {
  const modalRoot = getModalRoot();
  modalRoot.innerHTML = `
    <div class="modal">
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
    </div>
  `;
  document.getElementById('confirm-delete').onclick = () => {
    fetch(`${API_BASE}/articles/${encodeURIComponent(title)}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          state.selected = null;
          state.mode = 'view';
          fetchArticles();
          renderTopBar();
          renderContentArea('article'); // Changed from renderArticle() to renderContentArea('article')
        } else {
          alert('Failed to delete article');
        }
        modalRoot.innerHTML = '';
      });
  };
  document.getElementById('cancel-delete').onclick = () => {
    modalRoot.innerHTML = '';
  };
}

// --- Save Changes Modal (for edit/close) ---
function showSaveChangesModal(onYes, onNo) {
  const modalRoot = getModalRoot();
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Save changes?</h3>
      <p>Do you want to save your changes before closing?</p>
      <div class="modal-buttons">
        <button class="modal-btn" id="yes-btn">Yes please</button>
        <button class="modal-btn" id="no-btn">No, thank you</button>
      </div>
    </div>
  `;
  modalRoot.appendChild(modal);
  
  // Add proper event handlers
  modal.querySelector('#yes-btn').onclick = () => {
    modal.remove();
    onSave();
  };
  
  modal.querySelector('#no-btn').onclick = () => {
    modal.remove();
    disableEditor();
    state.mode = 'view';
    renderTopBar();
    renderContentArea('article');
  };
}

// --- Robust onDelete ---
function onDelete() {
  if (!state.selected) return;
  showDeleteModal(state.selected);
}

// --- Robust onClose ---
function onClose() {
  if (state.mode === 'edit' || state.mode === 'add') {
    // Check for unsaved changes
    const areaB2 = document.getElementById('article-content');
    const editor = areaB2.querySelector('.editor-area');
    const titleInput = areaB2.querySelector('.editor-title') || document.getElementById('article-title');
    const currentContent = editor ? editor.innerHTML : '';
    const currentTitle = titleInput ? (titleInput.value || titleInput.innerText) : '';
    if ((currentContent && currentContent !== (state.lastSavedContent || '')) || (currentTitle && currentTitle !== (state.lastSavedTitle || ''))) {
      showSaveChangesModal();
      return;
    }
  }
  state.mode = 'view';
  disableEditor();
  renderTopBar();
  renderContentArea('article');
}

// --- Robust onSave ---
function onSave() {
  const areaB2 = document.getElementById('article-content');
  const titleInput = areaB2.querySelector('.editor-title') || document.getElementById('article-title');
  const editor = areaB2.querySelector('.editor-area') || document.getElementById('editor-area');
  const displayTitle = titleInput ? (titleInput.value || titleInput.innerText).trim() : '';
  const content = editor ? editor.innerHTML : '';
  
  if (!displayTitle) {
    alert('Title is required.');
    return;
  }
  
  // Convert display title to safe folder name
  const safeTitle = displayTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove all symbols except letters, numbers, spaces
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  if (!safeTitle) {
    alert('Title must contain at least one letter or number.');
    return;
  }
  
  if (state.mode === 'add') {
    fetch(`${API_BASE}/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: safeTitle, content, displayTitle })
    }).then(res => {
      if (res.ok) {
        state.mode = 'view';
        state.selected = safeTitle;
        disableEditor();
        fetchArticles();
        renderTopBar();
        renderContentArea('article');
        showSaveConfirmation();
      } else {
        alert('Failed to create article');
      }
    });
    return;
  }
  if (state.mode === 'edit') {
    fetch(`${API_BASE}/articles/${encodeURIComponent(state.selected)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: safeTitle, content, displayTitle })
    }).then(res => {
      if (res.ok) {
        state.mode = 'view';
        state.selected = safeTitle;
        disableEditor();
        fetchArticles();
        renderTopBar();
        renderContentArea('article');
        showSaveConfirmation();
      } else {
        alert('Failed to update article');
      }
    });
    return;
  }
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
function handleToolbar(cmd, editor) {
  document.execCommand('styleWithCSS', false, false);
  switch (cmd) {
    case 'h1': 
    case 'h2': 
    case 'h3': {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const selected = range.extractContents();
      const parent = selected.querySelector('h1, h2, h3') || range.commonAncestorContainer.closest('h1, h2, h3');
      if (parent) {
        // Remove heading - convert to normal text
        const text = parent.textContent;
        const textNode = document.createTextNode(text);
        parent.parentNode.replaceChild(textNode, parent);
      } else {
        // Add heading
        const heading = document.createElement(cmd.toUpperCase());
        heading.appendChild(selected);
        range.insertNode(heading);
      }
      break;
    }
    case 'bold': document.execCommand('bold'); break;
    case 'italic': document.execCommand('italic'); break;
    case 'underline': document.execCommand('underline'); break;
    case 'code': {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const parent = range.commonAncestorContainer.closest('pre');
      if (parent) {
        // Remove code - convert to normal text
        const text = parent.textContent;
        const textNode = document.createTextNode(text);
        parent.parentNode.replaceChild(textNode, parent);
      } else {
        // Add code
        const selected = range.extractContents();
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.appendChild(selected);
        pre.appendChild(code);
        range.insertNode(pre);
      }
      break;
    }
    case 'warning': {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const parent = range.commonAncestorContainer.closest('.warning-box');
      if (parent) {
        // Remove warning - convert to normal text
        const text = parent.querySelector('.warning-content').textContent;
        const textNode = document.createTextNode(text);
        parent.parentNode.replaceChild(textNode, parent);
      } else {
        // Add warning
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
      }
      break;
    }
    case 'link': {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const link = range.commonAncestorContainer.closest('a');
      if (link) {
        // Remove link - convert to normal text
        const text = link.textContent;
        const textNode = document.createTextNode(text);
        link.parentNode.replaceChild(textNode, link);
      } else {
        // Add link
        const selectedText = sel.toString().trim();
        let url = selectedText;
        if (!isValidURL(selectedText)) {
          url = prompt('Enter URL:');
          if (!url) return;
        }
        document.execCommand('createLink', false, url);
      }
      break;
    }
    case 'ol': document.execCommand('insertOrderedList'); break;
    case 'ul': document.execCommand('insertUnorderedList'); break;
    case 'image': {
      // Open file dialog and insert image with max-width: 100%
      const imgInput = document.createElement('input');
      imgInput.type = 'file';
      imgInput.accept = 'image/*';
      imgInput.onchange = async (e) => {
        const file = imgInput.files[0];
        if (!file) return;
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch(`${API_BASE}/images/${state.selected || 'untitled'}`, { 
            method: 'POST', 
            body: formData 
          });
          if (!res.ok) {
            if (res.status === 404) {
              alert('Image upload failed: Server endpoint not found. Please check if the backend is running.');
            } else {
              throw new Error(`HTTP ${res.status}`);
            }
            return;
          }
          const data = await res.json();
          if (data.success) {
            const img = document.createElement('img');
            img.src = data.url;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            insertAtCursor(editor, img.outerHTML);
          } else {
            alert('Image upload failed: ' + (data.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Image upload error:', error);
          alert('Image upload failed: ' + error.message);
        }
      };
      imgInput.click();
      break;
    }
    case 'quote': {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const parent = range.commonAncestorContainer.closest('blockquote');
      if (parent) {
        // Remove quote - convert to normal text
        const text = parent.textContent;
        const textNode = document.createTextNode(text);
        parent.parentNode.replaceChild(textNode, parent);
      } else {
        // Add quote
        document.execCommand('formatBlock', false, 'BLOCKQUOTE');
      }
      break;
    }
    case 'hr': document.execCommand('insertHorizontalRule'); break;
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

// --- Robust Toolbar Handler ---
function renderAddArticleEditor() {
  // Completely re-render AREA B2
  const areaB2 = document.getElementById('article-content');
  areaB2.innerHTML = '';

  // Title input
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'editor-title';
  titleInput.placeholder = 'Enter article title...';
  titleInput.maxLength = 100;
  areaB2.appendChild(titleInput);

  // Main text editor
  const editor = document.createElement('div');
  editor.className = 'editor-area editing';
  editor.contentEditable = true;
  editor.spellcheck = true;
  editor.setAttribute('placeholder', 'Write your article here...');
  areaB2.appendChild(editor);

  // Focus title input
  setTimeout(() => titleInput.focus(), 0);

  // Always re-render AREA B1 to ensure toolbar event handlers are correct
  renderTopBar();

  // Attach toolbar actions to this editor
  const toolbar = document.querySelector('.editor-toolbar');
  if (toolbar) {
    toolbar.onclick = (e) => {
      if (e.target.closest('button')) {
        const cmd = e.target.closest('button').dataset.cmd;
        handleToolbar(cmd, editor);
      }
    };
  }

  // Fallback: if editor or title input is missing, re-render AREA B2
  if (!areaB2.contains(titleInput) || !areaB2.contains(editor)) {
    renderAddArticleEditor();
  }
}

// --- Robust Toolbar Handler for Edit Mode ---
function renderEditor({ title, content }) {
  // Completely re-render AREA B2
  const areaB2 = document.getElementById('article-content');
  areaB2.innerHTML = '';

  // Title input
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'editor-title';
  titleInput.placeholder = 'Enter article title...';
  titleInput.value = title || '';
  areaB2.appendChild(titleInput);

  // Editor area
  const editor = document.createElement('div');
  editor.className = 'editor-area';
  editor.contentEditable = true;
  editor.innerHTML = content || '<p>Start writing your article...</p>';
  areaB2.appendChild(editor);

  // Enable editor
  enableEditor();

  // Focus on editor
  editor.focus();

  // Attach event handlers
  titleInput.addEventListener('input', () => {
    state.unsaved = true;
  });

  editor.addEventListener('input', () => {
    state.unsaved = true;
  });

  // Handle paste events for images
  editor.addEventListener('paste', async (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        const formData = new FormData();
        formData.append('file', file);
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

  // Handle toolbar clicks
  const toolbar = document.querySelector('.editor-toolbar');
  if (toolbar) {
    toolbar.addEventListener('click', (e) => {
      if (e.target.closest('button')) {
        const cmd = e.target.closest('button').dataset.cmd;
        handleToolbar(cmd, editor);
      }
    });
  }

  // Set state
  state.mode = 'edit';
  state.unsaved = false;
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

// --- Ensure sidebar always updates after add/edit/delete ---
async function fetchArticles() {
  const res = await fetch(`${API_BASE}/articles`);
  state.articles = await res.json();
  renderSidebar();
  // If the selected article was deleted, clear selection
  if (state.selected && !state.articles.includes(state.selected)) {
    state.selected = null;
    renderContentArea('choose');
  }
}

// --- Ensure no blank or broken screens ---
window.addEventListener('DOMContentLoaded', () => {
  fetchArticles();
  renderTopBar();
  renderContentArea('article');
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

function isValidURL(str) {
  // Simple URL validation: must start with http:// or https://
  return /^https?:\/\//i.test(str.trim());
} 

function renderTopBar() {
  const left = document.getElementById('toolbar-left');
  const right = document.getElementById('toolbar-right');
  if (left) left.innerHTML = '';
  if (right) right.innerHTML = '';
  if (state.mode === 'edit' || state.mode === 'add') {
    // Toolbar (left)
    const toolbar = renderToolbar();
    if (left) left.appendChild(toolbar);
    // Save/Close (right)
    if (right) {
      right.appendChild(actionButton('close', 'Close', onClose));
      right.appendChild(actionButton('save', 'Save', onSave));
    }
  } else {
    // Read-only: Add always visible
    if (right) right.appendChild(actionButton('add', 'Add Article', onAdd));
    if (state.selected && right) {
      right.appendChild(actionButton('edit', 'Edit', onEdit));
      right.appendChild(actionButton('delete', 'Delete', onDelete));
    }
  }
} 

function showSaveConfirmation() {
  const areaB2 = document.getElementById('article-content');
  if (areaB2) {
    const msg = document.createElement('div');
    msg.textContent = 'Article saved!';
    msg.style.position = 'absolute';
    msg.style.top = '16px';
    msg.style.right = '32px';
    msg.style.background = '#00A9E0';
    msg.style.color = '#fff';
    msg.style.padding = '0.7em 1.5em';
    msg.style.borderRadius = '8px';
    msg.style.fontWeight = 'bold';
    msg.style.zIndex = '2000';
    msg.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    areaB2.appendChild(msg);
    setTimeout(() => { 
      if (msg.parentNode) msg.parentNode.removeChild(msg); 
    }, 2000);
  }
} 