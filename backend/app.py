import os
import re
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename

ARTICLES_DIR = '/data/tektune/articles'
IMAGES_DIR = '/data/tektune/images'
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

app = Flask(__name__, static_folder='../frontend/public', static_url_path='')
CORS(app)

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

@app.route('/')
def index():
    return app.send_static_file('index.html')

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