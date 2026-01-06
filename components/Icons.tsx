
import React from 'react';

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 1.5,
  stroke: "currentColor",
};

export const ChevronLeft: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

export const QuestionMarkCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
);

export const Microphone: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5a6 6 0 00-12 0v1.5a6 6 0 006 6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75V18.75m0 0A3 3 0 0112 21.75a3 3 0 01-3-3h6zM12 5.25A3.75 3.75 0 008.25 9v.75a3.75 3.75 0 007.5 0V9A3.75 3.75 0 0012 5.25z" />
  </svg>
);

// Filled microphone icon (based on start session button)
export const MicrophoneFilled: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
    <path d="M256 32c-44.2 0-80 35.8-80 80v160c0 44.2 35.8 80 80 80s80-35.8 80-80V112c0-44.2-35.8-80-80-80z" />
    <path d="M128 240v32c0 70.7 57.3 128 128 128s128-57.3 128-128v-32c0-8.8 7.2-16 16-16s16 7.2 16 16v32c0 83.5-63.8 152.1-145.5 159.5V496h65.5c8.8 0 16 7.2 16 16s-7.2 16-16 16h-160c-8.8 0-16-7.2-16-16s7.2-16 16-16h65.5v-64.5C160.8 424.1 97 355.5 97 272v-32c0-8.8 7.2-16 16-16s16 7.2 16 16z" />
  </svg>
);

// Outlined microphone icon (stroke only, no fill) - for recording screen
export const MicrophoneOutlined: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className} fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
    <path d="M256 32c-44.2 0-80 35.8-80 80v160c0 44.2 35.8 80 80 80s80-35.8 80-80V112c0-44.2-35.8-80-80-80z" />
    <path d="M128 240v32c0 70.7 57.3 128 128 128s128-57.3 128-128v-32c0-8.8 7.2-16 16-16s16 7.2 16 16v32c0 83.5-63.8 152.1-145.5 159.5V496h65.5c8.8 0 16 7.2 16 16s-7.2 16-16 16h-160c-8.8 0-16-7.2-16-16s7.2-16 16-16h65.5v-64.5C160.8 424.1 97 355.5 97 272v-32c0-8.8 7.2-16 16-16s16 7.2 16 16z" />
  </svg>
);

export const MicrophoneWithWaves: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5a6 6 0 00-12 0v1.5a6 6 0 006 6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75V18.75m0 0A3 3 0 0112 21.75a3 3 0 01-3-3h6zM12 5.25A3.75 3.75 0 008.25 9v.75a3.75 3.75 0 007.5 0V9A3.75 3.75 0 0012 5.25z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h.008M3.75 12a8.25 8.25 0 0016.5 0h.008M3.75 12a8.25 8.25 0 0116.5 0M20.25 12h-.008" />
  </svg>
);


export const Info: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const Play: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
);

export const Pause: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-6-13.5v13.5" />
  </svg>
);

export const Bookmark: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.5 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
  </svg>
);

export const Share: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 100-2.186m0 2.186c-.18.324-.283.696-.283 1.093s.103.77.283 1.093m-9.566-7.5c.18.324.283.696.283 1.093s-.103.77-.283 1.093" />
  </svg>
);

export const UserCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

export const Eye: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

export const EyeSlash: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243l-4.243-4.243" /></svg>
);

export const Calendar: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h18" /></svg>
);

export const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.696L7.985 5.985m0 0v4.992m0 0h4.992" />
  </svg>
);

export const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
  </svg>
);

export const ShuffleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 4l3 3l-3 3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 20l3 -3l-3 -3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17h3a5 5 0 0 0 5 -5a5 5 0 0 1 5 -5h3" />
  </svg>
);

export const FilterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10m-7 8h4" />
  </svg>
);

// New Base Icon for Glowing Dot Matrix style
const GlowingDotMatrixIcon: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g filter="url(#glow)" className="text-purple-primary">
      {children}
    </g>
  </svg>
);

const Dot: React.FC<{ x: number; y: number }> = ({ x, y }) => <circle cx={x * 4 + 2} cy={y * 4 + 2} r="1.5" fill="currentColor" />;

