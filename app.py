from flask import Flask, render_template, request, jsonify
from openai import AzureOpenAI
import os
from typing import List, Dict, Optional
from database import db
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Set up Azure OpenAI client with environment variables
client = AzureOpenAI(
    api_key=os.getenv('AZURE_OPENAI_API_KEY'),
    api_version=os.getenv('AZURE_OPENAI_API_VERSION'),
    azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT')
)

# Get model name from environment
AZURE_MODEL = os.getenv('AZURE_OPENAI_MODEL')

# Validate required environment variables
required_env_vars = [
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_API_VERSION',
    'AZURE_OPENAI_MODEL'
]

missing_vars = [var for var in required_env_vars if not os.getenv(var)]
if missing_vars:
    raise EnvironmentError(
        f"Missing required environment variables: {', '.join(missing_vars)}\n"
        "Please ensure all required variables are set in your .env file."
    )

class ConversationManager:
    def __init__(self, max_tokens: int = 4000):
        self.max_tokens = max_tokens
        self.summary: Optional[str] = None
        
    def should_summarize(self, messages: List[Dict[str, str]]) -> bool:
        # Estimate token count (rough estimation)
        total_chars = sum(len(m['content']) for m in messages)
        estimated_tokens = total_chars / 4  # rough estimate of chars per token
        return estimated_tokens > self.max_tokens * 0.7  # 70% threshold
    
    async def summarize_messages(self, messages: List[Dict[str, str]]) -> str:
        try:
            # Create a prompt for summarization
            summary_prompt = "Please provide a concise summary of the following conversation, " \
                           "focusing on the most important points and context needed for continuation:\n\n"
            
            for msg in messages:
                summary_prompt += f"{msg['role']}: {msg['content']}\n\n"
            
            response = client.chat.completions.create(
                model=AZURE_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that creates concise but informative summaries of conversations."},
                    {"role": "user", "content": summary_prompt}
                ]
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"Summarization error: {str(e)}")
            return None
    
    def prepare_messages(self, messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
        if not self.should_summarize(messages):
            return messages
            
        # If we need summarization
        if self.summary:
            # Include the summary as context and keep only the last few messages
            return [
                {"role": "system", "content": f"Previous conversation summary: {self.summary}"},
                *messages[-4:]  # Keep last 4 messages for immediate context
            ]
        
        return messages

conversation_manager = ConversationManager()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    conversations = db.get_conversations()
    return jsonify(conversations)

@app.route('/api/conversations/<int:conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    messages = db.get_conversation_messages(conversation_id)
    return jsonify(messages)

@app.route('/api/conversations/<int:conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    db.delete_conversation(conversation_id)
    return jsonify({"status": "success"})

@app.route('/api/conversations/<int:conversation_id>/rename', methods=['POST'])
def rename_conversation(conversation_id):
    try:
        new_title = request.json.get('title')
        if not new_title:
            return jsonify({"status": "error", "message": "Title is required"}), 400
        
        db.rename_conversation(conversation_id, new_title)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        messages = data.get('messages', [])
        conversation_id = data.get('conversation_id')
        
        # Create new conversation if needed
        if not conversation_id and messages:
            conversation_id = db.create_conversation(messages[-1]['content'])
        
        # Prepare messages with context management
        prepared_messages = conversation_manager.prepare_messages(messages)
        
        # If we need summarization, do it asynchronously for next time
        if conversation_manager.should_summarize(messages):
            summary = conversation_manager.summarize_messages(messages)
            if summary:
                conversation_manager.summary = summary
        
        response = client.chat.completions.create(
            model=AZURE_MODEL,
            messages=prepared_messages
        )
        
        # Save the message pair to database
        if conversation_id:
            db.add_message(conversation_id, messages[-1]['role'], messages[-1]['content'])
            db.add_message(conversation_id, "assistant", response.choices[0].message.content)
        
        return jsonify({
            'response': response.choices[0].message.content,
            'status': 'success',
            'conversation_id': conversation_id
        })
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

if __name__ == '__main__':
    app.run(debug=True) 