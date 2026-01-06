from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import numpy as np
import scipy.signal as signal
import warnings
import os
from stream_chat import StreamChat
import parselmouth
warnings.filterwarnings('ignore')


app = Flask(__name__)

# Configure CORS - Allow all origins in development, or specify allowed origins via environment variable
# In production, set ALLOWED_ORIGINS to your Vercel domain, e.g., "https://your-app.vercel.app"
allowed_origins = os.environ.get('ALLOWED_ORIGINS', '*')
if allowed_origins != '*':
    # Split by comma for multiple origins
    allowed_origins = [origin.strip() for origin in allowed_origins.split(',')]
CORS(app, origins=allowed_origins, supports_credentials=True)

# Stream Chat configuration
STREAM_API_KEY = "kt3cr78evu5y"
STREAM_API_SECRET = "kpfebwva7mvhp3wwwv8cynfgeemdrf7wkrexszr8zhz4p8nj2gnjr5jy4tadsamb"

# Initialize Stream Chat server client
stream_client = StreamChat(api_key=STREAM_API_KEY, api_secret=STREAM_API_SECRET)


def compute_basic_features(samples: np.ndarray, sample_rate: int) -> dict:
	"""Compute RMS, ZCR, Spectral Centroid, Spectral Flatness from mono PCM samples."""
	# Ensure float64 for calculations
	x = samples.astype(np.float64)
	# RMS
	rms = float(np.sqrt(np.mean(np.square(x)))) if x.size > 0 else 0.0
	# ZCR
	zero_crossings = np.sum(np.abs(np.diff(np.signbit(x))))
	zcr = float(zero_crossings) / float(x.size - 1) if x.size > 1 else 0.0
	# Power spectrum for spectral features
	if x.size == 0:
		return {"rms": 0.0, "zcr": 0.0, "spectralCentroid": 0.0, "spectralFlatness": 0.0}
	# Use periodogram for stable estimate
	freqs, psd = signal.periodogram(x, fs=sample_rate, scaling="spectrum", window="hann")
	psd = np.maximum(psd, 1e-20)  # avoid log(0)
	# Spectral centroid
	centroid = float(np.sum(freqs * psd) / np.sum(psd)) if np.sum(psd) > 0 else 0.0
	# Spectral flatness (geometric mean / arithmetic mean)
	geom_mean = float(np.exp(np.mean(np.log(psd))))
	arith_mean = float(np.mean(psd)) if psd.size > 0 else 0.0
	flatness = float(geom_mean / arith_mean) if arith_mean > 0 else 0.0
	return {
		"rms": rms,
		"zcr": zcr,
		"spectralCentroid": centroid,
		"spectralFlatness": flatness,
	}


