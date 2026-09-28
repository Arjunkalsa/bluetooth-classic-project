# Bluetooth Classic Lab

The site source is intentionally split into separate, readable files:

- `index.html` — page structure and Bluetooth demo controls.
- `style.css` — colors, layout, and responsive design.
- `script.js` — Web Serial connection, incoming data, sending, and disconnect logic.

Keep these three files together in this folder.

## Run in VS Code

1. Open the `BluetoothClassicWebsite` folder in VS Code.
2. Open the integrated terminal in this folder.
3. Run `py -m http.server 8000`.
4. Open `http://localhost:8000` in desktop Google Chrome 117 or later.
5. Pair a Bluetooth Classic SPP/RFCOMM device in Windows settings. Click **Connect Bluetooth device**, choose it, and send a message.

You can also double-click `run-local.bat` to start the local web server.

## Compatibility note

This site connects to paired Bluetooth Classic devices that expose an RFCOMM/SPP serial service. An Android phone needs an app listening on that service; headphones and speakers use different profiles. The site also explains A2DP audio, HFP hands-free calling, and HID input, but only SPP data is implemented.

## Code overview

- `navigator.serial.requestPort()` opens Chrome's device chooser after a user click.
- `port.open()` opens the serial/RFCOMM stream.
- The read loop decodes incoming UTF-8 text and displays newline-separated messages.
- The send function writes UTF-8 text with a newline.
- Android/Windows handle Bluetooth pairing; the website handles the data stream.
