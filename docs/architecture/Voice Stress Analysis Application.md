# Voice Stress Analysis Application - Data Flow Architecture

## Overview
This document describes how data flows through the Voice Stress Analysis application, from user input to final recommendations.

---

## High-Level Data Flow

```
┌──────────┐      ┌──────────┐      ┌──────────────┐      ┌──────────┐
│  User    │ ───► │ React UI │ ───► │ Flask API    │ ───► │  Praat   │
│ (Browser)│      │(Frontend)│      │ (Middleware) │      │ Analysis │
└──────────┘      └──────────┘      └──────────────┘      └──────────┘
                        │                                        │
                        │                                        ▼
                        │                              ┌──────────────────┐
                        │                              │ Voice Biomarkers │
                        │                              │ • Pitch, Jitter  │
                        │                              │ • Shimmer, HNR   │
                        │                              │ • Formants       │
                        │                              └──────────────────┘
                        │                                        │
                        ▼                                        │
                  ┌──────────────┐                              │
                  │  Gemini API  │ ◄────────────────────────────┘
                  │ (gemini-2.5) │
                  └──────────────┘
                        │
                        ▼
                  ┌──────────────────────┐
                  │ AI Recommendations   │
                  │ • Immediate Actions  │
                  │ • Long-term Plans    │
                  │ • Next Session       │
                  └──────────────────────┘
                        │
                        ▼
                  ┌──────────┐
                  │  User    │
                  │ (Results)│
                  └──────────┘
```

---

## Detailed Data Flow Sequences

### 1. Voice Recording & Upload Flow

```
User Action: Record/Upload Audio
        ↓
┌──────────────────────────────────────┐
│ Frontend (React Component)           │
│ ─────────────────────────────────    │
│ 1. Capture audio via browser API     │
│ 2. Convert to compatible format      │
│ 3. Create FormData with audio file   │
│ 4. Add metadata (duration, format)   │
└──────────────────────────────────────┘
        ↓
        │ HTTP POST Request
        │ Endpoint: /extract_features
        │ Content-Type: multipart/form-data
        │ Body: { audio: File, metadata: JSON }
        ↓
┌──────────────────────────────────────┐
│ Flask API (app.py)                   │
│ ──────────────────────────────       │
│ 1. Receive request                   │
│ 2. Validate CORS headers             │
│ 3. Extract audio file                │
│ 4. Validate file format              │
│ 5. Save temporary file               │
└──────────────────────────────────────┘
        ↓
        │ File Path
        ↓
┌──────────────────────────────────────┐
│ Praat-parselmouth Analysis           │
│ ──────────────────────────────────   │
│ 1. Load audio file                   │
│ 2. Extract pitch (F0)                │
│ 3. Calculate formants (F1-F4)        │
│ 4. Measure jitter                    │
│ 5. Measure shimmer                   │
│ 6. Calculate HNR                     │
│ 7. Analyze intensity                 │
│ 8. Compute duration metrics          │
└──────────────────────────────────────┘
        ↓
        │ Biomarker Dictionary
        │ {
        │   "pitch": 150.5,
        │   "jitter": 0.02,
        │   "shimmer": 0.05,
        │   "hnr": 15.3,
        │   "formants": [650, 1720, 2410, 3350],
        │   "intensity": 70.2,
        │   "duration": 5.2
        │ }
        ↓
┌──────────────────────────────────────┐
│ NumPy/SciPy Processing               │
│ ──────────────────────────────       │
│ 1. Normalize values                  │
│ 2. Calculate stress indicators       │
│ 3. Statistical analysis              │
│ 4. Generate stress score (0-100)    │
└──────────────────────────────────────┘
        ↓
        │ JSON Response
        │ {
        │   "biomarkers": {...},
        │   "stressLevel": 65,
        │   "status": "success"
        │ }
        ↓
┌──────────────────────────────────────┐
│ Frontend Receives Response           │
│ ──────────────────────────────────   │
│ 1. Parse JSON                        │
│ 2. Update component state            │
│ 3. Render results                    │
└──────────────────────────────────────┘
```

---

### 2. AI Recommendation Generation Flow

