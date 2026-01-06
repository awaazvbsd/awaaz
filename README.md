# Voice Stress Analysis Interface v2.0 with Praat Integration

A sophisticated voice stress analysis application that uses Praat phonetics analysis instead of Meyda for more accurate voice feature extraction, integrated with Google's Gemini AI for comprehensive stress level assessment.

## 🚀 Features

- **Advanced Voice Analysis**: Uses Praat/Parselmouth for professional-grade phonetic analysis
- **Comprehensive Feature Extraction**: 
  - Pitch analysis (F0 mean, range, jitter)
  - Amplitude analysis (shimmer, RMS energy)
  - Spectral analysis (centroid, flatness, MFCCs)
  - Formant analysis (F1, F2)
  - Speech rate estimation
- **Personal Baseline Calibration**: Establish your calm voice baseline for accurate stress detection
- **AI-Powered Analysis**: Google Gemini AI analyzes extracted features for stress level assessment
- **Modern UI**: Beautiful, responsive interface with real-time visualizations
- **Real-time Recording**: Live waveform visualization during recording

## 🏗️ Architecture

The application consists of two main components:

1. **Frontend (React/TypeScript)**: User interface for recording and displaying results
2. **Backend (Python/Flask)**: Praat-based audio processing service

## 📋 Prerequisites

### Frontend Requirements
- Node.js 18+ and npm
- Modern web browser with microphone access

### Backend Requirements
- Python 3.8 or higher
- pip package manager

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

**Windows:**
```bash
start-app.bat
```

**Linux/Mac:**
```bash
chmod +x start-app.sh
./start-app.sh
```

### Option 2: Manual Setup

1. **Start the Backend:**
   ```bash
   cd backend
   python start.py
   ```
   The backend will be available at `http://localhost:8000`

2. **Start the Frontend:**
   ```bash
   npm install
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:
```env
API_KEY=your_gemini_api_key_here
```

### Backend Configuration

The backend automatically creates a `.env` file in the `backend/` directory with default settings.

## 📊 How It Works

1. **Calibration Phase**: Record 3 calm voice samples to establish your personal baseline
2. **Recording Phase**: Record a 10-second voice sample for analysis
3. **Processing Phase**: 
   - Audio is sent to the Praat backend for feature extraction
   - Extracted features are sent to Gemini AI for stress analysis
4. **Results Phase**: View detailed stress level and biomarker analysis

## 🎯 Voice Features Analyzed

### Praat-Extracted Features
- **RMS Energy**: Overall loudness/energy
- **Zero Crossing Rate**: Noise and sibilance detection
- **Spectral Centroid**: Voice brightness
- **Spectral Flatness**: Tonality measure
- **MFCCs**: Mel-frequency cepstral coefficients
- **F0 Mean**: Average fundamental frequency (pitch)
- **F0 Range**: Pitch variability
- **Jitter**: Pitch perturbation percentage
- **Shimmer**: Amplitude perturbation percentage
- **F1/F2 Formants**: Vocal tract resonances
- **Speech Rate**: Words per minute estimation

### AI-Analyzed Biomarkers
- Stress level (0-100)
- Confidence score
- Signal-to-noise ratio
- Detailed explanations for each biomarker

## 🛠️ Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
export FLASK_ENV=development
export FLASK_DEBUG=True
python app.py
```

### Frontend Development
```bash
npm install
npm run dev
```

### Building for Production
```bash
npm run build
```

## 📁 Project Structure

```
voice-stress-analysis-interface/
├── backend/
│   ├── app.py              # Flask backend with Praat integration
│   ├── requirements.txt    # Python dependencies
│   ├── start.py           # Backend startup script
│   └── README.md          # Backend documentation
├── components/
│   ├── CalibrationScreen.tsx  # Baseline calibration interface
│   ├── RecordingScreen.tsx    # Main recording interface
│   └── ...                   # Other UI components
├── start-app.bat          # Windows startup script
├── start-app.sh           # Linux/Mac startup script
└── README.md              # This file
```

## 🔍 API Endpoints

### Backend API

- `POST /api/analyze-audio` - Analyze audio file and extract features
- `GET /api/health` - Health check endpoint

### Request Format
```javascript
// Upload audio file for analysis
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');

const response = await fetch('http://localhost:8000/api/analyze-audio', {
  method: 'POST',
  body: formData,
});
```

### Response Format
```json
{
  "success": true,
  "features": {
    "rms": 0.123,
    "zcr": 0.045,
    "spectralCentroid": 1200.5,
    "spectralFlatness": 0.123,
    "mfcc": [0.1, 0.2, ...],
    "f0_mean": 150.5,
    "f0_range": 45.2,
    "jitter": 1.2,
    "shimmer": 3.4,
    "f1": 720.3,
    "f2": 1250.8,
    "speech_rate": 155
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Backend not starting**
   - Ensure Python 3.8+ is installed
   - Check that all dependencies are installed: `pip install -r backend/requirements.txt`

2. **Audio analysis fails**
   - Verify microphone permissions
   - Ensure audio file is valid and contains speech
   - Check that the backend is running on port 8000

3. **CORS errors**
   - The backend is configured with CORS support
   - Ensure frontend is running on localhost:3000

4. **Gemini API errors**
   - Verify your API key is set in the `.env` file
   - Check your Gemini API quota and billing

### Debug Mode

Enable debug logging by setting environment variables:
```bash
export FLASK_DEBUG=True
export FLASK_ENV=development
```

## 📈 Performance Considerations

- **Audio Processing**: Praat analysis may take 1-3 seconds depending on audio length
- **File Size**: Maximum upload size is 16MB
- **Supported Formats**: WAV, WebM, MP3, OGG

## 🔒 Security

- Audio files are processed temporarily and deleted after analysis
- No audio data is permanently stored
- API keys should be kept secure and not committed to version control

## 📝 License

This project is for educational and research purposes. Please ensure compliance with applicable laws and regulations when using voice stress analysis technology.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the backend and frontend logs
3. Create an issue with detailed error information