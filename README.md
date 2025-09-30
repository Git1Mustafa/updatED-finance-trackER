# 💰 Personal Finance Tracker

A **full-stack finance tracker** built with **Flask (backend)** and **HTML/CSS/JavaScript (frontend)**.  
It allows users to register, log in, record income and expenses, and visualize their spending through charts.

---

## 🚀 Features
- 🔐 **User Authentication**: Register & Login (secure password hashing with Werkzeug).  
- 💵 **Transactions**: Add, view, and delete income/expense records.  
- 📊 **Stats**: Shows income, expenses, balance, and savings rate.  
- 📈 **Charts**: Expense breakdown using Chart.js.  
- 🖥️ **Frontend**: Simple & clean UI built with HTML, CSS, and JavaScript.  
- 🗄️ **Backend**: REST API powered by Flask & SQLite.  

---

## 🛠️ Tech Stack
**Frontend**  
- HTML, CSS, JavaScript  
- Chart.js (for visualizations)  

**Backend**  
- Flask (3.0.0)  
- Flask-CORS (4.0.0)  
- Flask-SQLAlchemy (3.1.1)  
- Werkzeug (3.0.1)  
- SQLite (lightweight database)

  ---
  
finance-tracker/
│── frontend/
│ ├── index.html
│ └── static/
│ ├── style.css
│ └── app.js
│
│── backend/
│ ├── app.py
│ ├── requirements.txt
│
│── .gitignore
│── README.md


---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

git clone https://github.com/your-username/finance-tracker.git
cd finance-tracker/backend

2️⃣ Create Virtual Environment (Optional but Recommended)
python -m venv venv


On Windows:

venv\Scripts\activate


On Linux/Mac:

source venv/bin/activate

3️⃣ Install Dependencies
pip install -r requirements.txt

4️⃣ Run the Backend
python app.py


The backend will start at:
👉 http://127.0.0.1:5000

5️⃣ Run the Frontend

Open frontend/index.html directly in your browser.

The frontend will interact with the Flask backend for authentication and transactions.

🧪 API Endpoints
Auth

POST /register → Register new user

POST /login → Login and receive JWT-like token

Transactions

POST /transactions → Add new transaction (income/expense)

GET /transactions/<user_id> → Fetch all transactions for user

DELETE /transactions/<txn_id> → Delete a transaction

Health Check

GET /health → Returns { "status": "ok" }

📊 Demo User

To test quickly, use:

Email: demo@financetracker.com

Password: demo123

🤝 Contributing

Pull requests are welcome!
If you’d like to contribute:

Fork the repo

Create your feature branch (git checkout -b feature/awesome-feature)

Commit your changes (git commit -m 'Add some feature')

Push to the branch (git push origin feature/awesome-feature)

Open a pull request

📜 License

This project is licensed under the MIT License – feel free to use and modify it.


---

⚡ This README is **GitHub-ready**: includes intro, features, tech stack, project structure, setup, API docs, and license.  


## 📂 Project Structure
