const SPP_UUID = "00001101-0000-1000-8000-00805f9b34fb";

const support = document.getElementById("support");
const statusBox = document.getElementById("connectionStatus");
const terminal = document.getElementById("terminal");
const connectButton = document.getElementById("connectBtn");
const disconnectButton = document.getElementById("disconnectBtn");
const sendButton = document.getElementById("sendBtn");

let port = null;
let reader = null;
let readTask = null;
let connected = false;
let receivedBuffer = "";

if ("serial" in navigator) {
  support.textContent = "Web Serial is available. Pair an SPP device, then connect.";
  support.classList.add("ok");
} else {
  support.textContent =
    "Web Serial is unavailable. Use desktop Chrome 117+ from localhost or HTTPS.";
  support.classList.add("err");
  connectButton.disabled = true;
}

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("err", isError);
  statusBox.classList.toggle("ok", !isError && connected);
}

function addLogMessage(sender, message) {
  const isFirstPlaceholder =
    terminal.children.length === 1 &&
    terminal.textContent.includes("Terminal ready");

  if (isFirstPlaceholder) {
    terminal.replaceChildren();
  }

  const row = document.createElement("div");
  row.className =
    sender === "Device" ? "rx" : sender === "You" ? "tx" : "sys";
  row.textContent = `[${new Date().toLocaleTimeString()}] ${sender}: ${message}`;
  terminal.appendChild(row);
  terminal.scrollTop = terminal.scrollHeight;
}

async function readIncomingData(activePort) {
  const decoder = new TextDecoder();

  try {
    while (connected && activePort.readable) {
      reader = activePort.readable.getReader();

      try {
        while (connected) {
          const { value, done } = await reader.read();
          if (done) break;

          if (value) {
            receivedBuffer += decoder.decode(value, { stream: true });
            const lines = receivedBuffer.split(/\r?\n/);
            receivedBuffer = lines.pop() ?? "";

            for (const line of lines) {
              addLogMessage("Device", line);
            }
          }
        }
      } finally {
        reader.releaseLock();
        reader = null;
      }
    }
  } catch (error) {
    if (connected) {
      addLogMessage("System", `Read stopped: ${error.message}`);
      setStatus("The device disconnected or closed its serial service.", true);
    }
  }
}

connectButton.addEventListener("click", async () => {
  if (!("serial" in navigator)) return;

  try {
    port = await navigator.serial.requestPort({
      filters: [{ bluetoothServiceClassId: SPP_UUID }],
    });

    const baudRate = Number(document.getElementById("baud").value);
    await port.open({ baudRate });
    connected = true;
    receivedBuffer = "";
    connectButton.disabled = true;
    disconnectButton.disabled = false;
    sendButton.disabled = false;

    setStatus("Connected. Send a line to the device.");
    addLogMessage("System", `Connected at ${baudRate} baud.`);
    readTask = readIncomingData(port);
  } catch (error) {
    if (error.name === "NotFoundError") {
      setStatus("No device selected. Pair an SPP device, then try again.", true);
    } else {
      setStatus(`Could not connect: ${error.message}`, true);
    }
    port = null;
  }
});

async function disconnect() {
  connected = false;
  const oldPort = port;
  port = null;

  try {
    if (reader) await reader.cancel();
  } catch (_) {
    // The reader may already be closed.
  }

  try {
    if (readTask) await readTask;
  } catch (_) {
    // The read loop has already ended.
  }

  try {
    if (oldPort) await oldPort.close();
  } catch (_) {
    // The port may already be closed.
  }

  reader = null;
  readTask = null;
  connectButton.disabled = !("serial" in navigator);
  disconnectButton.disabled = true;
  sendButton.disabled = true;
  setStatus("Disconnected. The device remains paired in system settings.");
  addLogMessage("System", "Disconnected.");
}

disconnectButton.addEventListener("click", disconnect);

async function sendMessage() {
  const input = document.getElementById("message");
  const message = input.value.trim();

  if (!port || !connected || !message) return;

  let writer;

  try {
    writer = port.writable.getWriter();
    await writer.write(new TextEncoder().encode(`${message}\n`));
    writer.releaseLock();
    writer = null;

    addLogMessage("You", message);
    input.value = "";
  } catch (error) {
    if (writer) writer.releaseLock();
    setStatus(`Could not send: ${error.message}`, true);
  }
}

sendButton.addEventListener("click", sendMessage);

document.getElementById("message").addEventListener("keydown", (event) => {
  if (event.key === "Enter") sendMessage();
});

window.addEventListener("beforeunload", () => {
  if (port) port.close().catch(() => {});
});
