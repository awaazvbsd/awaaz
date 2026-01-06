# Voice Stress Analysis Application - Technology Stack Summary

**Document Version:** 1.0  
**Last Updated:** January 4, 2026  
**Application:** Voice Stress Analysis for Student Wellness

---

## 📋 Executive Summary

This application is a **Voice Stress Analysis** platform designed for student mental health and wellness monitoring. It combines traditional signal processing (Praat) with modern AI (Google Gemini) to analyze voice patterns and provide personalized psychological recommendations.

**Architecture Type:** Full-stack web application with external AI services  
**Deployment Model:** Client-server with cloud AI integration  
**Primary Use Case:** Mental health assessment and stress monitoring

---

## 🎨 Frontend Technologies

### Core Framework
| Technology | Version | License | Purpose |
|-----------|---------|---------|---------|
| **React** | Latest | MIT | UI component framework |
| **TypeScript** | Latest | Apache 2.0 | Type-safe development |
| **Vite** | Latest | MIT | Build tool & dev server |

### Key Features
- Component-based architecture
- Type safety with TypeScript
- Fast hot module replacement (HMR)
- Modern ES6+ JavaScript
- Responsive design

### UI Components
- **PostAnalysisSuggestionsScreen.tsx** - Main results display
- Custom React components for voice recording
- Real-time chat interface
- Interactive stress level visualization

---

## 🔌 Middleware Layer

### Web Framework
| Technology | Version | License | Purpose |
|-----------|---------|---------|---------|
| **Flask** | 3.0.0 | BSD-3-Clause | Python web framework |
| **Flask-CORS** | 4.0.0 | MIT | Cross-origin support |
| **Gunicorn** | 21.2.0 | MIT | WSGI production server |
| **python-dotenv** | 1.0.0 | BSD-3-Clause | Environment config |

### API Endpoints
```
POST /extract_features
- Input: Audio file (WAV/MP3)
- Output: Voice biomarkers + stress analysis
- Port: 8000
```

### Capabilities
- RESTful API design
- CORS-enabled for cross-origin requests
- Environment variable management
- Production-ready WSGI serving
- Request validation & error handling

---

## 🧠 Backend Processing

### Voice Analysis Engine
| Technology | Version | License | Purpose |
|-----------|---------|---------|---------|
| **Praat-parselmouth** | 0.4.4 | GPL-3.0 | Phonetic analysis |

**Biomarkers Extracted:**
- ✅ **Pitch (F0)** - Fundamental frequency
- ✅ **Formants** - F1, F2, F3, F4 (vocal tract resonances)
- ✅ **Jitter** - Pitch variation (voice quality)
- ✅ **Shimmer** - Amplitude variation
- ✅ **HNR** - Harmonics-to-Noise Ratio
- ✅ **Intensity** - Voice loudness
- ✅ **Duration** - Temporal measurements

**Note:** Praat uses **traditional signal processing**, NOT machine learning or neural networks.

### Scientific Computing
| Technology | Version | License | Purpose |
|-----------|---------|---------|---------|
| **NumPy** | 1.24.3 | BSD-3-Clause | Numerical operations |
| **SciPy** | 1.11.4 | BSD-3-Clause | Statistical analysis |

**Capabilities:**
- Array computations
- Fourier transforms (FFT)
- Signal filtering
- Statistical calculations
- Mathematical transformations

### Real-time Communication
| Technology | Version | License | Purpose |
|-----------|---------|---------|---------|
| **stream-chat** | 4.26.0 | Proprietary | Live messaging |

**Features:**
- WebSocket-based chat
- Counselor-student interaction
- Real-time Q&A sessions
- Message persistence

---

## 🤖 AI & Machine Learning

### Generative AI Service
| Component | Details |
|-----------|---------|
| **Service** | Google Gemini API |
| **Model** | gemini-2.5-pro |
| **API Version** | v1beta |
| **SDK** | @google/generative-ai (JavaScript) |
| **License** | Proprietary (API usage) / Apache 2.0 (SDK) |

### AI Capabilities
1. **Psychological Analysis**
   - Interprets stress levels (0-100 scale)
   - Analyzes voice biomarkers (red/orange/green status)
   - Contextualizes student responses

2. **Personalized Recommendations**
   - Generates immediate action items (max 3)
   - Suggests long-term wellness strategies (max 3)
   - Recommends next session timing (3/7/14 days)

3. **Context-Aware Processing**
   - Prioritizes live session answers (highest priority)
   - Considers pre-session questionnaire responses
   - Incorporates AI summary from voice analysis

### AI Input Data
```json
{
  "stressLevel": 65,
  "biomarkers": {
    "pitch": { "value": 180, "status": "red" },
    "jitter": { "value": 2.5, "status": "orange" },
    "shimmer": { "value": 5.2, "status": "green" }
  },
  "aiSummary": "High stress indicators detected...",
  "liveSessionAnswers": [
    {
      "question": "How are you feeling?",
      "answer": "I've been anxious about exams"
    }
  ],
  "questionnaireAnswers": { ... }
}
```

