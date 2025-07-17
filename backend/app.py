import os
import re
import logging
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename

BASE_DIR = '/data/tektune'
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("tektune")

# Set static folder to absolute path /app/frontend/public
STATIC_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'public')
app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='')
CORS(app)

logger.info(f"Flask static_folder is: {app.static_folder}")

# Ensure base directory exists
os.makedirs(BASE_DIR, exist_ok=True)

# Helper: sanitize title for folder/filename
TITLE_REGEX = re.compile(r'^[A-Za-z0-9 ]+$')
def title_to_folder(title):
    if not TITLE_REGEX.match(title):
        return None
    return title.replace(' ', '_')

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
    # List all folders in BASE_DIR that contain a .txt file
    articles = []
    for folder in os.listdir(BASE_DIR):
        folder_path = os.path.join(BASE_DIR, folder)
        if os.path.isdir(folder_path):
            txts = [f for f in os.listdir(folder_path) if f.endswith('.txt')]
            if txts:
                articles.append(filename_to_title(txts[0]))
    articles.sort(key=lambda x: x.lower())
    return jsonify(articles)

@app.route('/api/articles/<title>', methods=['GET'])
def get_article(title):
    folder = title_to_folder(title)
    if not folder:
        return abort(400)
    folder_path = os.path.join(BASE_DIR, folder)
    txt_file = os.path.join(folder_path, folder + '.txt')
    if not os.path.isfile(txt_file):
        return abort(404)
    with open(txt_file, 'r', encoding='utf-8') as f:
        content = f.read()
    return jsonify({'title': title, 'content': content})

@app.route('/api/articles', methods=['POST'])
def create_article():
    data = request.json
    title = data.get('title', '').strip()
    content = data.get('content', '')
    if not TITLE_REGEX.match(title):
        return jsonify({'success': False, 'error': 'Invalid title'}), 400
    folder = title_to_folder(title)
    folder_path = os.path.join(BASE_DIR, folder)
    if os.path.exists(folder_path):
        return jsonify({'success': False, 'error': 'Article already exists'}), 409
    os.makedirs(folder_path, exist_ok=True)
    txt_file = os.path.join(folder_path, folder + '.txt')
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write(content)
    return jsonify({'success': True})

@app.route('/api/articles/<old_title>', methods=['PUT'])
def update_article(old_title):
    data = request.json
    new_title = data.get('title', '').strip()
    content = data.get('content', '')
    if not TITLE_REGEX.match(new_title):
        return jsonify({'success': False, 'error': 'Invalid title'}), 400
    old_folder = title_to_folder(old_title)
    new_folder = title_to_folder(new_title)
    old_folder_path = os.path.join(BASE_DIR, old_folder)
    new_folder_path = os.path.join(BASE_DIR, new_folder)
    old_txt = os.path.join(old_folder_path, old_folder + '.txt')
    new_txt = os.path.join(new_folder_path, new_folder + '.txt')
    if not os.path.exists(old_txt):
        return jsonify({'success': False, 'error': 'Article not found'}), 404
    if old_folder != new_folder and os.path.exists(new_folder_path):
        return jsonify({'success': False, 'error': 'Target article already exists'}), 409
    # If renaming, move folder and .txt file
    if old_folder != new_folder:
        os.rename(old_folder_path, new_folder_path)
    # Write content to new .txt file
    with open(new_txt, 'w', encoding='utf-8') as f:
        f.write(content)
    # Remove old .txt if it still exists (shouldn't, but for safety)
    if old_txt != new_txt and os.path.exists(old_txt):
        os.remove(old_txt)
    return jsonify({'success': True})

@app.route('/api/articles/<title>', methods=['DELETE'])
def delete_article(title):
    folder = title_to_folder(title)
    folder_path = os.path.join(BASE_DIR, folder)
    if not os.path.exists(folder_path):
        return jsonify({'success': False, 'error': 'Article not found'}), 404
    # Remove the entire folder and its contents
    import shutil
    shutil.rmtree(folder_path)
    return jsonify({'success': True})

@app.route('/api/images/<title>', methods=['POST'])
def upload_image(title):
    folder = title_to_folder(title)
    folder_path = os.path.join(BASE_DIR, folder)
    if not os.path.exists(folder_path):
        return jsonify({'success': False, 'error': 'Article folder not found'}), 404
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
    if not allowed_image_file(file.filename):
        return jsonify({'success': False, 'error': 'Invalid file type'}), 400
    filename = secure_filename(file.filename)
    save_path = os.path.join(folder_path, filename)
    # Avoid overwriting existing files: add a number if needed
    base, ext = os.path.splitext(filename)
    counter = 1
    while os.path.exists(save_path):
        filename = f"{base}_{counter}{ext}"
        save_path = os.path.join(folder_path, filename)
        counter += 1
    file.save(save_path)
    url = f"/article_data/{folder}/{filename}"
    return jsonify({'success': True, 'url': url})

@app.route('/article_data/<folder>/<filename>')
def serve_image(folder, filename):
    folder_path = os.path.join(BASE_DIR, folder)
    return send_from_directory(folder_path, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3600) 