const IconSineWave: React.FC<{ className?: string }> = ({ className }) => (
  <GlowingDotMatrixIcon className={className}>
    <Dot x={1} y={3} /><Dot x={2} y={2} /><Dot x={3} y={2} /><Dot x={4} y={3} /><Dot x={5} y={4} /><Dot x={6} y={4} /><Dot x={7} y={3} />
    <Dot x={1} y={4} /><Dot x={2} y={5} /><Dot x={3} y={5} /><Dot x={4} y={4} /><Dot x={5} y={3} /><Dot x={6} y={3} /><Dot x={7} y={4} />
  </GlowingDotMatrixIcon>
);
const IconRange: React.FC<{ className?: string }> = ({ className }) => (
  <GlowingDotMatrixIcon className={className}>
    <Dot x={1} y={2} /><Dot x={2} y={3} /><Dot x={3} y={4} /><Dot x={1} y={5} /><Dot x={2} y={4} /><Dot x={3} y={3} />
    <Dot x={5} y={2} /><Dot x={6} y={3} /><Dot x={7} y={4} /><Dot x={5} y={5} /><Dot x={6} y={4} /><Dot x={7} y={3} />
    <Dot x={4} y={1} /><Dot x={4} y={6} />
  </GlowingDotMatrixIcon>
);
const IconWavyLine: React.FC<{ className?: string }> = ({ className }) => (
  <GlowingDotMatrixIcon className={className}>
    <Dot x={1} y={2} /><Dot x={2} y={3} /><Dot x={3} y={3} /><Dot x={4} y={2} /><Dot x={5} y={2} /><Dot x={6} y={3} /><Dot x={7} y={3} />
    <Dot x={1} y={4} /><Dot x={2} y={5} /><Dot x={3} y={5} /><Dot x={4} y={4} /><Dot x={5} y={4} /><Dot x={6} y={5} /><Dot x={7} y={5} />
  </GlowingDotMatrixIcon>
);
const IconAmplitude: React.FC<{ className?: string }> = ({ className }) => (
  <GlowingDotMatrixIcon className={className}>
    <Dot x={1} y={4} /><Dot x={2} y={3} /><Dot x={3} y={2} /><Dot x={4} y={1} /><Dot x={5} y={2} /><Dot x={6} y={3} /><Dot x={7} y={4} />
    <Dot x={2} y={5} /><Dot x={3} y={6} /><Dot x={4} y={7} /><Dot x={5} y={6} /><Dot x={6} y={5} />
  </GlowingDotMatrixIcon>
);
const IconSignal: React.FC<{ className?: string }> = ({ className }) => (
  <GlowingDotMatrixIcon className={className}>
    <Dot x={1} y={5} /><Dot x={1} y={6} />
    <Dot x={3} y={4} /><Dot x={3} y={5} /><Dot x={3} y={6} />
    <Dot x={5} y={3} /><Dot x={5} y={4} /><Dot x={5} y={5} /><Dot x={5} y={6} />
    <Dot x={7} y={2} /><Dot x={7} y={3} /><Dot x={7} y={4} /><Dot x={7} y={5} /><Dot x={7} y={6} />
  </GlowingDotMatrixIcon>
);
const IconCurve: React.FC<{ className?: string }> = ({ className }) => (
  <GlowingDotMatrixIcon className={className}>
    <Dot x={1} y={6} /><Dot x={2} y={5} /><Dot x={3} y={4} /><Dot x={4} y={3} /><Dot x={5} y={4} /><Dot x={6} y={5} /><Dot x={7} y={6} />
    <Dot x={2} y={6} /><Dot x={3} y={5} /><Dot x={4} y={4} /><Dot x={5} y={5} /><Dot x={6} y={6} />
  </GlowingDotMatrixIcon>
);
const IconSpeedometer: React.FC<{ className?: string }> = ({ className }) => (
  <GlowingDotMatrixIcon className={className}>
    <path d="M8,18 A12 12 0 1 1 24 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    <line x1="16" y1="18" x2="22" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </GlowingDotMatrixIcon>
);

const BIOMARKER_ICONS: { [key: string]: React.FC<{ className?: string }> } = {
  SineWave: IconSineWave,
  Range: IconRange,
  WavyLine: IconWavyLine,
  Amplitude: IconAmplitude,
  Signal: IconSignal,
  Curve1: IconCurve,
  Curve2: IconCurve,
  Speedometer: IconSpeedometer,
};
export const getBiomarkerIcon = (name: string) => BIOMARKER_ICONS[name];

export const MessageCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

// Simple chat bubble icon for individual chat buttons (distinct from MessageCircle)
export const ChatBubble: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
  </svg>
);

export const Users: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

export const X: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const Pencil: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

export const FileText: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

export const Plus: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export const Send: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);