```
Biomarker Results Available
        ↓
┌──────────────────────────────────────┐
│ PostAnalysisSuggestionsScreen.tsx    │
│ ──────────────────────────────────   │
│ 1. Receive analysis data             │
│ 2. Extract stress level              │
│ 3. Identify problematic biomarkers   │
│ 4. Gather context data:              │
│    • AI summary                      │
│    • Live session answers            │
│    • Questionnaire responses         │
└──────────────────────────────────────┘
        ↓
        │ generateSuggestionsWithGemini()
        ↓
┌──────────────────────────────────────┐
│ Prepare Gemini API Request           │
│ ──────────────────────────────────   │
│ Build prompt with:                   │
│ • Stress level (0-100)               │
│ • Biomarker statuses (red/orange)    │
│ • AI summary text                    │
│ • Student's live answers (priority)  │
│ • Pre-session questionnaire          │
│ • Formatting instructions            │
└──────────────────────────────────────┘
        ↓
        │ HTTPS POST Request
        │ URL: generativelanguage.googleapis.com
        │ Model: gemini-2.5-pro
        │ API Key: VITE_GEMINI_API_KEY
        ↓
┌──────────────────────────────────────┐
│ Google Gemini API Processing         │
│ ──────────────────────────────────   │
│ 1. Analyze stress context            │
│ 2. Interpret biomarkers              │
│ 3. Consider student responses        │
│ 4. Generate personalized advice      │
│ 5. Format output as requested        │
└──────────────────────────────────────┘
        ↓
        │ API Response (JSON)
        │ {
        │   "candidates": [{
        │     "content": {
        │       "parts": [{
        │         "text": "IMMEDIATE ACTIONS:\n1. ..."
        │       }]
        │     }
        │   }]
        │ }
        ↓
┌──────────────────────────────────────┐
│ Parse Gemini Response                │
│ ──────────────────────────────────   │
│ 1. Extract text content              │
│ 2. Parse sections:                   │
│    • IMMEDIATE ACTIONS (max 3)       │
│    • LONG-TERM WELLNESS (max 3)      │
│    • NEXT SESSION (3/7/14 days)      │
│ 3. Validate format                   │
│ 4. Handle errors/fallback            │
└──────────────────────────────────────┘
        ↓
        │ Structured Data
        │ {
        │   immediate: [string, string, string],
        │   longTerm: [string, string, string],
        │   nextSession: number
        │ }
        ↓
┌──────────────────────────────────────┐
│ Display Recommendations              │
│ ──────────────────────────────────   │
│ 1. Render immediate actions list     │
│ 2. Display long-term strategies      │
│ 3. Show next session recommendation  │
│ 4. Include positive affirmation      │
└──────────────────────────────────────┘
```

---

### 3. Live Session Chat Flow

```
Student & Counselor Active
        ↓
┌──────────────────────────────────────┐
│ Stream Chat Integration              │
│ ──────────────────────────────────   │
│ 1. Initialize Stream Chat client     │
│ 2. Create/join chat channel          │
│ 3. Enable real-time messaging        │
└──────────────────────────────────────┘
        ↓
        │ WebSocket Connection
        │ (Stream Chat SDK)
        ↓
┌──────────────────────────────────────┐
│ Message Exchange                     │
│ ──────────────────────────────────   │
│ Counselor asks questions             │
│         ↕                            │
│ Student provides answers             │
└──────────────────────────────────────┘
        ↓
        │ Store conversation data
        │ {
        │   questionText: string,
        │   studentAnswer: string,
        │   timestamp: Date
        │ }
        ↓
┌──────────────────────────────────────┐
│ Pass to Gemini API                   │
│ ──────────────────────────────────   │
│ Use live session answers as          │
│ HIGHEST PRIORITY CONTEXT for         │
│ generating personalized suggestions  │
└──────────────────────────────────────┘
```

---

### 4. Pre-Session Questionnaire Flow

```
User Starts Session
        ↓
┌──────────────────────────────────────┐
│ Questionnaire Component              │
│ ──────────────────────────────────   │
│ 1. Display questions                 │
│ 2. Collect user responses            │
│ 3. Validate inputs                   │
│ 4. Store answers locally             │
└──────────────────────────────────────┘
        ↓
        │ Questionnaire Data
        │ {
        │   [questionIndex]: answer,
        │   [questionIndex]: answer,
        │   ...
        │ }
        ↓
┌──────────────────────────────────────┐
│ Analysis Phase                       │
│ ──────────────────────────────────   │
│ 1. Combine with voice analysis       │
│ 2. Add context to Gemini prompt      │
│ 3. Use as secondary context          │
│    (after live session answers)      │
└──────────────────────────────────────┘
```

---

## Data Structures

### 1. Analysis Data Structure
```typescript
interface AnalysisData {
  biomarkers: {
    pitch: number;
    jitter: number;
    shimmer: number;
    hnr: number;
    formants: number[];
    intensity: number;
    duration: number;
  };
  stressLevel: number; // 0-100
  aiSummary?: string;
  timestamp: Date;
}
```

