# AI Health Companion

AI Health Companion is a next‑generation virtual wellness assistant designed to provide safe, personalized guidance on symptoms, mental well‑being, lifestyle habits, and general health education.  
It uses verified, evidence‑based information and follows strict safety boundaries — offering clarity without diagnosing or replacing professional care.

---

## 🌟 Features

### 🧠 Personalized Wellness Guidance
- General information about symptoms and common health topics.
- Mental well‑being check‑ins and supportive conversations.
- Lifestyle tips for sleep, nutrition, stress, and physical activity.

### 🔍 Verified Information
- All responses are grounded in reputable, evidence‑based sources via Google Search grounding.
- Prioritizes clinical studies and consensus from trusted medical repositories.
- strictly follows a "no diagnosis" policy.

### 🛡️ Safety‑First Design
- Persistent, clear medical disclaimers.
- Non‑judgmental, supportive, and empathetic tone.
- Built-in emergency protocols for life-threatening situations.

### 🎙️ Multimodal Support
- **Text:** Real-time streaming responses with markdown formatting.
- **Voice:** High-quality text-to-speech utilizing Gemini's native audio capabilities.
- **Vision:** Contextual image analysis for nutrition labels, activity environments, or general wellness objects.

---

## 🚀 Tech Stack

- **AI Model:** Powered by the **Gemini 2.5 Flash Lite** for efficient and cost-effective health literacy.
- **Speech:** **Gemini 2.5 Flash TTS** for low-latency, natural-sounding audio responses.
- **Frontend:** **React 19** with **TypeScript** for a robust, modern UI/UX.
- **Styling:** **Tailwind CSS** for a minimalist, medical-grade aesthetic with dark mode support.
- **Icons:** **Lucide React** for consistent, accessible iconography.

---

## 📦 Project Structure

```text
.
├── components/          # React UI components (Header, Input, Bubbles, Panels)
├── services/            # Gemini API integration and audio processing logic
├── types.ts             # TypeScript definitions for messages, health facts, and state
├── constants.ts         # System instructions, safety guidelines, and UI constants
├── App.tsx              # Main application logic and state orchestration
├── index.html           # Main entry point with Tailwind and Font configuration
└── README.md            # Project documentation and medical disclaimer
```

---

## ⚠️ Medical Disclaimer

**Important:** This assistant is for **informational purposes only** and is **not** a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. If you think you may have a medical emergency, call your local emergency services immediately.