import { create } from 'zustand';

export const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

const useBleStore = create((set) => ({
  manager: null,
  connectedDevice: null,
  isScanning: false,
  devices: [],
  sensorData: { ax: 0, ay: 0, az: 9.8, gx: 0, gy: 0, gz: 0, trick: 'none' },

  setManager: (manager) => set({ manager }),
  setScanning: (isScanning) => set({ isScanning }),
  addDevice: (device) =>
    set((state) => {
      if (state.devices.find((d) => d.id === device.id)) return state;
      return { devices: [...state.devices, device] };
    }),
  setConnectedDevice: (connectedDevice) => set({ connectedDevice }),
  setSensorData: (sensorData) => set({ sensorData }),
  disconnect: () => set({ connectedDevice: null, devices: [] }),
}));

export default useBleStore;
