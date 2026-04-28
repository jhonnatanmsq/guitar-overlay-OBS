# Guitar Overlay for OBS

A local browser-source overlay for showing Guitar Hero-style controller inputs in OBS.

## Setup

1. Add `index.html` as a local file in an OBS Browser Source.
2. Enable browser-source transparency if needed.
3. Connect or wake the guitar controller after the source loads.

The overlay has no runtime dependencies, so it works offline as long as `index.html`, `styles.css`, `overlay.js`, and the `Guitar/` folder stay together.

## Options

Pass options with query parameters:

- `?debug` shows connected gamepad button state.
- `?gamepad=1` locks the overlay to a specific gamepad index.
- `?deadzone=0.4` changes the strum-axis activation threshold.
- `?scale=1.25` scales the overlay without resizing image assets.

Example:

```text
index.html?debug&gamepad=0&deadzone=0.35&scale=1.2
```
