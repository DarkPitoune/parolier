import mqtt from "mqtt";

// MQTT Configuration
const MQTT_BROKER_URL = "wss://192.168.8.1:9003";
const MQTT_TOPIC_PREFIX = "parolier";

// Event topics
const TOPICS = {
	STROPHE_CHANGE: `${MQTT_TOPIC_PREFIX}/strophe_change`,
	LOGO_TOGGLE: `${MQTT_TOPIC_PREFIX}/logo_toggle`,
	SONG_CHANGE: `${MQTT_TOPIC_PREFIX}/song_change`,
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
			reconnectAttempts++;

			// Stop reconnecting after max attempts
			if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
				console.log("Max reconnect attempts reached, stopping reconnection");
				disconnectMqtt();
			}
		});

		mqttClient.on("offline", () => {
			console.log("MQTT client offline");
		});

		mqttClient.on("reconnect", () => {
			console.log("Reconnecting to MQTT broker...");
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

// Helper function to subscribe to events
export const subscribeToEvents = (callbacks: {
	onStropheChange?: (payload: StropheChangePayload) => void;
	onLogoToggle?: (payload: LogoTogglePayload) => void;
	onSongChange?: (payload: SongChangePayload) => void;
}) => {
	const client = getMqttClient();

	// Subscribe to all topics
	const topics = Object.values(TOPICS);
	client.subscribe(topics, { qos: 0 }, (err) => {
		if (err) {
			console.error("[MQTT] Failed to subscribe to MQTT topics:", err);
		} else {
			console.log("[MQTT] Subscribed to MQTT topics:", topics);
		}
	});

	// Handle incoming messages
	const messageHandler = (topic: string, message: Buffer) => {
		try {
			const payload = JSON.parse(message.toString());
			console.log("[MQTT] 📨 Received message:", {
				topic,
				payload,
				isRetained: message.length > 0 ? "possibly" : "no",
			});

			switch (topic) {
				case TOPICS.STROPHE_CHANGE:
					console.log("[MQTT] 🔄 Triggering onStropheChange callback");
					callbacks.onStropheChange?.(payload);
					break;
				case TOPICS.LOGO_TOGGLE:
					console.log("[MQTT] 🎨 Triggering onLogoToggle callback");
					callbacks.onLogoToggle?.(payload);
					break;
				case TOPICS.SONG_CHANGE:
					console.log("[MQTT] 🎵 Triggering onSongChange callback");
					callbacks.onSongChange?.(payload);
					break;
			}
		} catch (error) {
			console.error("[MQTT] Failed to parse MQTT message:", error);
		}
	};

	client.on("message", messageHandler);

	// Return unsubscribe function
	return () => {
		client.off("message", messageHandler);
		client.unsubscribe(topics, (err) => {
			if (err) {
				console.error("Failed to unsubscribe from MQTT topics:", err);
			}
		});
	};
};

// Export topics for reference
export { TOPICS };
