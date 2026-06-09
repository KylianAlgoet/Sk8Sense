import { create } from 'zustand';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import { startMockSensor } from './mockBle';

export const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

const IS_WEB = Platform.OS === 'web';

const DEFAULT_CALIBRATION = { pitch: 4.1, roll: -177.0 };

// ── Single shared raw-data feed ───────────────────────────────────────────
// Dashboard and Practice both need every 100Hz sample for their own detection
// logic. Each screen used to open its own `monitorCharacteristicForService`
// (or mock stream) — but native-stack keeps screens mounted across tabs, so
// e.g. starting a Learning lesson left Dashboard's subscription running
// alongside Practice's, doubling all parsing/processing work on every single
// sample and freezing the JS thread. There is now exactly ONE subscription,
// owned here, and screens register a listener to receive the same stream.
let rawSubscription = null;
let rawDevice = null;
let rawRestartTimer = null;
let rawStopTimer = null;
const rawListeners = new Set();

function broadcastRawData(data) {
  rawListeners.forEach((listener) => {
    try { listener(data); } catch {}
  });
}

function startRawSubscription(device) {
  if (rawSubscription) return;
  clearTimeout(rawStopTimer);
  rawStopTimer = null;
  clearTimeout(rawRestartTimer);
  rawRestartTimer = null;
  if (IS_WEB) {
    const stop = startMockSensor(broadcastRawData);
    rawSubscription = { remove: stop };
    return;
  }
  if (!device) return;
  rawDevice = device;
  const subscription = device.monitorCharacteristicForService(
    SERVICE_UUID, CHAR_UUID,
    (error, characteristic) => {
      if (error) {
        subscription?.remove?.();
        if (rawSubscription === subscription) rawSubscription = null;
        if (rawListeners.size > 0 && rawDevice === device) {
          clearTimeout(rawRestartTimer);
          rawRestartTimer = setTimeout(() => {
            rawRestartTimer = null;
            if (rawListeners.size > 0 && rawDevice === device) startRawSubscription(device);
          }, 250);
        }
        return;
      }
      if (!characteristic?.value || rawListeners.size === 0) return;
      try {
        const json = Buffer.from(characteristic.value, 'base64').toString('utf8');
        broadcastRawData(JSON.parse(json));
      } catch {}
    }
  );
  rawSubscription = subscription;
}

function stopRawSubscription() {
  clearTimeout(rawStopTimer);
  rawStopTimer = null;
  clearTimeout(rawRestartTimer);
  rawRestartTimer = null;
  rawSubscription?.remove?.();
  rawSubscription = null;
  rawDevice = null;
}

function scheduleStopRawSubscription() {
  clearTimeout(rawStopTimer);
  rawStopTimer = setTimeout(() => {
    rawStopTimer = null;
    if (rawListeners.size === 0) stopRawSubscription();
  }, 600);
}

const useBleStore = create((set, get) => ({
  manager: null,
  connectedDevice: null,
  isScanning: false,
  devices: [],
  sensorData: { ax: 0, ay: 0, az: 9.8, gx: 0, gy: 0, gz: 0, trick: 'none', f1: 0, f2: 0, f3: 0, f4: 0 },
  // Shared calibration offset — "zero" orientation used by every screen that reads
  // pitch/roll (Dashboard, Practice). Defaults to the board's resting orientation
  // measured flat on the ground (sensor is mounted rotated ~180° on the deck, so raw
  // reads ~4°/-177° at rest) — normalizes that to 0/0 out of the box, no manual
  // CALIBRATE needed every session. Riders can still recalibrate if mounting changes.
  calibration: DEFAULT_CALIBRATION,

  setManager: (manager) => set({ manager }),
  setScanning: (isScanning) => set({ isScanning }),
  addDevice: (device) =>
    set((state) => {
      if (state.devices.find((d) => d.id === device.id)) return state;
      return { devices: [...state.devices, device] };
    }),
  setConnectedDevice: (connectedDevice) => {
    set({ connectedDevice });
    stopRawSubscription();
    if (rawListeners.size > 0) startRawSubscription(connectedDevice);
  },
  setSensorData: (sensorData) => set({ sensorData }),
  setCalibration: (calibration) => set({ calibration }),
  disconnect: () => {
    stopRawSubscription();
    set({ connectedDevice: null, devices: [], calibration: DEFAULT_CALIBRATION });
  },
  resetRawDataStream: () => {
    const { connectedDevice } = get();
    stopRawSubscription();
    if (IS_WEB) {
      if (rawListeners.size > 0) startRawSubscription(null);
    } else if (connectedDevice && rawListeners.size > 0) {
      startRawSubscription(connectedDevice);
    }
  },

  // Register to receive every raw sample from the single shared subscription
  // (BLE on device, mock stream on web). Returns an unsubscribe function.
  // Web starts streaming immediately (no device needed); native waits for connect.
  subscribeToRawData: (listener) => {
    rawListeners.add(listener);
    if (IS_WEB) startRawSubscription(null);
    else if (get().connectedDevice) startRawSubscription(get().connectedDevice);
    return () => {
      rawListeners.delete(listener);
      if (rawListeners.size === 0) scheduleStopRawSubscription();
    };
  },
}));

export default useBleStore;
