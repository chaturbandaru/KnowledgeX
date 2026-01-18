# KnowledgeX

A peer-to-peer skill exchange platform that connects people who want to learn with those who can teach, fostering collaborative learning through skill bartering rather than monetary transactions.

## Overview

KnowledgeX reimagines online education by creating a marketplace for skill exchange. Instead of paying for courses, users trade expertise. A Python developer wanting to learn UI/UX design can connect with a designer wanting to learn programming. The platform uses AI-powered matching to connect complementary learners and provides real-time messaging for coordination.

## Core Features

### AI-Powered Skill Extraction
Users interact with an intelligent chat assistant that naturally extracts their learning needs and teaching abilities through conversation. No lengthy forms or complicated onboarding processes.

### Smart Matching Algorithm
The platform uses vector embeddings and semantic search to match users based on complementary skills. When a user expresses interest in learning React, the system finds experts who teach React and want to learn skills the user can offer.

### Real-Time Communication
Built-in messaging system allows users to coordinate learning sessions, exchange resources, and build meaningful educational relationships. Connection requests include personalized introductions to establish context.

### Profile Management
Users maintain profiles showcasing their expertise and learning goals. The system tracks skills offered, skills needed, location, and bio information to facilitate better matches.

## Technical Architecture

### Frontend Stack
- React for UI components and state management
- Modern CSS with Tailwind utility classes
- Responsive design for mobile and desktop
- Real-time updates via polling mechanism

### Backend Stack
- FastAPI (Python) for REST API endpoints
- MongoDB for document storage
- AsyncIO for concurrent request handling
- OpenRouter integration for LLM access

### AI Integration
- Claude (Anthropic) via OpenRouter for conversational interfaces
- Token compression using Token Company SDK to reduce API costs by approximately 50%
- Custom prompt engineering for reliable skill extraction
- Validation against hallucination through database verification

### Database Schema
- Users collection with embedded skills arrays
- Messages collection for chat history
- Connection requests for pending matches
- Chat history for AI context retention

### Crucial Dependencies
- Node.js 18 or higher
- Python 3.10 or higher
- MongoDB 6.0 or higher
- OpenRouter API key
- Token Company API key (optional, for cost optimization)

