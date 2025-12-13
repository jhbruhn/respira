import type {
  MachineInfo,
  PatternInfo,
  SewingProgress,
} from "../types/machine";
import { MachineStatus } from "../types/machine";

// Custom error for pairing issues
export class BluetoothPairingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BluetoothPairingError';
  }
}

// BLE Service and Characteristic UUIDs
const SERVICE_UUID = "a76eb9e0-f3ac-4990-84cf-3a94d2426b2b";
const WRITE_CHAR_UUID = "a76eb9e2-f3ac-4990-84cf-3a94d2426b2b";
const READ_CHAR_UUID = "a76eb9e1-f3ac-4990-84cf-3a94d2426b2b";

// Command IDs (big-endian)
const Commands = {
  MACHINE_INFO: 0x0000,
  MACHINE_STATE: 0x0001,
  SERVICE_COUNT: 0x0100,
  REGULAR_INSPECTION: 0x0103,
  PATTERN_UUID_REQUEST: 0x0702,
  MASK_TRACE: 0x0704,
  LAYOUT_SEND: 0x0705,
  EMB_SEWING_INFO_REQUEST: 0x0706,
  PATTERN_SEWING_INFO: 0x0707,
  EMB_SEWING_DATA_DELETE: 0x0708,
  NEEDLE_MODE_INSTRUCTIONS: 0x0709,
  EMB_UUID_SEND: 0x070a,
  RESUME_FLAG_REQUEST: 0x070b,
  RESUME: 0x070c,
  HOOP_AVOIDANCE: 0x070f,
  START_SEWING: 0x070e,
  MASK_TRACE_1: 0x0710,
  EMB_ORG_POINT: 0x0800,
  FIRM_UPDATE_START: 0x0b00,
  SET_SETTING_REST: 0x0c00,
  SET_SETTING_SEND: 0x0c01,
  MACHINE_SETTING_INFO: 0x0c02,
  SEND_DATA_INFO: 0x1200,
  SEND_DATA: 0x1201,
  CLEAR_ERROR: 0x1300,
  ERROR_LOG_REPLY: 0x1301,
};

export class BrotherPP1Service {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private readCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private commandQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  private isCommunicating = false;
  private isInitialConnection = false;
  private communicationCallbacks: Set<(isCommunicating: boolean) => void> = new Set();
  private disconnectCallbacks: Set<() => void> = new Set();

