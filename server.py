from flask import Flask, request, session, redirect, render_template, url_for, flash, send_from_directory
import os
import json
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__)
app.secret_key = '="zj"n6,b~RcjD('

USER_FILE = 'users.json'
DATA_DIR = 'data'

def init_folders():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, 'shared'), exist_ok=True)

def load_users():
    if not os.path.exists(USER_FILE):
        return {}
    with open(USER_FILE, 'r') as f:
        return json.load(f)

def save_users(users):
    with open(USER_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def ensure_user_folder(username):
    user_path = os.path.join(DATA_DIR, username, 'personal')
    os.makedirs(user_path, exist_ok=True)

@app.route('/')
def home():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('home.html', username=session['username'])

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        users = load_users()
        username = request.form['username']
        password = request.form['password']
        if username in users and check_password_hash(users[username]['password'], password):
            session['username'] = username
            ensure_user_folder(username)
            return redirect(url_for('home'))
        else:
            return 'Invalid credentials', 401
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/files/<folder>/', defaults={'subpath': ''})
@app.route('/files/<folder>/<path:subpath>')
def list_files(folder, subpath):
    if 'username' not in session:
        return redirect(url_for('login'))

    username = session['username']
    base_path = os.path.join(DATA_DIR, 'shared' if folder == 'shared' else os.path.join(username, 'personal'))
    target_path = os.path.join(DATA_DIR, base_path, subpath)

    if not os.path.isdir(target_path):
        return 'Folder not found', 404

    files = []
    for item in os.listdir(target_path):
        item_path = os.path.join(target_path, item)
        if os.path.isdir(item_path):
            files.append({'name': item, 'type': 'folder'})
        else:
            stat = os.stat(item_path)
            files.append({
                'name': item,
                'size': stat.st_size,
                'mtime': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M'),
                'type': 'file'
            })

    return {'files': files, 'subpath': subpath}

@app.route('/new_folder/<folder>/', defaults={'subpath': ''}, methods=['POST'])
@app.route('/new_folder/<folder>/<path:subpath>', methods=['POST'])
def new_folder(folder, subpath):
    if 'username' not in session:
        return redirect(url_for('login'))

    folder_name = request.form['folder_name'].strip()
    if not folder_name or any(c in folder_name for c in '/\\'):
        return 'Invalid folder name', 400

    username = session['username']
    base_path = os.path.join(DATA_DIR, 'shared' if folder == 'shared' else os.path.join(username, 'personal'))
    target_path = os.path.join(DATA_DIR, base_path, subpath, folder_name)

    os.makedirs(target_path, exist_ok=True)
    return '', 204

@app.route('/add_user', methods=['GET', 'POST'])
def add_user():
    if 'username' not in session or session['username'] != 'admin':
        return 'Access denied', 403

    if request.method == 'POST':
        new_user = request.form['new_user']
        new_pass = request.form['new_pass']
        users = load_users()
        if new_user in users:
            flash('User already exists')
        else: 
            users[new_user] = {'password': generate_password_hash(new_pass, method='scrypt')}
            save_users(users)
            ensure_user_folder(new_user)
            flash(f"User {new_user} added successfully!")
    return render_template('add_user.html')

@app.route('/download/<folder>/<path:filename>')
def download_file(folder, filename):
    if 'username' not in session:
        return redirect(url_for('login'))

    username = session['username']
    dir_path = os.path.join(DATA_DIR, 'shared' if folder == 'shared' else os.path.join(username, 'personal'))
    return send_from_directory(directory=os.path.join(dir_path), path=filename, as_attachment=True)

@app.route('/upload/<folder>', methods=['POST'])
def upload_file(folder):
    if 'username' not in session:
        return redirect(url_for('login'))

    file = request.files['file']
    if not file:
        return 'No file uploaded', 400

    username = session['username']
    save_path = os.path.join(DATA_DIR, 'shared' if folder == 'shared' else os.path.join(username, 'personal'))
    file.save(os.path.join(save_path, file.filename))
    return redirect(url_for('home'))

@app.route('/delete/<folder>/<path:filename>', methods=['POST'])
def delete_file(folder, filename):
    if 'username' not in session:
        return redirect(url_for('login'))

    username = session['username']
    path = os.path.join(DATA_DIR, 'shared' if folder == 'shared' else os.path.join(username, 'personal'), filename)
    if os.path.exists(path):
        os.remove(path)
    return redirect(url_for('home'))

@app.route('/preview/<folder>/<path:filename>')
def preview_file(folder, filename):
    if 'username' not in session:
        return redirect(url_for('login'))

    username = session['username']
    dir_path = os.path.join(DATA_DIR, 'shared' if folder == 'shared' else os.path.join(username, 'personal'))
    return send_from_directory(directory=dir_path, path=filename)

@app.route('/settings', methods=['GET', 'POST'])
def settings():
    if 'username' not in session:
        return redirect(url_for('login'))

    username = session['username']
    users = load_users()

    if request.method == 'POST':
        current = request.form['current_password']
        new = request.form['new_password']
        confirm = request.form['confirm_password']

        if not check_password_hash(users[username]['password'], current):
            flash('Current password is incorrect.')
        elif new != confirm:
            flash('New passwords do not match.')
        else:
            users[username]['password'] = generate_password_hash(new, method='scrypt')
            save_users(users)
            flash('Password updated successfully.')

    return render_template('settings.html', username=username)

@app.route('/delete_folder/<folder>/<path:subpath>', methods=['POST'])
def delete_folder(folder, subpath):
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session['username']
    base_path = os.path.join(DATA_DIR, 'shared' if folder == 'shared' else os.path.join(username, 'personal'))
    folder_path = os.path.join(DATA_DIR, base_path, subpath)

    if os.path.isdir(folder_path):
        try:
            os.rmdir(folder_path)
            return '', 204
        except OSError:
            return 'Folder not empty', 400
    return 'Folder not found', 404

if __name__ == "__main__":
    init_folders()
    app.run(host='0.0.0.0', port=5000, debug=True)