### 2. Biomarker Structure
```typescript
interface Biomarker {
  name: string;
  value: number;
  unit: string;
  status: 'red' | 'orange' | 'green';
  normalRange: [number, number];
}
```

### 3. Suggestion Structure
```typescript
interface Suggestions {
  immediate: string[]; // max 3
  longTerm: string[];  // max 3
  nextSession: number; // 3, 7, or 14 days
}
```

### 4. Live Session Answer Structure
```typescript
interface LiveSessionAnswer {
  questionText: string;
  studentAnswer: string;
  timestamp: Date;
}
```

---

## Data Transformation Pipeline

### Audio → Biomarkers
```
Raw Audio (WAV/MP3)
    ↓ [Praat-parselmouth]
Acoustic Features (pitch, formants, etc.)
    ↓ [NumPy/SciPy]
Normalized Values
    ↓ [Statistical Analysis]
Stress Indicators
    ↓ [Calculation]
Stress Score (0-100)
```

### Biomarkers → Recommendations
```
Biomarker Values + Stress Level
    ↓ [Context Gathering]
+ Live Session Answers
+ Questionnaire Responses
+ AI Summary
    ↓ [Prompt Engineering]
Structured Prompt for Gemini
    ↓ [Gemini API]
AI-Generated Text
    ↓ [Parsing]
Structured Suggestions
    ↓ [Rendering]
User-Facing Recommendations
```

---

## Error Handling Flow

```
Error Occurs
    ↓
┌──────────────────────────────────────┐
│ Error Detection                      │
│ ──────────────────────────────────   │
│ • API failure                        │
│ • Invalid audio format               │
│ • Gemini API error                   │
│ • Network timeout                    │
└──────────────────────────────────────┘
    ↓
    │ Error Type?
    ├─► Voice Analysis Error
    │       ↓
    │   Return error message
    │   "Unable to analyze audio"
    │
    ├─► Gemini API Error
    │       ↓
    │   Use fallback suggestions
    │   getFallbackSuggestions()
    │
    └─► Network Error
            ↓
        Retry mechanism
        Show user-friendly message
```

---

## Data Storage (Current vs. Needed)

### Currently Implemented
| Data Type | Storage Method | Duration |
|-----------|---------------|----------|
| Audio Files | Temporary (backend) | Session only |
| Analysis Results | React State | Session only |
| Suggestions | React State | Session only |

### Recommended Implementation
| Data Type | Storage Method | Duration |
|-----------|---------------|----------|
| User Profiles | Database | Permanent |
| Session History | Database | Permanent |
| Audio Files | Cloud Storage (S3/GCS) | Configurable |
| Analysis Results | Database | Permanent |
| Chat Logs | Database | Permanent |
| Questionnaire Responses | Database | Permanent |

---

## Performance Considerations

### Bottlenecks
1. **Audio Upload**: Large file sizes
2. **Praat Analysis**: CPU-intensive processing
3. **Gemini API**: Network latency, rate limits
4. **Real-time Chat**: WebSocket connection stability

### Optimization Strategies
1. **Audio Compression**: Reduce file size before upload
2. **Async Processing**: Use background tasks for analysis
3. **Caching**: Store frequently accessed results
4. **Rate Limiting**: Implement client-side throttling
5. **Connection Pooling**: Reuse HTTP connections

---

## Security & Privacy in Data Flow

### Sensitive Data Points
1. **Audio recordings** - Personal voice data
2. **Biomarkers** - Health-related information
3. **Chat logs** - Confidential conversations
4. **API keys** - System credentials
5. **User responses** - Personal information

### Protection Measures
| Data Type | Protection Method |
|-----------|------------------|
| Audio Files | Encrypted storage, temporary deletion |
| API Keys | Environment variables, never in code |
| Personal Data | HTTPS transmission, access controls |
| Chat Logs | Encrypted database, limited retention |
| Biomarkers | Anonymized for analytics |

---

## Data Flow Monitoring Points

### Key Metrics to Track
1. **API Response Times**
   - Flask endpoint latency
   - Gemini API latency
   - Total request duration

2. **Processing Times**
   - Praat analysis duration
   - NumPy computation time

3. **Success Rates**
   - Voice analysis success %
   - Gemini API success %
   - Overall session completion %

4. **Data Volumes**
   - Audio file sizes
   - Number of sessions/day
   - Biomarker extraction rate

---

**Document Version**: 1.0  
**Last Updated**: January 4, 2026  
**Maintained By**: Development Team