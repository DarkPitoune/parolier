import type { SyncPayload } from "@/hooks/slideReducer";
import mqtt from "mqtt";

// MQTT Configuration
const MQTT_BROKER_URL = "wss://192.168.8.1:9003";
const MQTT_TOPIC_PREFIX = "parolier";

// Event topics
const TOPICS = {
	STROPHE_CHANGE: `${MQTT_TOPIC_PREFIX}/strophe_change`,
	LOGO_TOGGLE: `${MQTT_TOPIC_PREFIX}/logo_toggle`,
	SONG_CHANGE: `${MQTT_TOPIC_PREFIX}/song_change`,
	SLIDE_STATE: `${MQTT_TOPIC_PREFIX}/slide_state`,
} as const;

// Event payload types
export type StropheChangePayload = {
	songId: number;
	stropheIndex: number;
	content?: Array<{ text: string; chords?: string }>;
};

export type LogoTogglePayload = {
	isLogoSlide: boolean;
};

export type SongChangePayload = {
	songId: number;
	stropheIndex: number;
	content?: Array<{ text: string; chords?: string }>;
};

// Create MQTT client
let mqttClient: mqtt.MqttClient | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const getMqttClient = (): mqtt.MqttClient => {
	if (!mqttClient) {
		mqttClient = mqtt.connect(MQTT_BROKER_URL, {
			clean: true,
			connectTimeout: 4000,
			reconnectPeriod: 1000,
		});

		mqttClient.on("connect", () => {
			console.log("Connected to MQTT broker");
			reconnectAttempts = 0; // Reset counter on successful connection
		});

		mqttClient.on("error", (error) => {
			console.error("MQTT connection error:", error);
		});

		mqttClient.on("reconnect", () => {
			reconnectAttempts++;
			if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
				console.log("Max reconnect attempts reached, stopping reconnection");
				disconnectMqtt();
			}
		});
	}

	return mqttClient;
};

// Function to disconnect and clean up MQTT client
export const disconnectMqtt = () => {
	if (mqttClient) {
		console.log("Disconnecting MQTT client");
		mqttClient.end(true); // Force close the connection
		mqttClient = null;
		reconnectAttempts = 0;
	}
};

// Helper function to publish events
export const publishStropheChange = (payload: StropheChangePayload) => {
	const client = getMqttClient();
	client.publish(TOPICS.STROPHE_CHANGE, JSON.stringify(payload), {
		qos: 0,
		retain: true,
	});
};

export const publishLogoToggle = (payload: LogoTogglePayload) => {
	const client = getMqttClient();
	client.publish(TOPICS.LOGO_TOGGLE, JSON.stringify(payload), {
		qos: 0,
		retain: true,
	});
};

export const publishSongChange = (payload: SongChangePayload) => {
	const client = getMqttClient();
	client.publish(TOPICS.SONG_CHANGE, JSON.stringify(payload), {
		qos: 0,
		retain: true,
	});
};

// Unified slide state publish — publishes to new topic + legacy topics for backward compat
export const publishSlideState = (payload: SyncPayload) => {
	const client = getMqttClient();
	client.publish(TOPICS.SLIDE_STATE, JSON.stringify(payload), {
		qos: 0,
		retain: true,
	});

	// Backward compat: also publish to legacy topics so non-updated devices stay in sync
	if (payload.mode === "song" && payload.songId !== undefined) {
		publishSongChange({
			songId: payload.songId,
			stropheIndex: payload.stropheIndex ?? 0,
			content: payload.stropheContent,
		});
		publishStropheChange({
			songId: payload.songId,
			stropheIndex: payload.stropheIndex ?? 0,
			content: payload.stropheContent,
		});
	}
	if (payload.mode === "logo" || payload.mode === "idle") {
		publishLogoToggle({
			isLogoSlide: payload.mode === "logo",
		});
	}
};

// Subscribe to the unified slide state topic
export const subscribeToSlideState = (
	callback: (payload: SyncPayload) => void,
) => {
	const client = getMqttClient();

	client.subscribe(TOPICS.SLIDE_STATE, { qos: 0 }, (err) => {
		if (err) {
			console.error("[MQTT] Failed to subscribe to slide_state:", err);
		}
	});

	const messageHandler = (topic: string, message: Buffer) => {
		if (topic !== TOPICS.SLIDE_STATE) return;
		try {
			const payload = JSON.parse(message.toString()) as SyncPayload;
			callback(payload);
		} catch (error) {
			console.error("[MQTT] Failed to parse slide_state message:", error);
		}
	};

	client.on("message", messageHandler);

	return () => {
		client.off("message", messageHandler);
		client.unsubscribe(TOPICS.SLIDE_STATE);
	};
};

// Export topics for reference
export { TOPICS };
