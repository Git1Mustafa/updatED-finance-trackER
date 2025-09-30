from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import logging
from datetime import datetime
import os

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

# CORS configuration - includes common Live Server ports
CORS(app, origins=[
    "http://127.0.0.1:5000",
    "http://localhost:5000", 
    "http://127.0.0.1:5500",  # Live Server
    "http://localhost:5500",  # Live Server
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "null"  # For file:// protocol
], supports_credentials=True)

# Add strict cache and charset headers for compatibility/performance/security guidance
@app.after_request
def add_default_headers(response):
    # Ensure UTF-8 charset on JSON and HTML
    if response.content_type and 'charset' not in response.content_type:
        if response.mimetype in ('application/json', 'text/html'):
            response.headers['Content-Type'] = f"{response.mimetype}; charset=utf-8"

    # Prefer Cache-Control over Expires
    path = request.path or ''
    if path.startswith(('/login', '/register', '/transactions', '/health')):
        # API responses: avoid caching
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    elif path.startswith('/static/'):
        # Static assets: long-term cache with immutable
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    else:
        # Default (e.g., index.html): short cache
        response.headers.setdefault('Cache-Control', 'no-cache')

    # Remove Expires header
    response.headers.pop('Expires', None)
    return response

# Serve index.html via Flask to control headers
@app.route('/')
def index():
    response = make_response(send_from_directory(basedir, 'index.html'))
    # index.html should typically not be long-cached
    response.headers['Cache-Control'] = 'no-cache'
    return response

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "finance.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'dev-secret-key'

db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name, 
            'email': self.email
        }

class Transaction(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(10), nullable=False)  # income/expense
    category = db.Column(db.String(50), nullable=False)
    date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'description': self.description,
            'amount': float(self.amount),
            'type': self.type,
            'category': self.category,
            'date': self.date.strftime('%Y-%m-%d'),
            'timestamp': self.created_at.isoformat()
        }

# Helper function to safely get JSON data
def get_request_data():
    try:
        if request.is_json:
            return request.get_json()
        elif request.data:
            import json
            return json.loads(request.data.decode('utf-8'))
        return {}
    except Exception as e:
        logger.warning(f"Failed to parse request data: {e}")
        return {}

# Routes
@app.route('/health', methods=['GET'])
def health():
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        return jsonify({
            'status': 'ok',
            'message': 'Backend is running',
            'database': 'connected',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'ok', 
            'message': 'Backend running but database error',
            'error': str(e)
        }), 500

@app.route('/register', methods=['POST'])
def register():
    try:
        data = get_request_data()
        logger.info(f"Register request: {data.keys() if data else 'No data'}")

        if not data:
            return jsonify({'error': 'No data received'}), 400

        # Validate required fields
        required = ['name', 'email', 'password', 'confirmPassword']
        missing = [field for field in required if not data.get(field)]
        if missing:
            return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

        # Extract and validate data
        name = data['name'].strip()
        email = data['email'].strip().lower()
        password = data['password']
        confirm_password = data['confirmPassword']

        if not email or '@' not in email:
            return jsonify({'error': 'Valid email required'}), 400

        if password != confirm_password:
            return jsonify({'error': 'Passwords do not match'}), 400

        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        # Check if user exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400

        # Create user
        user = User(name=name, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        logger.info(f"User registered: {email}")
        return jsonify({'message': 'Registration successful'}), 201

    except Exception as e:
        logger.error(f"Registration error: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = get_request_data()
        logger.info(f"Login request: {data.keys() if data else 'No data'}")

        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password required'}), 400

        email = data['email'].strip().lower()
        password = data['password']

        user = User.query.filter_by(email=email).first()
        if not user:
            logger.info(f"User not found: {email}")
            return jsonify({'error': 'Invalid credentials'}), 401

        if not user.check_password(password):
            logger.info(f"Wrong password for: {email}")
            return jsonify({'error': 'Invalid credentials'}), 401

        logger.info(f"User logged in: {email}")
        return jsonify(user.to_dict())

    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/transactions/<user_id>', methods=['GET', 'POST', 'DELETE'])
def transactions(user_id):
    try:
        # Verify user exists
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if request.method == 'GET':
            transactions = Transaction.query.filter_by(user_id=user_id)\
                .order_by(Transaction.date.desc()).all()
            return jsonify([t.to_dict() for t in transactions])

        elif request.method == 'POST':
            data = get_request_data()
            logger.info(f"Transaction POST: {data}")

            if not data:
                return jsonify({'error': 'No transaction data'}), 400

            # Validate required fields
            required = ['description', 'amount', 'type', 'category', 'date']
            missing = [field for field in required if not data.get(field)]
            if missing:
                return jsonify({'error': f'Missing: {", ".join(missing)}'}), 400

            # Validate data
            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return jsonify({'error': 'Amount must be positive'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid amount'}), 400

            if data['type'] not in ['income', 'expense']:
                return jsonify({'error': 'Type must be income or expense'}), 400

            try:
                transaction_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400

            # Create transaction
            transaction = Transaction(
                user_id=user_id,
                description=data['description'].strip(),
                amount=amount,
                type=data['type'],
                category=data['category'],
                date=transaction_date
            )

            db.session.add(transaction)
            db.session.commit()

            logger.info(f"Transaction created: {data['description']}")
            return jsonify(transaction.to_dict()), 201

        elif request.method == 'DELETE':
            transaction_id = request.args.get('id')
            if not transaction_id:
                return jsonify({'error': 'Transaction ID required'}), 400

            transaction = Transaction.query.filter_by(
                id=transaction_id, user_id=user_id
            ).first()

            if not transaction:
                return jsonify({'error': 'Transaction not found'}), 404

            db.session.delete(transaction)
            db.session.commit()

            logger.info(f"Transaction deleted: {transaction_id}")
            return jsonify({'message': 'Transaction deleted'})

    except Exception as e:
        logger.error(f"Transaction error: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Initialize database
def init_db():
    with app.app_context():
        db.create_all()

        # Create demo user if not exists
        demo_user = User.query.filter_by(email='demo@financetracker.com').first()
        if not demo_user:
            demo_user = User(name='Demo User', email='demo@financetracker.com')
            demo_user.set_password('demo123')
            db.session.add(demo_user)
            db.session.commit()

            # Add demo transactions
            demo_transactions = [
                {'description': 'Salary', 'amount': 5000, 'type': 'income', 'category': 'Salary', 'date': '2025-09-01'},
                {'description': 'Groceries', 'amount': 150, 'type': 'expense', 'category': 'Food', 'date': '2025-09-02'},
                {'description': 'Gas Bill', 'amount': 80, 'type': 'expense', 'category': 'Utilities', 'date': '2025-09-01'},
                {'description': 'Coffee', 'amount': 25, 'type': 'expense', 'category': 'Food', 'date': '2025-09-02'},
                {'description': 'Freelance', 'amount': 800, 'type': 'income', 'category': 'Freelance', 'date': '2025-08-30'}
            ]

            for t_data in demo_transactions:
                transaction = Transaction(
                    user_id=demo_user.id,
                    description=t_data['description'],
                    amount=t_data['amount'],
                    type=t_data['type'],
                    category=t_data['category'],
                    date=datetime.strptime(t_data['date'], '%Y-%m-%d').date()
                )
                db.session.add(transaction)

            db.session.commit()
            logger.info("Demo data created")

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    init_db()
    print("🚀 Personal Finance Tracker Backend")
    print("🔗 Health: http://127.0.0.1:5000/health") 
    print("👤 Demo: demo@financetracker.com / demo123")
    app.run(debug=True, host='127.0.0.1', port=5000)