def extract_praat_features(samples: np.ndarray, sample_rate: int) -> dict:
	"""Extract advanced voice features using Praat/Parselmouth."""
	try:
		# Create Praat Sound object from numpy array
		sound = parselmouth.Sound(samples, sampling_frequency=sample_rate)
		duration = sound.duration
		
		# Extract Pitch (F0)
		pitch = sound.to_pitch_ac(
			time_step=0.01,
			pitch_floor=50.0,
			pitch_ceiling=600.0
		)
		
		# Get F0 statistics
		f0_values = []
		f0_mean = 0.0
		f0_std = 0.0
		f0_min = 0.0
		f0_max = 0.0
		f0_range = 0.0
		
		if pitch:
			# Extract F0 values (excluding unvoiced frames)
			for t in np.arange(0, duration, 0.01):
				f0 = pitch.get_value_at_time(t)
				if f0 is not None and f0 > 0:
					f0_values.append(f0)
			
			if len(f0_values) > 0:
				f0_array = np.array(f0_values)
				f0_mean = float(np.mean(f0_array))
				f0_std = float(np.std(f0_array))
				f0_min = float(np.min(f0_array))
				f0_max = float(np.max(f0_array))
				f0_range = f0_max - f0_min
			else:
				f0_mean = 0.0
				f0_range = 0.0
		else:
			f0_mean = 0.0
			f0_range = 0.0
		
		# Extract Formants (F1, F2)
		formant = sound.to_formant_burg(
			time_step=0.01,
			max_number_of_formants=5.0,
			maximum_formant=5500.0
		)
		
		f1_values = []
		f2_values = []
		f1_mean = 0.0
		f2_mean = 0.0
		
		if formant:
			for t in np.arange(0, duration, 0.01):
				f1 = formant.get_value_at_time(formant_number=1, time=t)
				f2 = formant.get_value_at_time(formant_number=2, time=t)
				if f1 is not None and f1 > 0:
					f1_values.append(f1)
				if f2 is not None and f2 > 0:
					f2_values.append(f2)
			
			if len(f1_values) > 0:
				f1_mean = float(np.mean(f1_values))
			if len(f2_values) > 0:
				f2_mean = float(np.mean(f2_values))
		
		# Extract PointProcess (pulses) for jitter and shimmer
		point_process = None
		jitter = 0.0
		shimmer = 0.0
		
		try:
			# Create PointProcess using Praat script
			point_process = parselmouth.praat.call(sound, "To PointProcess (periodic, cc)", 50.0, 600.0)
			
			if point_process:
				n_pulses = parselmouth.praat.call(point_process, "Get number of points")
				
				# Calculate Jitter (local, absolute)
				if n_pulses > 1:
					try:
						jitter = parselmouth.praat.call(point_process, "Get jitter (local)", 0.0, duration, 0.0001, 0.02, 1.3)
						jitter = float(jitter * 100.0)  # Convert to percentage
					except:
						jitter = 0.0
					
					# Calculate Shimmer (local, relative)
					try:
						shimmer = parselmouth.praat.call([sound, point_process], "Get shimmer (local)", 0.0, duration, 0.0001, 0.02, 1.3, 1.6)
						shimmer = float(shimmer * 100.0)  # Convert to percentage
					except:
						shimmer = 0.0
		except Exception as e:
			print(f"Warning: Could not extract jitter/shimmer: {str(e)}")
			jitter = 0.0
			shimmer = 0.0
		
		# Estimate speech rate (rough estimate based on voiced segments)
		speech_rate = 0.0
		if len(f0_values) > 0:
			# Estimate based on voiced frames and duration
			# Rough approximation: assume average word length
			voiced_frames = len(f0_values)
			voiced_duration = voiced_frames * 0.01
			# Estimate words per minute (rough heuristic)
			words_estimate = voiced_duration / 0.5  # Assume ~0.5 seconds per word average
			speech_rate = float((words_estimate / duration) * 60) if duration > 0 else 0.0
			# Clamp to reasonable range
			speech_rate = max(80, min(200, speech_rate))
		
		return {
			"f0_mean": f0_mean,
			"f0_range": f0_range,
			"jitter": jitter,
			"shimmer": shimmer,
			"f1": f1_mean,
			"f2": f2_mean,
			"speech_rate": speech_rate,
		}
	except Exception as e:
		print(f"Error in Praat extraction: {str(e)}")
		# Return defaults if Praat extraction fails
		return {
			"f0_mean": 0.0,
			"f0_range": 0.0,
			"jitter": 0.0,
			"shimmer": 0.0,
			"f1": 0.0,
			"f2": 0.0,
			"speech_rate": 0.0,
		}


