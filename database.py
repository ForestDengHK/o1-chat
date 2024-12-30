import sqlite3
from datetime import datetime
import json
from typing import List, Dict, Optional

class ChatDatabase:
    def __init__(self, db_path: str = "chat_history.db"):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
                )
            """)

    def create_conversation(self, first_message: str) -> int:
        with self.get_connection() as conn:
            # Create new conversation with first message as title (truncated)
            title = first_message[:50] + "..." if len(first_message) > 50 else first_message
            cursor = conn.execute(
                "INSERT INTO conversations (title) VALUES (?)",
                (title,)
            )
            conversation_id = cursor.lastrowid
            return conversation_id

    def add_message(self, conversation_id: int, role: str, content: str):
        with self.get_connection() as conn:
            conn.execute(
                "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
                (conversation_id, role, content)
            )
            conn.execute(
                "UPDATE conversations SET last_updated = CURRENT_TIMESTAMP WHERE id = ?",
                (conversation_id,)
            )

    def get_conversation_messages(self, conversation_id: int) -> List[Dict]:
        with self.get_connection() as conn:
            cursor = conn.execute(
                "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at",
                (conversation_id,)
            )
            return [{"role": row["role"], "content": row["content"]} for row in cursor.fetchall()]

    def get_conversations(self, limit: int = 20) -> List[Dict]:
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT 
                    c.id, 
                    c.title, 
                    c.created_at,
                    c.last_updated,
                    COUNT(m.id) as message_count
                FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                GROUP BY c.id
                ORDER BY c.last_updated DESC
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]

    def delete_conversation(self, conversation_id: int):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
            conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))

    def rename_conversation(self, conversation_id: int, new_title: str):
        with self.get_connection() as conn:
            conn.execute(
                "UPDATE conversations SET title = ? WHERE id = ?",
                (new_title, conversation_id)
            )

# Create global database instance
db = ChatDatabase() 