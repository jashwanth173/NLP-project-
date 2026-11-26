# Moodline — Emotion Detection from Text

Moodline is an NLP project that reads a sentence and predicts the emotion behind it. A Bidirectional GRU (BiGRU) model classifies text into six emotions, and a FastAPI backend serves the model together with a web interface.

## Emotions

| Label | Emoji |
|-------|-------|
| sadness | 😢 |
| joy | 😄 |
| love | ❤️ |
| anger | 😠 |
| fear | 😨 |
| surprise | 😲 |

## Features

- BiGRU deep learning model built with TensorFlow / Keras
- Text preprocessing that matches training (lowercase, strip apostrophes and punctuation, collapse whitespace)
- FastAPI backend with `/predict` and `/health` endpoints
- Web UI with example sentences, a radar chart, probability bars, recent history and light/dark theme
- Full probability breakdown for all six emotions, not just the top prediction

## How it works

1. The input text is cleaned with the same steps used during training.
2. The saved Keras `Tokenizer` converts the words to integer sequences.
3. Sequences are padded or truncated to a length of 50.
4. The BiGRU model outputs a probability for each emotion.
5. The API returns the top emotion, its confidence and the full breakdown.

## Project structure

```
.
├── main.py              # FastAPI app: model loading, preprocessing, API routes
├── requirements.txt     # Python dependencies
├── runtime.txt          # Python version (3.11.9)
├── Artifacts/
│   ├── BiGRU_Model.keras   # Trained BiGRU model
│   └── tokenizer.pkl       # Fitted tokenizer
└── static/
    ├── index.html       # UI markup
    ├── style.css        # UI styles
    └── script.js        # UI logic (calls the API)
```

## Getting started

Requires Python 3.11.

```bash
git clone https://github.com/jashwanth173/NLP-project-.git
cd NLP-project-
pip install -r requirements.txt
uvicorn main:app --reload
```

Open http://127.0.0.1:8000 in your browser. Interactive API docs are at http://127.0.0.1:8000/docs.

## API

### `GET /health`

```json
{ "status": "Server is running", "model_loaded": true }
```

### `POST /predict`

Request:

```json
{ "text": "I can't believe we actually pulled this off!" }
```

Response:

```json
{
  "text": "I can't believe we actually pulled this off!",
  "predicted_emotion": "joy",
  "confidence": 0.92,
  "all_probabilites": {
    "sadness": 0.01,
    "joy": 0.92,
    "love": 0.02,
    "anger": 0.01,
    "fear": 0.01,
    "surprise": 0.03
  }
}
```

(Values above are illustrative. The `all_probabilites` key keeps the spelling used in `main.py`.)

Text must be between 1 and 2000 characters. If the model is still loading, `/predict` returns `503`.

## Tech stack

Python 3.11 · TensorFlow / Keras · FastAPI · Uvicorn · NumPy · HTML, CSS and vanilla JavaScript
