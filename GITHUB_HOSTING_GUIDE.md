# 🚀 Deploying Az Tacos King to GitHub Pages

You can host **Az Tacos King** on **GitHub Pages** for free in under 2 minutes.

> [!TIP]
> **Why host on GitHub Pages?**
> GitHub Pages provides **HTTPS encryption (`https://`)**, which browsers (Google Chrome, Apple Safari, Edge) require to keep microphone permissions permanently granted without prompting the user on every visit!

---

## Method 1: Via GitHub Web (Easiest — No Git Installation Required)

1. Open [GitHub.com](https://github.com) and log into your account.
2. Click the **`+`** icon in the top-right corner and select **New repository**.
3. Name your repository (e.g. `az-tacos-king` or `birria-kingz`).
4. Set visibility to **Public** and click **Create repository**.
5. On the new repository page, click **uploading an existing file**.
6. Select and drag all files and folders from your `Az Tacos King` desktop folder:
   - `index.html`
   - `.nojekyll`
   - `css/` folder
   - `js/` folder
7. Click **Commit changes**.
8. Go to **Settings** &rarr; **Pages** (on the left menu).
9. Under **Build and deployment** &rarr; **Branch**:
   - Select `main` (or `master`)
   - Select `/ (root)` folder
   - Click **Save**.
10. In ~1 minute, GitHub will give you your live URL:
    `https://<your-username>.github.io/az-tacos-king/`

---

## Method 2: Via GitHub Desktop or Git CLI

If you have Git or GitHub Desktop:

```bash
cd "C:\Users\DELL\Desktop\Az Tacos King"
git init
git add .
git commit -m "Deploy Az Tacos King with Bella Voice Assistant"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then turn on **GitHub Pages** under **Settings &rarr; Pages &rarr; Branch: main &rarr; Save**.

---

## Running on Localhost

Whenever you want to run locally on your PC:
- Double-click **`Start_Az_Tacos_King.bat`** on your Desktop.
- It will automatically launch Python's local web server on port **8085** and open your browser to `http://localhost:8085`.
