from flask import Flask, request, session, redirect, render_template, url_for, flash, send_from_directory
import os
import json
from werkzeug.security import generate_password_hash, check_password_hash

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

#Routing na Home
@app.route('/')
def home():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('home.html', username=session['username'])

#Login form 
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

#logout
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

#definování shared a personal folderů pro každého uživatele
@app.route('/files/<folder>')
def list_files(folder):
    if 'username' not in session:
        return redirect(url_for(login))

    username = session['username']
    if folder == 'shared':
        target_path = os.path.join(DATA_DIR, 'shared')
    elif folder == 'personal':
        target_path = os.path.join(DATA_DIR, username,'personal')
    else:
        return 'Invalid folder', 401
    
    files = os.listdir(target_path)
    return {'files': files}

#přidávání nových účtů pouze pro admina
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
            from werkzeug.security import generate_password_hash
            users[new_user] = {
                'password': generate_password_hash(new_pass, method='scrypt')
            }
            save_users(users)
            ensure_user_folder(new_user)
            flash(f"User {new_user} added successfully!")
    return render_template('add_user.html')

#stahování souborů
@app.route('/download/<folder>/<filename>')
def download_file(folder, filename):
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session['username']
    if folder == 'shared':
        dir_path = os.path.join(DATA_DIR, 'shared')
    elif folder == 'personal':
        dir_path = os.path.join(DATA_DIR, username, 'personal')
    else:
        return 'Invalid folder', 400
    
    return send_from_directory(directory=dir_path, path=filename, as_attachment=True)

#upload souborů 
@app.route('/upload/<folder>', methods=['POST'])
def upload_file(folder):
    if 'username' not in session:
        return redirect(url_for('login'))
    
    file = request.files['file']
    if not file:
        return 'No file uploaded', 400
    
    username = session['username']
    if folder == 'shared':
        save_path = os.path.join(DATA_DIR, 'shared')
    elif folder == 'personal':
        save_path = os.path.join(DATA_DIR, username, 'personal')
    else: 
        return 'Invalid folder', 400
    
    file.save(os.path.join(save_path, file.filename))
    return redirect(url_for('home'))

#mazání jednotlivých souborů
@app.route('/delete/<folder>/<filename>', methods=['POST'])
def delete_file(folder, filename):
    if 'username' not in session:
        return redirect(url_for('login'))

    username = session['username']
    if folder == 'shared':
        path = os.path.join(DATA_DIR, 'shared', filename)
    elif folder == 'personal':
        path = os.path.join(DATA_DIR, username, 'personal', filename)
    else:
        return 'Invalid folder', 400

    if os.path.exists(path):
        os.remove(path)
    return redirect(url_for('home'))

#preview pro jednotlivá .mp3/.mp4 videa a zvuky
@app.route('/preview/<folder>/<filename>')
def preview_file(folder, filename):
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session['username']
    if folder == 'shared':
        dir_path = os.path.join(DATA_DIR, 'shared')
    elif folder == 'personal':
        dir_path = os.path.join(DATA_DIR, username, 'personal')
    else:
        return 'Invalid folder', 400
    
    return send_from_directory(directory=dir_path, path=filename)


if __name__ == "__main__":
    init_folders()
    app.run(host='0.0.0.0', port=5000, debug=True)