def compute_mfcc(samples: np.ndarray, sample_rate: int, num_coeffs: int = 13) -> list[float]:
	"""Compute MFCCs using scipy FFT and mel filterbank."""
	try:
		# Simple MFCC-like features using FFT and mel-scale approximation
		fft = np.fft.fft(samples)
		magnitude = np.abs(fft[:len(fft)//2])
		
		# Simple mel-like filterbank approximation
		mfccs = []
		for i in range(num_coeffs):
			start = int((i * len(magnitude)) / num_coeffs)
			end = int(((i + 1) * len(magnitude)) / num_coeffs)
			coeff = float(np.mean(magnitude[start:end])) if end > start else 0.0
			mfccs.append(coeff)
		
		return mfccs
	except:
		# Fallback to zeros if computation fails
		return [0.0] * num_coeffs


@app.route("/health", methods=["GET"])  # simple health check
def health():
	return jsonify({"status": "ok"})


@app.route("/stream-chat-token", methods=["POST"])
def generate_stream_token():
	"""Generate a Stream Chat JWT token for a user."""
	try:
		data = request.get_json()
		if not data or "userId" not in data:
			return jsonify({"error": "userId is required"}), 400
		
		userId = data["userId"]
		userName = data.get("userName", f"User {userId}")
		
		# Create or update user in Stream Chat with proper role
		# Give teachers (ID 9999) admin role so they can create channels
		role = "admin" if userId == "9999" else "user"
		stream_client.update_user({
			"id": userId,
			"name": userName,
			"role": role,
		})
		
		# Generate JWT token
		token = stream_client.create_token(userId)
		
		return jsonify({
			"token": token,
			"userId": userId,
			"userName": userName
		})
	except Exception as e:
		return jsonify({"error": str(e)}), 500


@app.route("/stream-chat-channel", methods=["POST"])
def create_stream_channel():
	"""Create a Stream Chat channel server-side (with admin permissions)."""
	try:
		data = request.get_json()
		if not data:
			return jsonify({"error": "Request body required"}), 400
		
		teacher_id = data.get("teacherId")
		student_id = data.get("studentId")
		
		if not teacher_id or not student_id:
			return jsonify({"error": "teacherId and studentId are required"}), 400
		
		channel_id = f"teacher-{teacher_id}-student-{student_id}"
		
		# Ensure both users exist
		stream_client.update_user({"id": teacher_id, "name": f"Teacher {teacher_id}", "role": "admin"})
		stream_client.update_user({"id": student_id, "name": f"Student {student_id}"})
		
		# Create channel server-side with admin permissions
		channel = stream_client.channel("messaging", channel_id, {
			"members": [teacher_id, student_id],
			"created_by_id": teacher_id,
		})
		channel.create(teacher_id)
		
		return jsonify({
			"channelId": channel_id,
			"success": True
		})
	except Exception as e:
		# Channel may already exist, which is fine
		if "already exists" in str(e).lower():
			return jsonify({
				"channelId": f"teacher-{data.get('teacherId')}-student-{data.get('studentId')}",
				"success": True,
				"existed": True
			})
		return jsonify({"error": str(e)}), 500


@app.route("/extract_features", methods=["POST"])
def extract_features():
	"""Accept a WAV file and return features computed with Praat/Parselmouth."""
	if "file" not in request.files:
		return jsonify({"error": "file field missing"}), 400
	file = request.files["file"]
	data = file.read()
	if not data:
		return jsonify({"error": "empty file"}), 400
	try:
		# Simple WAV file reading (assumes 16-bit PCM, mono)
		# Skip WAV header (44 bytes) and read audio data
		audio_data = data[44:]
		samples = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
		sample_rate = 16000  # Assuming 16kHz as per our conversion
		
		# Compute basic features (RMS, ZCR, Spectral features, MFCC)
		basic = compute_basic_features(samples, sample_rate)
		mfcc = compute_mfcc(samples, sample_rate, num_coeffs=13)
		
		# Extract advanced Praat features (F0, jitter, shimmer, formants)
		praat_features = extract_praat_features(samples, sample_rate)
		
		# Print extracted features to terminal/console
		print("\n" + "="*50)
		print("PRAAT EXTRACTED FEATURES")
		print("="*50)
		print("Basic Features:")
		print(f"  RMS (energy/loudness): {basic['rms']:.6f}")
		print(f"  ZCR (noise/sibilance): {basic['zcr']:.6f}")
		print(f"  Spectral Centroid (brightness): {basic['spectralCentroid']:.2f} Hz")
		print(f"  Spectral Flatness (tonality): {basic['spectralFlatness']:.6f}")
		print(f"  MFCCs: {mfcc[:5]}... (first 5 of 13)")
		print("\nPraat Advanced Features:")
		print(f"  F0 Mean (pitch): {praat_features['f0_mean']:.2f} Hz")
		print(f"  F0 Range: {praat_features['f0_range']:.2f} Hz")
		print(f"  Jitter: {praat_features['jitter']:.2f}%")
		print(f"  Shimmer: {praat_features['shimmer']:.2f}%")
		print(f"  F1 (First Formant): {praat_features['f1']:.2f} Hz")
		print(f"  F2 (Second Formant): {praat_features['f2']:.2f} Hz")
		print(f"  Speech Rate: {praat_features['speech_rate']:.1f} WPM")
		print(f"\nAudio Info:")
		print(f"  Sample Rate: {sample_rate} Hz")
		print(f"  Number of Samples: {len(samples)}")
		print(f"  Duration: {len(samples) / sample_rate:.2f} seconds")
		print("="*50 + "\n")
		
		# Return combined features
		return jsonify({
			# Basic features
			"rms": basic["rms"],
			"zcr": basic["zcr"],
			"spectralCentroid": basic["spectralCentroid"],
			"spectralFlatness": basic["spectralFlatness"],
			"mfcc": mfcc,
			# Praat advanced features
			"f0_mean": praat_features["f0_mean"],
			"f0_range": praat_features["f0_range"],
			"jitter": praat_features["jitter"],
			"shimmer": praat_features["shimmer"],
			"f1": praat_features["f1"],
			"f2": praat_features["f2"],
			"speech_rate": praat_features["speech_rate"],
		})
	except Exception as e:
		print(f"Error in extract_features: {str(e)}")
		import traceback
		traceback.print_exc()
		return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
	# Disable Flask's automatic .env loading to avoid encoding issues
	import os
	os.environ['FLASK_SKIP_DOTENV'] = '1'
	
	app.run(host="0.0.0.0", port=8000, debug=True)