### AI Output Format
```
IMMEDIATE ACTIONS:
1. [Specific, actionable advice for right now]
2. [Another immediate step]
3. [Third immediate action]

LONG-TERM WELLNESS:
1. [Sustainable wellness practice]
2. [Another long-term strategy]
3. [Third wellness recommendation]

NEXT SESSION: [3 or 7 or 14] days
```

---

## 🗄️ Database & Storage

### Current Status
⚠️ **No database explicitly configured in requirements.txt**

### Storage Needs
| Data Type | Current Method | Recommended |
|-----------|---------------|-------------|
| Audio files | Temporary filesystem | Cloud storage (S3/GCS) |
| Session data | React state (volatile) | PostgreSQL/MongoDB |
| User profiles | Not implemented | PostgreSQL |
| Chat history | Stream Chat service | Database backup |
| Analysis results | Not persisted | PostgreSQL |

### Recommended Database Options
| Database | Type | Use Case | License |
|----------|------|----------|---------|
| **PostgreSQL** | SQL | Production relational DB | PostgreSQL License |
| **SQLite** | SQL | Development/testing | Public Domain |
| **MongoDB** | NoSQL | Flexible document storage | SSPL |
| **Redis** | Key-Value | Caching, sessions | BSD-3-Clause |

---

## 🔐 Security & Configuration

### Environment Variables
```bash
# Required API Keys
VITE_GEMINI_API_KEY=<your-gemini-api-key>
API_KEY=<fallback-gemini-key>

# Stream Chat Configuration
STREAM_API_KEY=<stream-api-key>
STREAM_API_SECRET=<stream-api-secret>

# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False
```

### Security Features
| Feature | Status | Technology |
|---------|--------|-----------|
| CORS Protection | ✅ Implemented | Flask-CORS |
| Environment Variables | ✅ Implemented | python-dotenv |
| HTTPS | ⚠️ Production only | TLS/SSL |
| API Key Management | ✅ Implemented | .env files |
| Input Validation | ⚠️ Partial | Flask validators |
| Rate Limiting | ❌ Not implemented | Recommended |
| Authentication | ❌ Not implemented | Recommended |

### Data Privacy Considerations
- **Voice recordings** - Contains personal biometric data
- **Chat logs** - Confidential student-counselor conversations
- **Biomarkers** - Health-related information (HIPAA consideration)
- **API keys** - Must be kept secure

---

## 🚀 Deployment & Infrastructure

### Development Environment
```
Frontend: http://localhost:5173 (Vite dev server)
Backend:  http://localhost:8000 (Flask dev server)
```

### Production Environment
```
Frontend: Static build (Vite) → Nginx/CDN
Backend:  Gunicorn WSGI server → Port 8000
```

### Deployment Options
| Platform | Type | Pros | Cons |
|----------|------|------|------|
| **AWS** | Cloud IaaS | Scalable, full control | Complex setup |
| **Google Cloud** | Cloud IaaS | Gemini API integration | Cost |
| **Azure** | Cloud IaaS | Enterprise features | Learning curve |
| **Heroku** | PaaS | Easy deployment | Limited free tier |
| **Vercel** | Frontend hosting | Fast, CDN | Backend separate |
| **Railway** | Full-stack PaaS | Simple, integrated | Newer platform |
| **Docker** | Containerization | Portable, consistent | Requires orchestration |

### Recommended Production Stack
```
┌─────────────────────────────────────┐
│ CDN / Static Hosting (Frontend)    │
│ - Vercel / Netlify / CloudFront    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Load Balancer (Optional)           │
│ - AWS ALB / Nginx                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Application Servers (Backend)      │
│ - Docker + Gunicorn                │
│ - Auto-scaling enabled             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Database (PostgreSQL)              │
│ - AWS RDS / Google Cloud SQL       │
└─────────────────────────────────────┘
```

---

## 📊 Development Tools

### Package Management
| Tool | Purpose | Platform |
|------|---------|----------|
| **pip** | Python packages | Backend |
| **npm/yarn/pnpm** | JavaScript packages | Frontend |
| **Virtual Environment** | Python isolation | Backend |

### Version Control
- **Git** - Source code management
- **GitHub/GitLab** - Repository hosting

### Code Quality (Recommended)
| Tool | Purpose | Language |
|------|---------|----------|
| **ESLint** | Linting | JavaScript/TypeScript |
| **Prettier** | Formatting | JavaScript/TypeScript |
| **Black** | Formatting | Python |
| **mypy** | Type checking | Python |
| **pytest** | Testing | Python |
| **Jest** | Testing | JavaScript/TypeScript |

