// Default friendly conversation prompt (kept for backwards compatibility)
export const SYSTEM_PROMPT = {
  parts: [{
    text: "You are a friendly, warm person meeting someone new. Start a natural conversation by introducing yourself and asking them about their day or how they're feeling. Keep the conversation light and engaging. Respond as if you're talking to a friend. Keep responses brief and conversational to encourage natural dialogue."
  }]
};

// Therapist persona system prompt for recorded therapy sessions
export const THERAPIST_SYSTEM_PROMPT = {
  parts: [{
    text: `You are Aawaz Guide, a calm, non‑judgmental wellbeing companion for Indian students aged 10–18.
You are not a doctor or therapist and must not diagnose or promise cures.
Your goal is to help students check in with their feelings, feel heard, and find one small helpful next step.

Reflect back what they said (“sounds like…”, “it seems that…”) before asking a new question.
Start with very easy, low‑pressure questions (yes/no, 1–5 scales, simple either/or).
If the student is very talkative and seems comfortable, you may gently ask more reflective questions.

Use open questions sparingly and make them narrow, not huge (“What’s one small thing that felt okay today?” instead of “Tell me about your life”).

While the screen is being recorded, do the following automatically during the session:

Keep responses concise (1–3 short paragraphs) so the recording is easy to follow.

Pause between major topics to allow the student to respond — use short bridging prompts like "Take your time — I'm listening" if the student is quiet.

When the student speaks, reflect key phrases back briefly (one-sentence reflection) before asking the next question.

After every 3–4 exchanges, offer a 1–2 sentence summary of what you've heard and one small helpful next step.

If a student mentions self-harm, severe harm, or safety concerns, use compassionate direct language, ask about immediate safety, and follow escalation instructions: "If you are in immediate danger or might hurt yourself, please call your local emergency number or the crisis hotline in your country." (Do not try to handle crises only via chat.)

End the recording with a 2–3 sentence recap and one clear next step the student can take.

Tone and style rules:
- Calm, non-judgmental, warm.
- Avoid giving prescriptive commands; prefer collaborative language.
- Use simple language appropriate for teenagers/students.
- Never diagnose; invite exploration instead.
- Use neutral, inclusive language.

SESSION START INSTRUCTIONS:
IMPORTANT: When a recorded check-in session begins, YOU MUST SPEAK FIRST. Do not wait for the student to speak. You should immediately:
1. Briefly introduce yourself (1–2 sentences) as Aawaz Guide.
2. Ask a gentle, easy opening question (yes/no or simple scale).
3. Keep your replies short and supportive.

Remember: pause and reflect, summarize every few exchanges, and offer a small helpful next step. Close with a 2–3 sentence recap.`
  }]
};

// Initial user message to start the recorded therapy session
export const THERAPIST_INITIAL_USER_PROMPT = `Hello — I'm going to roleplay a short, recorded therapy-style check-in. You are the therapist and I am a student. Keep your replies short and supportive. Use open questions, reflections, and one small practical suggestion every few exchanges. Start by briefly introducing yourself and asking a gentle opening question.

Also, here are 10 sample therapist questions you should cycle through naturally during the conversation (use them as prompts, not a checklist — adapt wording to the student's responses):

1. How have you been feeling lately — emotionally and mentally?
2. Can you tell me about something that's been on your mind recently?
3. What's been the most stressful part of school or life these days?
4. How do you usually cope when you're feeling overwhelmed or anxious?
5. Have you noticed any changes in your sleep, mood, or motivation?
6. Who do you usually talk to when something's bothering you?
7. Is there anything that's been making you feel proud or happy recently?
8. If you could change one thing about your current situation, what would it be?
9. What kind of support do you think would help you most right now?
10. What are some things that usually help you relax or feel better after a tough day?

Begin now: introduce yourself (1–2 sentences), ask an opening question, and wait for the student's response. Remember to pause and reflect, summarize every few exchanges, and offer a small practical suggestion during the session. Close with a 2–3 sentence recap and one clear next step.`;

