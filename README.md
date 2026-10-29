# Tabletop demos

A static, video-forward gallery curated from public Bluesky posts.

## Run

```sh
npm install
npm run dev
```

- `/` is the public gallery.
- `/curate` is the local curation workspace.
- `/collage` makes 1409 × 717 collages from the saved selection’s videos. Start with seven random frames, switch to six, drag or use arrow keys to arrange, scrub frames, replace videos, resize, and download a PNG. Edits last for the current page session.

The curator loads `grantcuster.com`. Select posts and press **Save** to update `public/selection.json`; reload the gallery to see the change. Deploy the output of `npm run build` to any static host.

The curator uses Bluesky's public AppView API and needs no credentials. Saving is intentionally a local development feature provided by Vite; the resulting gallery and `selection.json` are fully static.
