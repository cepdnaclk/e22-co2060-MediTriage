Medi-Triage: AI Implementation Strategy Canvas

Project: Medi-Triage (RoboZen404)
Core Objective: Automate preliminary patient interviews into structured SOAP notes using a Human-in-the-Loop AI approach.

1. AI Value Proposition & Role

Primary Role: Intelligent Data Collector & Synthesizer.

Workflow: 1. Analyze patient input (via Nurse).
2. Determine the single best next medical question.
3. Synthesize the final conversation into a draft SOAP Note.

The "Golden Rule" (Strict Constraint): The AI DOES NOT DIAGNOSE. It must never offer a medical opinion, suggest a condition, or prescribe treatment. It only gathers history.

2. Model Selection & Orchestration

We use a hybrid approach utilizing the Adapter Pattern to balance cost, reasoning capabilities, and data privacy, ensuring vendor lock-in is avoided.

PII Scrubber (Local): Lightweight local LLM (e.g., Llama 3 8B via Ollama).

Why: Ensures sensitive data never leaves the hospital network.

Reasoning Engine (Cloud): * MVP Phase: DeepSeek (Cost-effective, OpenAI-compatible API).

Final Release Phase: OpenAI gpt-4o-mini or gpt-4o.

Why: Fast inference, excellent instruction-following, and easy to swap using interface adapters.

Orchestration Framework: LangChain (Python).

Why: Allows us to chain prompts, manage chat memory, build interchangeable provider adapters, and force JSON structured outputs natively.

Voice Engine (Phase 2): OpenAI Whisper API.

Why: Industry-leading accuracy for complex medical terminology and diverse accents.

3. The AI Service Architecture (Pipeline & Adapters)

The AI interaction is managed in app/services/llm/ using a strict Pipeline and Provider Adapter pattern. This ensures the core logic never directly depends on a third-party vendor.

A. The Execution Flow

Raw Input: Arrives from the Nurse (via UI / API Controllers).

Step 1: PII Scrubbing (Local): Input is routed strictly to the LocalScrubberService. It replaces identifiers (e.g., "John" $\to$ "[REDACTED]").

Step 2: The Interface: The sanitized string and chat history are passed to the BaseReasoningProvider interface.

Step 3: The Adapter: Based on environment configuration (e.g., ACTIVE_LLM=DEEPSEEK), the interface delegates the reasoning task to either the DeepSeekAdapter or OpenAIAdapter.

Output: The Cloud AI returns the next medical question or structured SOAP JSON, which is passed back to the UI.

B. Directory Structure

app/services/llm/
├── pipeline.py                 # THE ORCHESTRATOR: Calls Scrubber -> Calls Active Provider
├── scrubber.py                 # THE LOCAL LLM: Dedicated purely to PII removal
├── providers/                  # THE ADAPTERS
│   ├── base_provider.py        # The Interface (Abstract Base Class)
│   ├── deepseek_provider.py    # DeepSeek implementation (MVP)
│   └── openai_provider.py      # OpenAI implementation (Final Release)
└── prompts.py                  # Shared system prompts


4. Privacy & Safety Guardrails (HIPAA Alignment)

Medical data is highly sensitive. The AI pipeline must implement these protections:

PII Scrubbing (Pre-Processing with Local LLM):

Before sending data to the Cloud AI, LangChain orchestrates the lightweight local LLM to analyze and strip Names, Phone Numbers, and National ID numbers (NIC) from the text.

Example: "Patient John Doe (NIC 991234567V) reports..." $\to$ "Patient [REDACTED] reports..."

Zero-Data Retention:

Enterprise API accounts must be configured so the LLM provider does not use your API payloads to train their future models.

The "Human-in-the-Loop" Verification:

The AI never talks directly to the patient. The Nurse is the proxy. The AI's generated draft is clearly marked [DRAFT - REQUIRES DOCTOR APPROVAL] on the Doctor Dashboard.

5. System Prompt Engineering (The "Brain")

Prompts must be centralized in app/services/llm/prompts.py and heavily version-controlled.

V1 System Prompt Blueprint:

You are an expert AI triage assistant helping a hospital nurse gather patient history.
Your current patient is a {age} year old {gender} presenting with {chief_complaint}.

INSTRUCTIONS:
1. Ask exactly ONE follow-up question at a time to narrow down the symptom characteristics (Onset, Location, Duration, Character, Aggravating/Alleviating factors).
2. Keep questions short, polite, and in simple language.
3. NEVER offer a medical diagnosis or guess what the condition is. 
4. If the history is sufficient (usually after 5-7 questions), reply with the exact command: [INTERVIEW_COMPLETE].


6. Semester 6 Scaling Strategy (Future-Proofing)

Seamless Provider Swap: Because of the Adapter pattern, upgrading from DeepSeek to OpenAI in the Final Release requires changing exactly one environment variable (ACTIVE_LLM=OPENAI). No business logic needs to be rewritten.

Voice Integration (Sprint 7-8): Audio from the frontend is sent to FastAPI $\to$ Whisper API $\to$ Text Box (for Nurse to edit/verify) $\to$ standard LangChain text pipeline.

Sinhala Localization (Sprint 9): Insert a translation layer before the LLM. Translate Sinhala Audio $\to$ English Text (process via LLM) $\to$ Translate output back to Sinhala UI if needed, but keep SOAP note in English for the Doctor.