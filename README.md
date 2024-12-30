# O1 Chat Application

A modern chat application using Azure OpenAI services with a ChatGPT-like interface. Features include conversation management, theme switching, markdown support, and code syntax highlighting.

## Features

- 🎨 **Modern Interface**
  - Dark and light theme support
  - ChatGPT-like user experience
  - Responsive design
  - Custom scrollbar styling
  - Loading indicators and animations

- 📝 **Rich Content Support**
  - Full markdown rendering
  - Code syntax highlighting
  - Copy-to-clipboard functionality
  - Auto-expanding input area
  - Message formatting

- 💾 **Conversation Management**
  - Persistent chat history
  - Create new conversations
  - Rename existing conversations
  - Delete conversations
  - Context summarization for long chats

- 🔒 **Security Features**
  - Secure credential management
  - Environment variable configuration
  - API key protection
  - Input sanitization

## Prerequisites

- Python 3.8 or higher
- Azure OpenAI API access
- SQLite (included with Python)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/o1-chat.git
cd o1-chat
```

2. Create and activate a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
```

5. Edit `.env` and add your Azure OpenAI credentials:
```env
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=your_endpoint_here
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_MODEL=your_model_name_here
```

## Usage

1. Start the application:
```bash
python app.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

3. Start chatting! You can:
   - Create new conversations
   - Switch between light and dark themes
   - Use markdown in your messages
   - Share code with syntax highlighting
   - Manage conversation history

## Development

- The application uses Flask for the backend
- Frontend is built with vanilla JavaScript
- Styling uses CSS variables for theming
- SQLite database for conversation storage
- Real-time markdown rendering with marked.js
- Code highlighting with highlight.js

## Project Structure
```
o1-chat/
├── app.py              # Main Flask application
├── database.py         # Database handling
├── requirements.txt    # Python dependencies
├── static/            
│   ├── style.css      # Application styles
│   └── script.js      # Frontend JavaScript
├── templates/
│   └── index.html     # Main HTML template
└── docs/
    └── progress.md    # Development progress
```

## Security Notes

- Never commit the `.env` file to version control
- Keep your API keys secure and rotate them regularly
- The `.env` file is automatically ignored by git
- Use environment variables for all sensitive data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Azure OpenAI for the chat model
- marked.js for markdown rendering
- highlight.js for code syntax highlighting 