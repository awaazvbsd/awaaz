# Praat Voice Analysis Backend

This backend service integrates Praat phonetics analysis capabilities to replace Meyda in the voice stress analysis interface.

## Features

- **Comprehensive Voice Analysis**: Uses Parselmouth (Praat Python library) for advanced phonetic analysis
- **Feature Extraction**: Extracts pitch, formants, jitter, shimmer, spectral features, and MFCCs
- **REST API**: Simple HTTP API for audio file upload and analysis
- **CORS Support**: Configured for frontend integration

## Setup

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Run the setup script:
   ```bash
   python start.py
   ```

   Or manually:
   ```bash
   pip install -r requirements.txt
   python app.py
   ```

### Environment Variables

Create a `.env` file in the backend directory with any required configuration:

```env
FLASK_ENV=development
FLASK_DEBUG=True
```

## API Endpoints

### POST /api/analyze-audio

Analyzes an audio file and returns extracted voice features.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: audio file (wav, webm, mp3, ogg)

**Response:**
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

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "praat-voice-analysis"
}
```

## Extracted Features

The backend extracts the following voice features using Praat:

- **RMS**: Root Mean Square energy
- **ZCR**: Zero Crossing Rate
- **Spectral Centroid**: Brightness of the voice
- **Spectral Flatness**: Measure of tonality
- **MFCC**: Mel-Frequency Cepstral Coefficients
- **F0 Mean**: Average fundamental frequency (pitch)
- **F0 Range**: Pitch variability
- **Jitter**: Pitch perturbation
- **Shimmer**: Amplitude perturbation
- **F1, F2**: First and second formants
- **Speech Rate**: Words per minute (estimated)

## Development

To run in development mode:

```bash
export FLASK_ENV=development
export FLASK_DEBUG=True
python app.py
```

The server will start on `http://localhost:5000`

## Production Deployment

For production deployment, use a WSGI server like Gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## Troubleshooting

### Common Issues

1. **ImportError: No module named 'parselmouth'**
   - Make sure all dependencies are installed: `pip install -r requirements.txt`

2. **Audio file format not supported**
   - Supported formats: wav, webm, mp3, ogg
   - Convert your audio file to a supported format

3. **Analysis fails**
   - Check that the audio file is valid and contains speech
   - Ensure the file size is under 16MB

### Logs

The application logs errors and debugging information to the console. In production, configure proper logging.






