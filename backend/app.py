import os
import re
import logging
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename

ARTICLES_DIR = '/data/tektune/articles'
IMAGES_DIR = '/data/tektune/images'
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("tektune")

app = Flask(__name__, static_folder='frontend/public', static_url_path='')
CORS(app)

logger.info(f"Flask static_folder is: {app.static_folder}")

# Ensure storage directories exist
os.makedirs(ARTICLES_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

# Helper: sanitize title for filename
TITLE_REGEX = re.compile(r'^[A-Za-z0-9 ]+$')
def title_to_filename(title):
    if not TITLE_REGEX.match(title):
        return None
    return title.replace(' ', '_') + '.txt'

def filename_to_title(filename):
    if filename.endswith('.txt'):
        return filename[:-4].replace('_', ' ')
    return filename.replace('_', ' ')

def allowed_image_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

# Debug endpoint to list all files in the static folder
@app.route('/debug-list')
def debug_list():
    files = []
    for root, dirs, filenames in os.walk(app.static_folder):
        for name in filenames:
            files.append(os.path.relpath(os.path.join(root, name), app.static_folder))
    logger.info(f"Files in static folder: {files}")
    return {'static_folder': app.static_folder, 'files': files}

# Serve index.html at root
@app.route('/')
def index():
    index_path = os.path.join(app.static_folder, 'index.html')
    logger.info(f"Serving /: Looking for {index_path}")
    if os.path.isfile(index_path):
        logger.info("index.html found, serving.")
        return send_from_directory(app.static_folder, 'index.html')
    else:
        logger.error("index.html NOT FOUND!")
        return "index.html not found", 404

# Serve static files and fallback to index.html for SPA (except /api and /images)
@app.route('/<path:path>')
def static_proxy(path):
    file_path = os.path.join(app.static_folder, path)
    logger.info(f"Request for /{path}, looking for {file_path}")
    if os.path.isfile(file_path):
        logger.info(f"Found static file: {file_path}")
        return send_from_directory(app.static_folder, path)
    else:
        if not path.startswith('api') and not path.startswith('images'):
            logger.info(f"Not found, falling back to index.html for SPA: {file_path}")
            return send_from_directory(app.static_folder, 'index.html')
        logger.error(f"File not found and not SPA route: {file_path}")
        abort(404)

@app.route('/api/articles', methods=['GET'])
def list_articles():
    files = [f for f in os.listdir(ARTICLES_DIR) if f.endswith('.txt')]
    articles = [filename_to_title(f) for f in files]
    articles.sort(key=lambda x: x.lower())
    return jsonify(articles)

@app.route('/api/articles/<filename>', methods=['GET'])
def get_article(filename):
    if not filename.endswith('.txt'):
        filename += '.txt'
    path = os.path.join(ARTICLES_DIR, filename)
    if not os.path.isfile(path):
        return abort(404)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    return jsonify({'title': filename_to_title(filename), 'content': content})

@app.route('/api/articles', methods=['POST'])
def create_article():
    data = request.json
    title = data.get('title', '').strip()
    content = data.get('content', '')
    if not TITLE_REGEX.match(title):
        return jsonify({'success': False, 'error': 'Invalid title'}), 400
    filename = title_to_filename(title)
    path = os.path.join(ARTICLES_DIR, filename)
    if os.path.exists(path):
        return jsonify({'success': False, 'error': 'Article already exists'}), 409
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return jsonify({'success': True})

@app.route('/api/articles/<filename>', methods=['PUT'])
def update_article(filename):
    data = request.json
    new_title = data.get('title', '').strip()
    content = data.get('content', '')
    if not TITLE_REGEX.match(new_title):
        return jsonify({'success': False, 'error': 'Invalid title'}), 400
    new_filename = title_to_filename(new_title)
    old_path = os.path.join(ARTICLES_DIR, filename if filename.endswith('.txt') else filename + '.txt')
    new_path = os.path.join(ARTICLES_DIR, new_filename)
    if not os.path.exists(old_path):
        return jsonify({'success': False, 'error': 'Article not found'}), 404
    if old_path != new_path and os.path.exists(new_path):
        return jsonify({'success': False, 'error': 'Target article already exists'}), 409
    with open(new_path, 'w', encoding='utf-8') as f:
        f.write(content)
    if old_path != new_path:
        os.remove(old_path)
    return jsonify({'success': True})

@app.route('/api/articles/<filename>', methods=['DELETE'])
def delete_article(filename):
    path = os.path.join(ARTICLES_DIR, filename if filename.endswith('.txt') else filename + '.txt')
    if not os.path.exists(path):
        return jsonify({'success': False, 'error': 'Article not found'}), 404
    os.remove(path)
    return jsonify({'success': True})

@app.route('/api/images', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
    if not allowed_image_file(file.filename):
        return jsonify({'success': False, 'error': 'Invalid file type'}), 400
    filename = secure_filename(file.filename)
    save_path = os.path.join(IMAGES_DIR, filename)
    # Avoid overwriting existing files: add a number if needed
    base, ext = os.path.splitext(filename)
    counter = 1
    while os.path.exists(save_path):
        filename = f"{base}_{counter}{ext}"
        save_path = os.path.join(IMAGES_DIR, filename)
        counter += 1
    file.save(save_path)
    url = f"/images/{filename}"
    return jsonify({'success': True, 'url': url})

@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(IMAGES_DIR, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3600) 