// Dynamic prompt builder with counselor focus topic injection
export const buildTherapistPrompt = (
  focusTopic?: string,
  intensity: 'gentle' | 'moderate' | 'focused' = 'gentle'
): { parts: { text: string }[] } => {
  const baseText = THERAPIST_SYSTEM_PROMPT.parts[0].text;

  // If no focus topic, return original prompt
  if (!focusTopic || focusTopic.trim() === '') {
    return THERAPIST_SYSTEM_PROMPT;
  }

  const intensityInstructions = {
    gentle: `You may gently and naturally bring up topics related to "${focusTopic}" when it feels appropriate. 
This is a light suggestion - if the student doesn't seem interested, follow their lead instead.`,
    moderate: `When appropriate, guide the conversation toward "${focusTopic}". 
Try to explore this topic at least once or twice during the session, but don't force it if the student seems uncomfortable.`,
    focused: `The primary focus of this session should be on "${focusTopic}". 
While building rapport, guide most of your questions and reflections toward understanding the student's experience with this topic.
If the student seems uncomfortable, gently return to it later rather than abandoning it entirely.`,
  };

  const focusInjection = `

**COUNSELOR-DIRECTED SESSION FOCUS:**
The school counselor has specifically requested this session explore: "${focusTopic}"

${intensityInstructions[intensity]}

Additional guidelines for focused sessions:
- Don't start by immediately mentioning the focus topic - build rapport first
- Weave questions about "${focusTopic}" naturally into the conversation
- Summarize any insights related to "${focusTopic}" in your session recap
- Note any concerns the student expresses about this topic`;

  return {
    parts: [{ text: baseText + focusInjection }]
  };
};

export const calibrationQuotes = [
  "The quick brown fox jumps over the lazy dog.",
  "A journey of a thousand miles begins with a single step.",
  "The early bird catches the worm.",
  "Practice makes perfect.",
  "Where there's a will, there's a way.",
  "The pen is mightier than the sword.",
  "Actions speak louder than words.",
  "Better late than never.",
  "Don't count your chickens before they hatch.",
  "Every cloud has a silver lining.",
  "Fortune favors the bold.",
  "Good things come to those who wait.",
  "Honesty is the best policy.",
  "It's never too late to learn.",
  "Knowledge is power.",
  "Life is what you make it.",
  "No pain, no gain.",
  "Opportunity knocks but once.",
  "Patience is a virtue.",
  "Quality over quantity.",
  "Rome wasn't built in a day.",
  "Slow and steady wins the race.",
  "The best is yet to come.",
  "Time heals all wounds.",
  "United we stand, divided we fall.",
  "Variety is the spice of life.",
  "When in Rome, do as the Romans do.",
  "You can't have your cake and eat it too.",
  "A picture is worth a thousand words.",
  "Beauty is in the eye of the beholder."
];

// Statements for repeat-after-me activity
export const repeatStatements = [
  // General / Confidence
  "I am confident in my ability to succeed.",
  "I believe in myself and my potential.",
  "I am becoming stronger and more resilient every day.",
  "I have the power to create change in my life.",
  "I am worthy of respect and kindness.",
  "I choose to focus on the positive today.",
  "My voice matters and deserves to be heard.",
  "I am capable of achieving my goals.",
  "I trust my intuition and my decisions.",
  "I am proud of how far I have come.",

  // Stress & Anxiety
  "I am calm and relaxed in this moment.",
  "I breathe in peace and breathe out tension.",
  "I can handle whatever challenges come my way.",
  "One step at a time is all I need to take.",
  "My mind is clearing and my body is relaxing.",
  "I release all worry and embrace the present.",
  "I am safe and I am supported.",
  "Mistakes are simply opportunities to learn.",
  "I choose to let go of what I cannot control.",
  "I am bigger than my fears.",

  // Academic / Focus
  "I am focused and ready to learn.",
  "My mind is sharp and capable of understanding.",
  "I prepare for my tasks with calm dedication.",
  "I am making progress every single day.",
  "Challenges help me grow smarter and stronger.",
  "I trust my preparation and hard work.",
  "I celebrate my small wins along the way.",
  "I have the discipline to reach my targets.",
  "Learning is a journey and I am on the right path.",
  "I approach my studies with curiosity and energy.",

  // Sleep & Rest
  "I give myself permission to rest and recharge.",
  "My body knows how to relax and heal.",
  "I let go of the day and welcome sleep.",
  "Peace fills my mind as I prepare for rest.",
  "I am deserving of a good night's sleep.",
  "Tomorrow is a fresh start with new possibilities.",
  "I release the day's thoughts and find quiet.",
  "My bedroom is a sanctuary of peace.",
  "Resting is productive and necessary for me.",
  "I drift into sleep with a grateful heart.",

  // Social / Connection
  "I attract positive and supportive people.",
  "I am a good friend and listener.",
  "I express myself clearly and honestly.",
  "My presence makes a difference to others.",
  "I am comfortable being my authentic self.",
  "I forgive myself and others for past mistakes.",
  "I set healthy boundaries that protect my peace.",
  "I radiate kindness and it comes back to me.",
  "I am connected to the world around me.",
  "I choose to see the good in everyone I meet."
];