### Backend Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/knowledgex.git
cd knowledgex/backend
```

2. Create virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
```
MONGODB_URI=mongodb://localhost:27017/knowledgex
OPENROUTER_API_KEY=your_openrouter_key
LLM_MODEL=anthropic/claude-sonnet-4-20250514
TTC_API_KEY=your_token_company_key  # Optional
JWT_SECRET=your_secret_key
```

5. Start the backend server
```bash
uvicorn main:app --reload --port 8000
```

### Frontend Setup

1. Navigate to frontend directory
```bash
cd ../frontend
```

2. Install dependencies
```bash
npm install
```

3. Configure API endpoint
```bash
# Create .env.local
REACT_APP_API_URL=http://localhost:8000
```

4. Start development server
```bash
npm start
```

The application will be available at http://localhost:3000

## API Documentation

### Authentication Endpoints

**POST /auth/signup**
Create a new user account
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**POST /auth/signin**
Authenticate existing user
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Chat Endpoints

**POST /chat/message**
Send message to AI assistant
```json
{
  "message": "I want to learn React and Python"
}
```

Response includes AI reply and extracted skills when ready:
```json
{
  "response": "Great! Let me find experts who can help.",
  "needs_extraction_ready": true,
  "extracted_needs": [
    {"name": "React", "proficiency_level": "beginner"},
    {"name": "Python Programming", "proficiency_level": "beginner"}
  ],
  "matched_users": [...]
}
```

**GET /chat/history**
Retrieve conversation history for current user

**DELETE /chat/history**
Clear chat history and start fresh conversation

### User Endpoints

**GET /users/me**
Get current user profile

**PUT /users/me**
Update user profile
```json
{
  "full_name": "John Doe",
  "bio": "Software engineer interested in design",
  "location": "San Francisco, CA",
  "skills_offered": [
    {"name": "Python", "proficiency_level": "advanced"}
  ],
  "skills_needed": [
    {"name": "UI Design", "proficiency_level": "beginner"}
  ]
}
```

**GET /users/{user_id}**
Get public profile for specific user

### Matching Endpoints

**GET /matches**
Get recommended matches based on current user's skills

**POST /connections/{user_id}**
Send connection request to another user

**GET /requests/incoming**
Get pending connection requests

**PUT /requests/{request_id}/accept**
Accept a connection request

**PUT /requests/{request_id}/reject**
Reject a connection request

### Messaging Endpoints

**GET /conversations**
List all active conversations

**GET /conversations/{user_id}**
Get message history with specific user

**POST /messages/{user_id}**
Send message to connected user
```json
{
  "content": "Hey, when are you free for a Python lesson?"
}
```

## Development Guidelines

### Code Style
- Python: Follow PEP 8 guidelines
- JavaScript: Use ESLint with Airbnb configuration
- Commit messages: Use conventional commits format

### Testing
Backend tests use pytest:
```bash
pytest tests/
```

Frontend tests use Jest and React Testing Library:
```bash
npm test
```

### Database Migrations
MongoDB is schema-less, but for structural changes:
1. Document changes in migrations/ directory
2. Update Pydantic models in models/
3. Run migration script if needed

## Token Compression Integration

To reduce LLM API costs, the platform integrates Token Company's compression SDK. This is optional but recommended for production.

### Setup
```bash
pip install tokenc
```

Add to environment:
```
TTC_API_KEY=your_token_company_key
```

The compression is automatically applied to:
- Chat history (60% compression on older messages)
- System prompts (40% compression)
- Long user messages (30% compression)

Average savings: 50% reduction in token usage.

## Deployment

### Backend Deployment (Railway/Render/Fly.io)

1. Set environment variables in platform dashboard
2. Configure build command: `pip install -r requirements.txt`
3. Configure start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend Deployment (Vercel/Netlify)

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variable: `REACT_APP_API_URL`

### Database Hosting
MongoDB Atlas is recommended for production:
1. Create cluster on MongoDB Atlas
2. Whitelist application IP addresses
3. Update MONGODB_URI in environment variables

## Troubleshooting

### Issue: AI extracts "json" instead of actual skills
This occurs when the LLM includes markdown formatting. The latest version includes:
- Pre-processing to remove code blocks
- Strict validation against formatting artifacts
- Enhanced prompts to prevent JSON output

Solution: Ensure you're using the latest chat_service.py with bullet-list extraction.

### Issue: No matches found after extraction
Check that:
1. Database has users with skills_offered arrays
2. Skill names match (case-insensitive search implemented)
3. User isn't being matched with themselves (excluded in query)

### Issue: Messages not appearing in real-time
The current implementation uses polling every 2-5 seconds. For true real-time:
1. Implement WebSocket connection
2. Use Socket.io or similar library
3. Emit events on new messages

### Issue: High LLM API costs
Enable token compression:
1. Install tokenc: `pip install tokenc`
2. Add TTC_API_KEY to environment
3. Verify compression logs show token reduction

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit pull request with clear description

Areas needing contribution:
- WebSocket implementation for real-time messaging
- Mobile applications (React Native)
- Video call integration
- Learning analytics dashboard
- Skill verification system

## License

MIT License. 
## Contact

For questions or support, open an issue on GitHub or contact the development team.

## Roadmap

**Q1 2026**
- WebSocket implementation for real-time chat
- Video call integration via WebRTC
- Mobile app beta (React Native)

**Q2 2026**
- Skill verification and endorsement system
- Learning path recommendations
- In-app scheduling system

**Q3 2026**
- Enterprise features for corporate internal use
- Advanced analytics dashboard
- API rate limiting and optimization

**Q4 2026**
- Internationalization (i18n) support
- Payment integration for optional premium features
- Community moderation tools