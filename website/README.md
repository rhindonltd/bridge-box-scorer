# Bridge Box — promotional website

A self-contained, single-page marketing site for the Bridge Box, aimed at
bridge club directors and committees. The goal is lead generation: it explains
the product and drives visitors to a contact form.

There is **no build step**. The site is plain HTML, CSS and a little inline
JavaScript, so the files can be uploaded as-is to static hosting (e.g. an
Amazon S3 bucket).

## Files

```
website/
├── index.html      # The whole page
├── styles.css      # All styling (design tokens + components)
├── assets/
│   └── bridge-box-logo.png   # Copied from /public/bridge-box-logo.png
└── README.md       # This file
```

## Running it locally

Just open `website/index.html` in a browser. Some browsers restrict how a
`file://` page behaves; to preview it exactly as hosted, serve the folder over
HTTP, for example:

```bash
cd website
python3 -m http.server 8000
# then open http://localhost:8000/
```

## The contact form (placeholder email)

The lead form has no backend yet. It works by opening the visitor's email app
with the details pre-filled (a `mailto:` link). When JavaScript is enabled a
tidy, pre-filled message is built from the fields; if JavaScript is off, the
form falls back to its `action="mailto:…"` attribute.

**Placeholder address:** `hello@example.com`. To change it, edit
`index.html` in these spots (search for `hello@example.com`):

1. The header/contact **email link** (`<a href="mailto:…">`).
2. The form's **`action`** attribute.
3. The form's **`data-contact-email`** attribute (this is what the script uses).
4. The **footer** email link.

> When you later host on S3, you can replace this `mailto:` approach with a real
> form handler (e.g. an API endpoint or a form service) by pointing the form's
> submit at it instead of building a `mailto:`.

## Image placeholders

Every image on the page is currently a **labelled placeholder** — a dashed box
that describes the image that belongs there and its recommended aspect ratio.
Search `index.html` for `IMAGE SLOT` (in HTML comments) or the class
`img-placeholder` to find them.

| Section       | Intended image                                                        | Ratio            |
| ------------- | --------------------------------------------------------------------- | ---------------- |
| Hero          | Product photo: the Bridge Box appliance on a club table, phone/tablet | 4:3              |
| Features      | Screenshot: session timer with director controls                      | 16:9             |
| Features      | Screenshot: live leaderboard (per-section & combined)                 | 16:9             |
| Features      | Screenshot: traveller sheet for a single board                        | 16:9             |
| How it works  | Photo: the Bridge Box plugged in and switched on at the venue         | 16:9             |
| How it works  | Screenshot: score entry on a player's phone                           | 3:4 (portrait)   |
| Cloud         | Screenshot: event results published on the BridgeBox website          | 4:3              |

### The walkthrough video

The "Watch a 2-minute walkthrough" section (id `#walkthrough`, just under the
hero) currently shows a **video placeholder** with a play-button motif. Search
`index.html` for `VIDEO SLOT`. When you have a real video, replace the
`<figure class="video-placeholder">` block with one of:

- **Self-hosted video** (drop the file in `assets/`):

  ```html
  <video
    controls
    poster="assets/walkthrough-poster.jpg"
    style="width: 100%; border-radius: var(--radius-lg)"
  >
    <source src="assets/walkthrough.mp4" type="video/mp4" />
    Your browser doesn't support embedded video.
  </video>
  ```

- **YouTube / Vimeo embed** (kept responsive at 16:9 by the `.video-embed`
  wrapper):

  ```html
  <div class="video-embed">
    <iframe
      src="https://www.youtube.com/embed/VIDEO_ID"
      title="Bridge Box walkthrough"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
    ></iframe>
  </div>
  ```

### Replacing a placeholder with a real image

Each placeholder is a `<figure class="img-placeholder …">` block. When you have
the real asset:

1. Drop the file into `assets/` (e.g. `assets/hero.jpg`).
2. Replace the whole `<figure>…</figure>` block with an `<img>`, reusing the
   description from the placeholder's `aria-label` as the `alt` text:

   ```html
   <img
     src="assets/hero.jpg"
     alt="The Bridge Box appliance on a club table, with a phone and tablet showing the app"
     width="1200"
     height="900"
   />
   ```

   Set `width`/`height` to the image's real pixel dimensions (matching the
   recommended ratio) so the browser reserves the right space and the layout
   doesn't jump while it loads.

## Deploying to Amazon S3 (static website hosting)

1. **Create a bucket** (or use an existing one) in the AWS console.
2. **Upload the files.** Upload `index.html`, `styles.css` and the `assets/`
   folder, keeping the same structure. Using the AWS CLI:

   ```bash
   aws s3 sync website/ s3://YOUR_BUCKET_NAME/ --delete
   ```

3. **Enable static website hosting.** In the bucket's **Properties** tab, turn
   on **Static website hosting** and set the **Index document** to
   `index.html`.
4. **Allow public read access** (or front the bucket with CloudFront). Adjust
   the bucket's **Block public access** settings and add a bucket policy that
   grants `s3:GetObject` to the public, or serve it privately through a
   CloudFront distribution with an origin access control.
5. Open the bucket's **website endpoint** URL to view the live site. For a
   custom domain and HTTPS, put CloudFront in front and point your DNS at it.

## Accessibility & browser support notes

- Semantic landmarks (`header`, `main`, `footer`, `nav`), a single `h1`, a
  logical heading order, a skip link, labelled form fields, visible keyboard
  focus styles, and `prefers-reduced-motion` support are all in place.
- Colours were chosen for AA contrast against their backgrounds, but full WCAG
  conformance should still be confirmed with manual testing using a screen
  reader and keyboard-only navigation.
- Uses only widely-supported CSS (`aspect-ratio`, CSS grid, custom properties);
  no framework or polyfills required.