import type { Biomarker } from './types';

export const formatBiomarkers = (data: any): Biomarker[] => {
  // Helper function to safely get numeric values with defaults
  const getValue = (value: any, defaultValue: number = 0) => {
    return typeof value === 'number' && !isNaN(value) ? value : defaultValue;
  };

  // Extract biomarkers from nested structure or root level
  const biomarkers = data.inferred_biomarkers || data;

  const f0Mean = getValue(biomarkers.f0_mean || biomarkers.f0_mean_hz);
  const f0MeanStatus: Biomarker['status'] = f0Mean > 200 ? 'red' : f0Mean > 150 ? 'orange' : 'green';
  const f0Range = getValue(biomarkers.f0_range || biomarkers.f0_range_hz);
  const f0RangeStatus: Biomarker['status'] = f0Range < 50 ? 'red' : f0Range < 100 ? 'orange' : 'green';
  const jitter = getValue(biomarkers.jitter || biomarkers.jitter_percent);
  const jitterStatus: Biomarker['status'] = jitter > 1.0 ? 'red' : jitter > 0.5 ? 'orange' : 'green';
  const shimmer = getValue(biomarkers.shimmer || biomarkers.shimmer_percent);
  const shimmerStatus: Biomarker['status'] = shimmer > 5.0 ? 'red' : shimmer > 2.5 ? 'orange' : 'green';
  const f1 = getValue(biomarkers.f1 || biomarkers.f1_hz);
  const f2 = getValue(biomarkers.f2 || biomarkers.f2_hz);
  const speechRate = getValue(biomarkers.speech_rate || biomarkers.speech_rate_wpm);
  const speechRateStatus: Biomarker['status'] = speechRate > 200 ? 'red' : speechRate > 150 ? 'orange' : 'green';

  return [
    {
      name: "F0 Mean",
      value: `${f0Mean.toFixed(1)} Hz`,
      status: f0MeanStatus,
      detail: "Average pitch",
      explanation: "Higher values may indicate stress or tension",
      icon: 'SineWave' as const,
      normalizedValue: Math.min(f0Mean / 300, 1)
    },
    {
      name: "F0 Range",
      value: `${f0Range.toFixed(1)} Hz`,
      status: f0RangeStatus,
      detail: "Pitch variability",
      explanation: "Lower values may indicate monotone speech",
      icon: 'Range' as const,
      normalizedValue: Math.min(f0Range / 200, 1)
    },
    {
      name: "Jitter",
      value: `${jitter.toFixed(2)}%`,
      status: jitterStatus,
      detail: "Frequency perturbation",
      explanation: "Higher values indicate voice instability",
      icon: 'WavyLine' as const,
      normalizedValue: Math.min(jitter / 2, 1)
    },
    {
      name: "Shimmer",
      value: `${shimmer.toFixed(2)}%`,
      status: shimmerStatus,
      detail: "Amplitude perturbation",
      explanation: "Higher values indicate voice instability",
      icon: 'Amplitude' as const,
      normalizedValue: Math.min(shimmer / 10, 1)
    },
    {
      name: "F1",
      value: `${f1.toFixed(0)} Hz`,
      status: 'green',
      detail: "First formant",
      explanation: "Vowel quality indicator",
      icon: 'Curve1' as const,
      normalizedValue: Math.min(f1 / 1000, 1)
    },
    {
      name: "F2",
      value: `${f2.toFixed(0)} Hz`,
      status: 'green',
      detail: "Second formant",
      explanation: "Vowel quality indicator",
      icon: 'Curve2' as const,
      normalizedValue: Math.min(f2 / 2000, 1)
    },
    {
      name: "Speech Rate",
      value: `${speechRate.toFixed(0)} WPM`,
      status: speechRateStatus,
      detail: "Words per minute",
      explanation: "Speaking speed indicator",
      icon: 'Speedometer' as const,
      normalizedValue: Math.min(speechRate / 250, 1)
    }
  ];
};