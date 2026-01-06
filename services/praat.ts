import { BACKEND_URL } from '../config';

export type PraatFeatures = {
	// Basic features
	rms: number;
	zcr: number;
	spectralCentroid: number;
	spectralFlatness: number;
	mfcc: number[];
	// Praat advanced features (directly extracted)
	f0_mean?: number;
	f0_range?: number;
	jitter?: number;
	shimmer?: number;
	f1?: number;
	f2?: number;
	speech_rate?: number;
};

export async function extractFeaturesWithPraat(wavBlob: Blob, baseUrl = BACKEND_URL): Promise<PraatFeatures> {
	const form = new FormData();
	form.append('file', wavBlob, 'audio.wav');
	const res = await fetch(`${baseUrl}/extract_features`, { method: 'POST', body: form });
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Praat extraction failed: ${res.status} ${text}`);
	}
	return await res.json();
}


