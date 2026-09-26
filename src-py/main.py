import sqlite3
from fastapi import FastAPI
import uvicorn

app = FastAPI()
DB_PATH = "data/production.db"

# Initialize DB table
with sqlite3.connect(DB_PATH) as conn:
    conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)")

@app.get("/python-status")
def get_status():
    return {"status": "Python engine is up"}

@app.post("/add-user")
def add_user(payload: dict):
    username = payload.get("name", "Unknown")
    with sqlite3.connect(DB_PATH, timeout=10.0) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (name) VALUES (?)", (username,))
        conn.commit()
        user_id = cursor.lastrowid
    return {"success": True, "inserted_id": user_id, "source": "Python Process"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
