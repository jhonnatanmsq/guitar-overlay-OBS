# Guitar Overlay for OBS

A local browser-source overlay for showing Guitar Hero-style controller inputs in OBS.

## Setup

1. Add `index.html` as a local file in an OBS Browser Source.
2. Enable browser-source transparency if needed.
3. Connect or wake the guitar controller after the source loads.

The overlay has no runtime dependencies, so it works offline as long as `index.html`, `styles.css`, `overlay.js`, `config.json`, and the `Guitar/` folder stay together.

## Configuration

Button and axis mappings are customized in `config.json`. The keys in `buttons` are gamepad button indexes, and each value is the overlay control to activate.

Available controls:

- `verde`
- `vermelho`
- `amarelo`
- `azul`
- `laranjado`
- `whammy`
- `especial`
- `select`
- `start`
- `strumUp`
- `strumDown`

The included `config.json` uses this button layout:

```json
{
    "buttons": {
        "0": "verde",
        "1": "vermelho",
        "3": "amarelo",
        "2": "azul",
        "4": "laranjado",
        "8": "select",
        "9": "start"
    }
}
```

Regular controls can also be mapped from axes. This is useful for guitars that report Whammy or Especial/Star Power as axes instead of buttons. Numeric keys in `axes` are gamepad axis indexes. Each axis can point directly to a control name, or to an object with `control`, `direction`, and `deadzone`.

```json
{
    "axes": {
        "2": {
            "control": "whammy",
            "direction": "positive",
            "deadzone": 0.1
        },
        "3": {
            "control": "especial",
            "direction": "positive",
            "deadzone": 0.5
        }
    }
}
```

Use `"direction": "positive"` for axes that activate toward `1`, `"negative"` for axes that activate toward `-1`, or `"any"` when either direction should activate the control. If the same control is mapped from both `buttons` and `axes`, either input can activate it.
The bundled Whammy image responds to both `whammy` and `especial`, so existing configs keep working while explicit Whammy mappings are also supported.

The strum bar is configured under `strum`. Each direction can read either an axis or a button.

Generic guitars usually report the strum bar as one axis:

```json
{
    "strum": {
        "up": {
            "type": "axis",
            "index": 1,
            "direction": "negative",
            "deadzone": 0.5
        },
        "down": {
            "type": "axis",
            "index": 1,
            "direction": "positive",
            "deadzone": 0.5
        }
    }
}
```

Some guitars report the strum bar as two buttons. The included `config.json` uses button `12` for up and button `13` for down:

```json
{
    "strum": {
        "up": {
            "type": "button",
            "index": 12,
            "control": "strumUp"
        },
        "down": {
            "type": "button",
            "index": 13,
            "control": "strumDown"
        }
    }
}
```

The older `axes.strum` format still works:

```json
{
    "axes": {
        "strum": {
            "index": 1,
            "deadzone": 0.5,
            "negative": "strumUp",
            "positive": "strumDown"
        }
    }
}
```

Use `?debug` to see the live button and axis indexes reported by your controller, then update `config.json` to match.
Query parameters override matching values from the JSON file, so existing OBS browser-source URLs keep working.

## Options

Pass options with query parameters:

- `?debug` shows connected gamepad button and axis state.
- `?gamepad=1` locks the overlay to a specific gamepad index.
- `?deadzone=0.4` changes the configured strum-axis activation threshold.
- `?scale=1.25` scales the overlay without resizing image assets.
- `?config=./my-config.json` loads a different JSON configuration file.

Example:

```text
index.html?debug&gamepad=0&deadzone=0.35&scale=1.2
```