  /**
   * Subscribe to communication state changes
   * @param callback Function called when communication state changes
   * @returns Unsubscribe function
   */
  onCommunicationChange(callback: (isCommunicating: boolean) => void): () => void {
    this.communicationCallbacks.add(callback);
    // Immediately call with current state
    callback(this.isCommunicating);
    return () => {
      this.communicationCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to disconnect events
   * @param callback Function called when device disconnects
   * @returns Unsubscribe function
   */
  onDisconnect(callback: () => void): () => void {
    this.disconnectCallbacks.add(callback);
    return () => {
      this.disconnectCallbacks.delete(callback);
    };
  }

  private setCommunicating(value: boolean) {
    if (this.isCommunicating !== value) {
      this.isCommunicating = value;
      this.communicationCallbacks.forEach(callback => callback(value));
    }
  }

  private handleDisconnect() {
    console.log('[BrotherPP1Service] Device disconnected');
    this.server = null;
    this.writeCharacteristic = null;
    this.readCharacteristic = null;
    this.commandQueue = [];
    this.isProcessingQueue = false;
    this.setCommunicating(false);
    this.disconnectCallbacks.forEach(callback => callback());
  }

  async connect(): Promise<void> {
    this.isInitialConnection = true;
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
      });

      if (!this.device.gatt) {
        throw new Error("GATT not available");
      }

      // Listen for disconnection events
      this.device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect();
      });

      console.log("Connecting");
      this.server = await this.device.gatt.connect();
      console.log("Connected");
      const service = await this.server.getPrimaryService(SERVICE_UUID);
      console.log("Got primary service");

      this.writeCharacteristic = await service.getCharacteristic(WRITE_CHAR_UUID);
      this.readCharacteristic = await service.getCharacteristic(READ_CHAR_UUID);

      console.log("Connected to Brother PP1 machine");

      console.log("Send dummy command");
      try {
        await this.getMachineInfo();
        console.log("Dummy command success");
      } catch (e) {
        console.log(e);
        throw e;
      }
    } finally {
      this.isInitialConnection = false;
    }
  }

  async disconnect(): Promise<void> {
    // Clear any pending commands
    this.commandQueue = [];
    this.isProcessingQueue = false;

    if (this.server) {
      this.server.disconnect();
    }
    this.device = null;
    this.server = null;
    this.writeCharacteristic = null;
    this.readCharacteristic = null;
  }

  isConnected(): boolean {
    return this.server?.connected ?? false;
  }

  /**
   * Process the command queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.commandQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    this.setCommunicating(true);

    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift();
      if (command) {
        try {
          await command();
        } catch (err) {
          console.error("Command queue error:", err);
          // Continue processing queue even if one command fails
        }
      }
    }

    this.isProcessingQueue = false;
    this.setCommunicating(false);
  }

  /**
   * Enqueue a Bluetooth command to be executed sequentially
   */
  private async enqueueCommand<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.commandQueue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      // Start processing the queue
      this.processQueue();
    });
  }

  private getCommandName(cmdId: number): string {
    const names: Record<number, string> = {
      [Commands.MACHINE_INFO]: "MACHINE_INFO",
      [Commands.MACHINE_STATE]: "MACHINE_STATE",
      [Commands.SERVICE_COUNT]: "SERVICE_COUNT",
      [Commands.REGULAR_INSPECTION]: "REGULAR_INSPECTION",
      [Commands.PATTERN_UUID_REQUEST]: "PATTERN_UUID_REQUEST",
      [Commands.MASK_TRACE]: "MASK_TRACE",
      [Commands.LAYOUT_SEND]: "LAYOUT_SEND",
      [Commands.EMB_SEWING_INFO_REQUEST]: "EMB_SEWING_INFO_REQUEST",
      [Commands.PATTERN_SEWING_INFO]: "PATTERN_SEWING_INFO",
      [Commands.EMB_SEWING_DATA_DELETE]: "EMB_SEWING_DATA_DELETE",
      [Commands.NEEDLE_MODE_INSTRUCTIONS]: "NEEDLE_MODE_INSTRUCTIONS",
      [Commands.EMB_UUID_SEND]: "EMB_UUID_SEND",
      [Commands.RESUME_FLAG_REQUEST]: "RESUME_FLAG_REQUEST",
      [Commands.RESUME]: "RESUME",
      [Commands.HOOP_AVOIDANCE]: "HOOP_AVOIDANCE",
      [Commands.START_SEWING]: "START_SEWING",
      [Commands.MASK_TRACE_1]: "MASK_TRACE_1",
      [Commands.EMB_ORG_POINT]: "EMB_ORG_POINT",
      [Commands.FIRM_UPDATE_START]: "FIRM_UPDATE_START",
      [Commands.SET_SETTING_REST]: "SET_SETTING_REST",
      [Commands.SET_SETTING_SEND]: "SET_SETTING_SEND",
      [Commands.MACHINE_SETTING_INFO]: "MACHINE_SETTING_INFO",
      [Commands.SEND_DATA_INFO]: "SEND_DATA_INFO",
      [Commands.SEND_DATA]: "SEND_DATA",
      [Commands.CLEAR_ERROR]: "CLEAR_ERROR",
      [Commands.ERROR_LOG_REPLY]: "ERROR_LOG_REPLY",
    };
    return names[cmdId] || `UNKNOWN(0x${cmdId.toString(16).padStart(4, "0")})`;
  }

  private async sendCommand(
    cmdId: number,
    data: Uint8Array = new Uint8Array(),
  ): Promise<Uint8Array> {
    // Enqueue the command to ensure sequential execution
    return this.enqueueCommand(async () => {
      if (!this.writeCharacteristic || !this.readCharacteristic) {
        throw new Error("Not connected");
      }

      // Build command with big-endian command ID
      const command = new Uint8Array(2 + data.length);
      command[0] = (cmdId >> 8) & 0xff; // High byte
      command[1] = cmdId & 0xff; // Low byte
      command.set(data, 2);

      const hexData = Array.from(command)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");

      console.log(
        `[TX] ${this.getCommandName(cmdId)} (0x${cmdId.toString(16).padStart(4, "0")}):`,
        hexData,
      );

      try {
        // Write command
        await this.writeCharacteristic.writeValueWithResponse(command);

        // Longer delay to allow machine to prepare response
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Read response
        const responseData = await this.readCharacteristic.readValue();
        const response = new Uint8Array(responseData.buffer);

        const hexResponse = Array.from(response)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");

        // Parse response
        let parsed = "";
        if (response.length >= 3) {
          const respCmdId = (response[0] << 8) | response[1];
          const status = response[2];
          parsed = ` | Status: 0x${status.toString(16).padStart(2, "0")}`;
          if (respCmdId !== cmdId) {
            parsed += ` | WARNING: Response cmd 0x${respCmdId.toString(16).padStart(4, "0")} != request cmd`;
          }
        }

        console.log(`[RX] ${this.getCommandName(cmdId)}:`, hexResponse, parsed);

        return response;
      } catch (error) {
        // Detect pairing issues - only during initial connection
        if (this.isInitialConnection && error instanceof Error) {
          const errorMsg = error.message.toLowerCase();
          if (
            errorMsg.includes('gatt server is disconnected') ||
            (errorMsg.includes('writevaluewithresponse') && errorMsg.includes('gatt server is disconnected'))
          ) {
            throw new BluetoothPairingError(
              'Device not paired. To pair: long-press the Bluetooth button on the machine, then pair it using your operating system\'s Bluetooth settings. After pairing, try connecting again.'
            );
          }
        }
        throw error;
      }
    });
  }

  async getMachineInfo(): Promise<MachineInfo> {
    const response = await this.sendCommand(Commands.MACHINE_INFO);

    // Skip 2-byte command header
    const data = response.slice(2);

    const decoder = new TextDecoder("ascii");
    const serialNumber = decoder.decode(data.slice(2, 11)).replace(/\0/g, "");
    const modelCode = decoder.decode(data.slice(39, 50)).replace(/\0/g, "");

    // Software version (big-endian int16)
    const swVersion = (data[0] << 8) | data[1];

    // BT version (big-endian int16)
    const btVersion = (data[24] << 8) | data[25];

    // Max dimensions (little-endian int16)
    const maxWidth = data[29] | (data[30] << 8);
    const maxHeight = data[31] | (data[32] << 8);

    // MAC address
    const macAddress = Array.from(data.slice(16, 22))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(":")
      .toUpperCase();

    // Fetch service count data (cumulative statistics)
    let serviceCount: number | undefined;
    let totalCount: number | undefined;
    try {
      const serviceData = await this.getServiceCount();
      serviceCount = serviceData.serviceCount;
      totalCount = serviceData.totalCount;
    } catch (err) {
      console.warn('[BrotherPP1] Failed to fetch service count:', err);
    }

    return {
      serialNumber,
      modelNumber: modelCode,
      softwareVersion: `${(swVersion / 100).toFixed(2)}.${data[35]}`,
      bluetoothVersion: btVersion,
      maxWidth,
      maxHeight,
      macAddress,
      serviceCount,
      totalCount,
    };
  }

  async getServiceCount(): Promise<{ serviceCount: number; totalCount: number }> {
    const response = await this.sendCommand(Commands.SERVICE_COUNT);
    const data = response.slice(2);

    // Read uint32 values in little-endian format
    const readUInt32LE = (offset: number) =>
      data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);

    return {
      serviceCount: readUInt32LE(0), // Bytes 0-3
      totalCount: readUInt32LE(4),   // Bytes 4-7
    };
  }

  async getMachineState(): Promise<{ status: MachineStatus; error: number }> {
    const response = await this.sendCommand(Commands.MACHINE_STATE);

    return {
      status: response[2] as MachineStatus,
      error: response[4],
    };
  }

  async getPatternInfo(): Promise<PatternInfo> {
    const response = await this.sendCommand(Commands.EMB_SEWING_INFO_REQUEST);
    const data = response.slice(2);

    const readInt16LE = (offset: number) =>
      data[offset] | (data[offset + 1] << 8);
    const readUInt16LE = (offset: number) =>
      data[offset] | (data[offset + 1] << 8);

    const patternInfo = {
      boundLeft: readInt16LE(0),
      boundTop: readInt16LE(2),
      boundRight: readInt16LE(4),
      boundBottom: readInt16LE(6),
      totalTime: readUInt16LE(8),
      totalStitches: readUInt16LE(10),
      speed: readUInt16LE(12),
    };

    console.log('[BrotherPP1] Pattern Info Response:', {
      rawData: Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '),
      parsed: patternInfo,
    });

    return patternInfo;
  }

  async getSewingProgress(): Promise<SewingProgress> {
    const response = await this.sendCommand(Commands.PATTERN_SEWING_INFO);
    const data = response.slice(2);

    const readInt16LE = (offset: number) => {
      const value = data[offset] | (data[offset + 1] << 8);
      // Convert to signed 16-bit integer
      return value > 0x7fff ? value - 0x10000 : value;
    };
    const readUInt16LE = (offset: number) =>
      data[offset] | (data[offset + 1] << 8);

    return {
      currentStitch: readUInt16LE(0),
      currentTime: readInt16LE(2),
      stopTime: readInt16LE(4),
      positionX: readInt16LE(6),
      positionY: readInt16LE(8),
    };
  }

  async deletePattern(): Promise<void> {
    await this.sendCommand(Commands.EMB_SEWING_DATA_DELETE);
  }

  async sendDataInfo(length: number, checksum: number): Promise<void> {
    const payload = new Uint8Array(7);
    payload[0] = 0x03; // Type

    // Length (little-endian uint32)
    payload[1] = length & 0xff;
    payload[2] = (length >> 8) & 0xff;
    payload[3] = (length >> 16) & 0xff;
    payload[4] = (length >> 24) & 0xff;

    // Checksum (little-endian uint16)
    payload[5] = checksum & 0xff;
    payload[6] = (checksum >> 8) & 0xff;

    const response = await this.sendCommand(Commands.SEND_DATA_INFO, payload);

    if (response[2] !== 0x00) {
      throw new Error("Data info rejected");
    }
  }

  async sendDataChunk(offset: number, data: Uint8Array): Promise<void> {
    const checksum = data.reduce((sum, byte) => (sum + byte) & 0xff, 0);

    const payload = new Uint8Array(4 + data.length + 1);

    // Offset (little-endian uint32)
    payload[0] = offset & 0xff;
    payload[1] = (offset >> 8) & 0xff;
    payload[2] = (offset >> 16) & 0xff;
    payload[3] = (offset >> 24) & 0xff;

    payload.set(data, 4);
    payload[4 + data.length] = checksum;

    // Official app approach: Send chunk without waiting for response
    await this.sendCommandNoResponse(Commands.SEND_DATA, payload);
  }

  private async sendCommandNoResponse(
    cmdId: number,
    data: Uint8Array = new Uint8Array(),
  ): Promise<void> {
    return this.enqueueCommand(async () => {
      if (!this.writeCharacteristic) {
        throw new Error("Not connected");
      }

      // Build command with big-endian command ID
      const command = new Uint8Array(2 + data.length);
      command[0] = (cmdId >> 8) & 0xff; // High byte
      command[1] = cmdId & 0xff; // Low byte
      command.set(data, 2);

      const hexData = Array.from(command)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" ");

      console.log(
        `[TX-NoResp] ${this.getCommandName(cmdId)} (0x${cmdId.toString(16).padStart(4, "0")}):`,
        hexData.substring(0, 100) + (hexData.length > 100 ? "..." : ""),
      );

      // Write without reading response
      await this.writeCharacteristic.writeValueWithResponse(command);

      // Small delay to allow BLE buffer to clear
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }

  async sendUUID(uuid: Uint8Array): Promise<void> {
    const response = await this.sendCommand(Commands.EMB_UUID_SEND, uuid);

    if (response[2] !== 0x00) {
      throw new Error("UUID rejected");
    }
  }

  async sendLayout(
    moveX: number,
    moveY: number,
    sizeX: number,
    sizeY: number,
    rotate: number,
    flip: number,
    frame: number,
    boundLeft: number,
    boundTop: number,
    boundRight: number,
    boundBottom: number,
  ): Promise<void> {
    const payload = new Uint8Array(26);

    const writeInt16LE = (offset: number, value: number) => {
      payload[offset] = value & 0xff;
      payload[offset + 1] = (value >> 8) & 0xff;
    };

    // Position/transformation parameters (12 bytes)
    writeInt16LE(0, moveX);
    writeInt16LE(2, moveY);
    writeInt16LE(4, sizeX);
    writeInt16LE(6, sizeY);
    writeInt16LE(8, rotate);
    payload[10] = flip;
    payload[11] = frame;

    // Pattern bounds (8 bytes)
    writeInt16LE(12, boundLeft);
    writeInt16LE(14, boundTop);
    writeInt16LE(16, boundRight);
    writeInt16LE(18, boundBottom);

    // Repeat moveX and moveY at the end (6 bytes)
    writeInt16LE(20, moveX);
    writeInt16LE(22, moveY);
    payload[24] = flip;
    payload[25] = frame;

    console.log('[DEBUG] Layout bounds:', {
      boundLeft,
      boundTop,
      boundRight,
      boundBottom,
      moveX,
      moveY,
      sizeX,
      sizeY,
    });

    await this.sendCommand(Commands.LAYOUT_SEND, payload);
  }

  async getMachineSettings(): Promise<Uint8Array> {
    return await this.sendCommand(Commands.MACHINE_SETTING_INFO);
  }

  async startMaskTrace(): Promise<void> {
    // Query machine settings before starting mask trace (as per official app)
    await this.getMachineSettings();

    const payload = new Uint8Array([0x00]);
    await this.sendCommand(Commands.MASK_TRACE, payload);
  }

  async startSewing(): Promise<void> {
    await this.sendCommand(Commands.START_SEWING);
  }

  async resumeSewing(): Promise<void> {
    // Resume uses the same START_SEWING command as initial start
    // The machine tracks current position and resumes from there
    await this.sendCommand(Commands.START_SEWING);
  }

  async uploadPattern(
    data: Uint8Array,
    onProgress?: (progress: number) => void,
    bounds?: { minX: number; maxX: number; minY: number; maxY: number },
    patternOffset?: { x: number; y: number },
  ): Promise<Uint8Array> {
    // Calculate checksum
    const checksum = data.reduce((sum, byte) => sum + byte, 0) & 0xffff;

    // Delete existing pattern
    await this.deletePattern();

    // Send data info
    await this.sendDataInfo(data.length, checksum);

    // Send data in chunks (max chunk size ~500 bytes to be safe with BLE MTU)
    const chunkSize = 500;
    let offset = 0;

    // Send all chunks without waiting for responses (official app approach)
    while (offset < data.length) {
      const chunk = data.slice(
        offset,
        Math.min(offset + chunkSize, data.length),
      );

      await this.sendDataChunk(offset, chunk);
      offset += chunk.length;

      if (onProgress) {
        onProgress((offset / data.length) * 100);
      }
    }

    // Wait a bit for machine to finish processing chunks
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Use provided bounds or default to 0
    const boundLeft = bounds?.minX ?? 0;
    const boundTop = bounds?.minY ?? 0;
    const boundRight = bounds?.maxX ?? 0;
    const boundBottom = bounds?.maxY ?? 0;

    // Calculate move offset based on user-defined pattern offset or auto-center
    let moveX: number;
    let moveY: number;

    if (patternOffset) {
      // Use user-defined offset from canvas dragging
      // Pattern offset is in canvas coordinates (0,0 at hoop center)
      // We need to calculate the move that positions pattern's center at the offset position
      const patternCenterX = (boundLeft + boundRight) / 2;
      const patternCenterY = (boundTop + boundBottom) / 2;

      // moveX/moveY define where the pattern center should be
      // offset.x/y is where user dragged the pattern to (relative to hoop center)
      moveX = patternOffset.x - patternCenterX;
      moveY = patternOffset.y - patternCenterY;

      console.log('[LAYOUT] Using user-defined offset:', {
        patternOffset,
        patternCenter: { x: patternCenterX, y: patternCenterY },
        moveX,
        moveY,
      });
    } else {
      // Auto-center: position pattern center at machine center (0, 0)
      const patternCenterX = (boundLeft + boundRight) / 2;
      const patternCenterY = (boundTop + boundBottom) / 2;
      moveX = -patternCenterX;
      moveY = -patternCenterY;

      console.log('[LAYOUT] Auto-centering pattern:', { moveX, moveY });
    }

    // Send layout with actual pattern bounds
    // sizeX/sizeY are scaling factors (100 = 100% = no scaling)
    await this.sendLayout(
      Math.round(moveX), // moveX - position the pattern
      Math.round(moveY), // moveY - position the pattern
      100, // sizeX (100% - no scaling)
      100, // sizeY (100% - no scaling)
      0, // rotate
      0, // flip
      1, // frame
      boundLeft,
      boundTop,
      boundRight,
      boundBottom,
    );

    // Generate random UUID
    const uuid = crypto.getRandomValues(new Uint8Array(16));
    await this.sendUUID(uuid);

    console.log(
      "Pattern uploaded successfully with UUID:",
      Array.from(uuid)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );

    // Return UUID for caching
    return uuid;
  }

  /**
   * Request the UUID of the pattern currently loaded on the machine
   */
  async getPatternUUID(): Promise<Uint8Array | null> {
    try {
      const response = await this.sendCommand(Commands.PATTERN_UUID_REQUEST);

      // Response format: [cmd_high, cmd_low, uuid_bytes...]
      // UUID starts at index 2 (16 bytes)
      if (response.length < 18) {
        // Not enough data for UUID
        console.log(
          "[BrotherPP1] Response too short for UUID:",
          response.length,
        );
        return null;
      }

      // Extract UUID (16 bytes starting at index 2)
      const uuid = response.slice(2, 18);

      // Check if UUID is all zeros (no pattern loaded)
      const allZeros = uuid.every((byte) => byte === 0);
      if (allZeros) {
        console.log("[BrotherPP1] UUID is all zeros, no pattern loaded");
        return null;
      }

      return uuid;
    } catch (err) {
      console.error("[BrotherPP1] Failed to get pattern UUID:", err);
      return null;
    }
  }
}
