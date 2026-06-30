# Employable — Setup Guide

This is a complete rebuild of your Employable app as a real website: anyone
can create their own account, log in, upload documents, and see their own
private Cubic-Metric dashboard. Nothing about one person's account is ever
visible to anyone else.

This guide assumes you've never set up a Python web app before. Follow it
top to bottom and you'll have it running on your own computer.

## 1. What you need installed first

- **Python 3.10 or newer.** Check if you already have it:
  ```
  python3 --version
  ```
  If that fails, download Python from https://python.org/downloads — on the
  install screen, tick **"Add Python to PATH"** before clicking Install.

- **Tesseract OCR** (only needed if you want to upload scanned image
  documents like a photographed certificate — skip this if you'll only
  upload PDFs/Word docs/text files):
  - Windows: https://github.com/UB-Mannheim/tesseract/wiki
  - Mac: `brew install tesseract`
  - Linux: `sudo apt install tesseract-ocr`

## 2. Get an OpenAI API key

The scoring engine (the part that reads CVs and produces the Cubic-Metric
numbers) calls OpenAI's API. You need your own key:

1. Go to https://platform.openai.com/api-keys
2. Sign in / create an account, click **Create new secret key**
3. Copy the key (it starts with `sk-`) — you won't be able to see it again,
   so paste it somewhere safe immediately
4. Add billing details on OpenAI's site — the API is pay-per-use, and CV
   scoring with `gpt-4o-mini` costs a small fraction of a cent per upload

## 3. Set up the project folder

Unzip the project folder anywhere you like (Desktop is fine). Open a
terminal (Command Prompt / PowerShell on Windows, Terminal on Mac) and
`cd` into that folder, e.g.:

```
cd Desktop/employable-webapp
```

Create a virtual environment (an isolated space for this project's Python
packages, so they don't clash with anything else on your computer):

```
python3 -m venv venv
```

Activate it:
- **Windows:** `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

You'll know it worked because your terminal prompt now starts with `(venv)`.
You need to run that activate command every time you open a new terminal to
work on this project.

Install everything the app needs:

```
pip install -r requirements.txt
```

## 4. Add your secret keys

Copy `.env.example` to a new file named exactly `.env` (same folder).

Open `.env` in any text editor and fill in:

```
OPENAI_API_KEY=sk-...your real key from step 2...
FLASK_SECRET_KEY=...a random string...
```

For `FLASK_SECRET_KEY`, run this once and paste its output in:

```
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Never share your `.env` file or paste its contents anywhere public** — it
contains the keys that let someone spend your OpenAI credits or forge login
sessions on your app.

## 5. Run it

```
python3 app.py
```

You should see something like:

```
* Running on http://127.0.0.1:5000
```

Open that address (`http://127.0.0.1:5000`) in your web browser. You'll see
the Employable landing page. Click **Create an Account**, sign up, and
you're in your own private dashboard.

To stop the server, go back to the terminal and press `Ctrl+C`.

## 6. Everyday use after the first setup

Every time after the first install, you only need to:

```
cd path/to/employable-webapp
source venv/bin/activate        (Windows: venv\Scripts\activate)
python3 app.py
```

then open `http://127.0.0.1:5000` again.

## What's private to each account

- Username and password (passwords are scrambled/hashed before being
  stored — even you can't look them up afterward, which is normal and
  correct security practice)
- A security question + answer, used only to reset a forgotten password
- Every uploaded document, stored in its own folder per account
- Every skill, every Cubic-Metric score, every job application entry

Two different people creating two different accounts on the same running
app will never see each other's data — this was specifically tested.

## Sharing this with other people / putting it on the internet

Right now, running `python3 app.py` only works on your own computer
(`127.0.0.1` means "this machine only"). If you want other people to use it
over the internet from their own devices, that's a separate step called
**deployment** — putting the app on a server that's always on and reachable
by a real address. Common beginner-friendly options for that, when you're
ready, are Render, Railway, or PythonAnywhere — all have free tiers and
step-by-step guides for Flask apps specifically. Come back and ask for help
with that step whenever you're ready; it's a different process from running
it locally, and we can do it deliberately rather than rushing it now.

## If something goes wrong

- **"OPENAI_API_KEY not found"** when uploading — your `.env` file isn't in
  the same folder as `app.py`, or the key wasn't pasted correctly.
- **Address already in use** — something else is already running on port
  5000. Close other terminals running this app, or restart your computer.
- **OCR / image upload doesn't extract text** — Tesseract isn't installed
  (see step 1). PDF, DOCX, and TXT uploads don't need Tesseract at all.
- **Forgot your own account's password while testing** — use the "Forgot
  username or password?" link on the sign-in page; it asks your security
  question, not your email, since this app doesn't send emails.

## Project structure (for reference)

```
employable-webapp/
├── app.py            Flask routes (the web server itself)
├── auth.py           signup / login / password reset logic
├── db.py             all database reads/writes (SQLite)
├── pipeline.py       ties uploads -> text extraction -> AI scoring -> DB
├── analyzer.py       the AI scoring engine (unchanged from your original)
├── rubric.py         the 7-dimension scoring rubric (unchanged)
├── extract.py        pulls text out of PDFs/DOCX/images (unchanged)
├── cache.py          avoids re-scoring identical document text (unchanged)
├── requirements.txt  Python packages this app needs
├── .env.example      template for your secret keys
├── templates/        the HTML pages
├── static/css/       the luxury black/gold/white styling
├── static/js/        the live-updating dashboard behavior
├── instance/         your local database lives here once you run the app
└── uploads/          uploaded documents, one subfolder per user
```
