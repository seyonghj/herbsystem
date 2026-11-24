# 🌿 HerbID Iloilo

**An AI-powered medicinal herb identification and information system for the Province of Iloilo.**
BSIT Capstone Project — Northern Iloilo State University (NISU), Lemery Campus.

HerbID Iloilo lets users photograph a plant, identify it with a deep-learning model that is double-checked by Gemini AI, and read its traditional medicinal uses and preparation methods. It also includes a herb database, an interactive map, a community feed, and admin tools for managing content.

---

## Table of Contents

1. [Features](#features)
2. [System Architecture](#system-architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [How Identification Works](#how-identification-works)
6. [Model Details](#model-details)
7. [Getting Started](#getting-started)
8. [Environment Variables](#environment-variables)
9. [Deployment](#deployment)
10. [API Reference](#api-reference)
11. [Firebase Data Model](#firebase-data-model)
12. [Security Rules](#security-rules)
13. [Admin Guide](#admin-guide)
14. [Known Limitations](#known-limitations)
15. [Roadmap](#roadmap)
16. [Team and Acknowledgements](#team-and-acknowledgements)

---

## Features

**For users**
- 📷 **Herb identification** — take a photo or upload one; get the herb name, confidence, medicinal uses, and preparation.
- 🗂️ **Herb database** — browse and search herbs by local name, English name, scientific name, or medicinal use.
- 📖 **Herb detail pages** — description, parts used, preparation method, classification, location, community-verified photos, and video tutorials.
- 🗺️ **Interactive map** — where each herb is commonly found in Lemery, Iloilo.
- 🕘 **Scan history** — every scan is saved to the user's private history.
- 👥 **Community feed** — share scans and discoveries, like, comment, reply, `@mention` other users, repost, and report posts.
- 🔔 **Real-time notifications** — likes, comments, replies, mentions, and shares.
- 🌐 **Page translation** — English, Tagalog, and Hiligaynon (via Cebuano) using the Google Translate widget.
- 🔐 **Accounts** — Google sign-in or email/password through Firebase Authentication.

**For administrators**
- ✏️ Inline editing of every herb field on the detail page.
- 🎬 Upload preparation video tutorials (YouTube embed or Firebase Storage upload) with titles.
- 🖼️ Review and approve community scans for the public gallery.
- 🚩 Review reports submitted against community posts.

---

## System Architecture

```
┌──────────────────────────────┐
│   Browser (HTML / CSS / JS)  │
│   Static multi-page frontend │
└───────┬──────────────┬───────┘
        │              │
        │              │ Firebase SDK
        │              ▼
        │     ┌──────────────────────────┐
        │     │ Firebase                 │
        │     │  • Authentication        │
        │     │  • Cloud Firestore       │
        │     │  • Cloud Storage         │
        │     └──────────────────────────┘
        │
        │ HTTPS (multipart / JSON)
        ▼
┌───────────────────────────────────────┐
│ Flask API  (Railway)                  │
│  • /identify       → MobileNetV2 CNN   │
│  • /gemini-verify  → Gemini AI proxy  │
│  • /health                            │
└───────────────────────────────────────┘
```

The frontend never calls Gemini directly. Requests go through the Flask proxy so API keys stay on the server and can be rotated automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript (ES modules), Tabler Icons |
| Auth / Database / Files | Firebase Authentication, Cloud Firestore, Cloud Storage |
| API | Python 3.11, Flask, Flask-CORS |
| Deep learning | TensorFlow / Keras, MobileNetV2 |
| AI verification | Google Gemini (`gemini-3.6-flash`) via `google-generativeai` |
| Hosting | Railway (frontend and API), Git LFS for the model file |
| Model testing | Streamlit |

---

## Project Structure

The project is split across two repositories.

**Frontend — `herbsystem`**

```
herbsystem/
├── index.html            # Landing page
├── herbs.html            # Herb database
├── herb-detail.html      # Herb detail (admin editing, videos, gallery)
├── identify.html         # CNN + Gemini identification
├── history.html          # User scan history
├── feed.html             # Community feed
├── map.html              # Interactive herb map
├── about.html
├── profile.html          # Profile + admin gallery review
├── css/
│   └── style.css
└── js/
    ├── firebase-config.js
    ├── auth.js
    ├── auth-modal.js     # Sign in / sign up modal
    ├── nav-auth.js       # Navbar user menu
    ├── notifications.js  # Create / listen / mark-read
    ├── mentions.js       # @mention autocomplete and parsing
    └── translator.js     # Page translation widget
```

**API — `HerbID-API`**

```
HerbID-API/
├── app.py                # Flask API
├── class_names.json      # 24 herb classes (index order matches model output)
├── requirements.txt
├── .gitattributes        # Git LFS tracking for model files
└── model/
    └── herb_resnet50v2.h5   # Tracked with Git LFS
```

Also included for development: `streamlit_app.py` (standalone model tester), `firestore.rules`, and `firestore.indexes.json`.

---

## How Identification Works

```
1. User selects or captures a photo
        ↓
2. CNN (Flask /identify)
   • Fix EXIF rotation, center-crop, autocontrast, sharpen, resize to 224×224
   • Test-time augmentation: 5 crops/flips, predictions averaged
   • Entropy check — a "confused" prediction is treated as no match
   • Returns matched, localName, confidence, top-3 / top-5
        ↓
3. Gemini verification (Flask /gemini-verify)
   • Receives the image plus the CNN prediction
   • Returns confirmed, plantName, confidence, analysis
   • Tries each configured API key in order; moves to the next on quota errors
        ↓
4. Cross-check
```

| CNN | Gemini | Result |
|---|---|---|
| Matched | Confirmed, same herb | Full result, verified by both |
| Not matched | Confirmed, herb in database | Gemini-only result |
| Matched | Unavailable / quota exhausted | CNN-only result |
| Not matched | Not confirmed / unavailable | No match |

Every scan is saved to the signed-in user's history. High-confidence matches are flagged for admin review before they can appear in the public gallery.

---

## Model Details

- **Architecture:** MobileNetV2 (transfer learning)
- **Input size:** 224 × 224 × 3
- **Classes:** 21 medicinal herbs of Iloilo (see `class_names.json`)
- **Match threshold:** 0.55 softmax confidence, combined with the entropy check
- **Confidence labels (frontend):** High ≥ 75%, Medium ≥ 50%, Low below 50%

**Architecture comparison from the capstone experiments**

| Model | Accuracy | Precision | Recall | F1-Score |
|---|---|---|---|---|
| MobileNetV2 | 92.92% | 93.26% | 92.92% | 92.08% |
| **ResNet50** | 92.62% | **93.41%** | 92.62% | **92.28%** |
| EfficientNetB0 | 61.68% | 69.98% | 61.68% | 59.30% |

MoblieNdtV2 was selected for the highest precision and F1-score, which matter most when a wrong identification could lead someone to use the wrong plant.

> ⚠️ **Disclaimer:** HerbID Iloilo is for educational use only. Always consult a qualified herbalist or health professional before using any herb for medicinal purposes.

---

## Getting Started

### Prerequisites
- Python 3.11+
- A Firebase project (Authentication, Firestore, Storage enabled)
- One or more Gemini API keys from [Google AI Studio](https://aistudio.google.com/apikey)
- Git and [Git LFS](https://git-lfs.com)
- A static file server for the frontend (for example VS Code Live Server)

### 1. Clone the repositories

```bash
git lfs install
git clone https://github.com/seyonghj/HerbID-API.git
git clone https://github.com/seyonghj/herbsystem.git
```

### 2. Run the API locally

```bash
cd HerbID-API
python -m venv venv
# Windows: venv\Scripts\activate    macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

export GEMINI_KEY="your-key"        # Windows PowerShell: $env:GEMINI_KEY="your-key"
python app.py
```

Check it is running at `http://localhost:5000/health`. You should see the loaded class names.

### 3. Run the frontend locally

1. Put your Firebase web config in `js/firebase-config.js`.
2. Set `CNN_API_URL` in `identify.html` to your API URL (local or Railway).
3. Serve the folder with a static server and open `index.html`.

### 4. Test the model on its own (optional)

```bash
pip install streamlit tensorflow pillow requests
streamlit run streamlit_app.py
```

---

## Environment Variables

Set these in Railway (or your shell when running locally).

| Variable | Required | Description |
|---|---|---|
| `GEMINI_KEY` | Yes | Primary Gemini API key |
| `GEMINI_KEY_1` … `GEMINI_KEY_5` | No | Extra keys; tried in order when one hits its daily quota |
| `MODEL_URL` | No | Direct download link used if the model file is missing or invalid |
| `MODEL_PATH` | No | Override the default model location |
| `PORT` | No | Set automatically by Railway |

Never commit API keys or service-account files to Git.

---

## Deployment

**API (Railway)**
1. Push `HerbID-API` to GitHub with the model tracked by Git LFS:
   ```bash
   git lfs track "*.h5"
   git add .gitattributes model/herb_resnet50v2.h5
   git commit -m "Update model"
   git push origin main
   ```
2. Railway redeploys automatically on every push to `main`.
3. Add the environment variables above in the Railway dashboard.
4. Verify at `https://<your-service>.up.railway.app/health`.

**Frontend (Railway)** — deploy the `herbsystem` repository as a static site.

**Firebase**
1. Enable Google and Email/Password sign-in providers.
2. Publish `firestore.rules`.
3. Deploy indexes: `firebase deploy --only firestore:indexes`.
4. Publish the Storage rules so `herb_videos/` allows public read and admin-only write.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service info and class names |
| `GET` | `/health` | Health check, loaded model state, class names |
| `POST` | `/identify` | Multipart upload (`image` field). Returns the prediction. |
| `POST` | `/gemini-verify` | JSON body with `image` (base64), `mimeType`, `prompt`. Set `textOnly: true` to skip the image. |

**`/identify` response (abridged)**

```json
{
  "matched": true,
  "localName": "Alibhon",
  "confidence": 0.8214,
  "confidencePercent": 82.14,
  "confidenceLabel": "High",
  "top3": [{ "localName": "Alibhon", "percent": 82.14 }],
  "entropy": 0.31,
  "uncertain": false
}
```

When every Gemini key is exhausted, `/gemini-verify` returns HTTP 429 with `quota_exhausted: true`, and the frontend falls back to the CNN result.

---

## Firebase Data Model

**Firestore**

| Collection | Purpose | Access |
|---|---|---|
| `herbs` | Herb database | Public read, admin write |
| `scans` | Private scan history | Owner and admins |
| `public_gallery` | Admin-approved scan photos | Public read, admin write |
| `users` | User profiles | Signed-in read, owner/admin write |
| `posts` | Community posts | Signed-in; new posts start as `pending` |
| `posts/{id}/comments/{id}/replies` | Threaded discussion | Signed-in |
| `notifications/{uid}/items` | Per-user notifications | Owner reads; any user can create |
| `postReports` | Reports against posts (`{postId}_{reporterUid}`) | Create by users, review by admins |
| `herb_videos` | Preparation video metadata | Public read, admin write |
| `adminPasswordResets` | Admin password reset queue | Admin only |

**Cloud Storage**

- `herb_videos/{herbId}/` — uploaded tutorial videos
- `scans/{userId}/` — private scan images

---

## Security Rules

The full rules live in `firestore.rules`. Highlights:

- Admins are identified by verified email inside an `isAdmin()` function. Add or remove admin emails there, and in `herb-detail.html` and the Storage rules.
- Users can only create posts for themselves, and new posts must be `pending`.
- Non-admins can only update the `likes`, `likeCount`, `commentCount`, and `shareCount` fields on a post.
- A user can file one report per post, cannot report their own post, and only admins can read or review reports.
- Reports cannot be deleted.

---

## Admin Guide

Sign in with an admin account, then:

- **Edit herb details** — open any herb page and use the green **Edit** button beside each section. Line breaks in descriptions and preparation steps are preserved.
- **Add a video tutorial** — in the *Preparation video tutorials* section, enter a title and either paste a YouTube link (upload it as *Unlisted* with embedding allowed) or upload an MP4/MOV/WEBM file up to 100 MB.
- **Review the gallery** — approve high-confidence community scans from the profile page so they appear on the herb's public gallery.

---

## Known Limitations

- **Hiligaynon translation** uses Cebuano through Google Translate, since Hiligaynon is not offered as its own language.
- **Gemini free tier** is limited (roughly 1,500 requests per day per key). Multiple keys extend this, and the CNN-only fallback keeps identification working when all keys are exhausted.
- **The model only knows 24 herbs.** Unrelated plants may be matched to the closest class; the entropy check and Gemini verification reduce but do not remove this.
- **Post moderation is incomplete.** New posts are saved as `pending` and hidden from the feed, but the admin approval panel for posts is not built yet.
- **Large uploads** to Firebase Storage can stream slowly; YouTube embeds are recommended for videos.

---

## Roadmap

- [ ] Admin panel for approving or rejecting pending posts and reviewing reports
- [ ] "Was this correct?" feedback on scans to build a retraining dataset
- [ ] Per-user daily scan limits on `/identify`
- [ ] Offline browsing of the herb database
- [ ] Expand the dataset and retrain with additional herb species

---

## Team and Acknowledgements

**BSIT Capstone Project** — Northern Iloilo State University, Lemery Campus, 2024–2025

## Project Members

| Name | Role | Contributions |
|---|---|---|
|**Rene Rose Agolito** | Project Leader, Documentation, Field Researcher, Data Annotator | Project leadership and coordination, manuscript preparation, field research, herb image collection, data labeling, and dataset organization |
| Kurt Mathew June Alborote | Front-End Developer, Field Researcher, Data Annotator, Driver | Front-end development, field research, herb image collection, data annotation, and transportation |
| Jermilyn Azuela | Documentation, Field Researcher, Data Annotator | Project documentation, field research, herb image collection, and data annotation |
| Benjamin Bilbao | Front-End Developer, Field Researcher, Data Annotator | Front-end development, field research, herb image collection, and data annotation |
| Mae Lou Faith Luminate | Documentation, Field Researcher, Data Annotator | Project documentation, field research, herb image collection, and data annotation |
| Mark Louie Pañares | Lead Developer, Full-Stack Developer, Field Researcher | Overall system development, backend and frontend integration, technical implementation, and field research |

**Adviser:**
-Ralf Jangit

Built with TensorFlow, Flask, Firebase, Railway, and Google Gemini.

## ACADEMIC USE ONLY
