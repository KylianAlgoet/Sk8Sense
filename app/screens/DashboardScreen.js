import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Platform,
	Animated,
	Alert,
} from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useBleStore from "../store/bleStore";
import useSessionStore from "../store/sessionStore";
import { getTrickTip } from "../services/aiCoach";
import T, {
	BG,
	TEXT,
	LINE,
	ACCENT,
	PANEL,
	BTN,
	FONT,
	SPACE,
	R,
} from "../design-tokens";
import {
	V3Grid,
	V3RegStrip,
	V3SectionHead,
	V3MotionTip,
	V3Chip,
	BoardLinkCard,
} from "../components/V3Shared";

const IS_WEB = Platform.OS === "web";
// Re-render rate for the live readouts (pitch/roll/impact/FSR). Detection itself still
// runs at the full 100Hz BLE rate via refs — this only throttles how often the whole
// screen (FlatList, IMU grid, FSR bars, banner) re-renders. 10Hz was too heavy for
// budget Android devices on a JS-bundle dev build — the accumulated render cost made
// the session timer fall behind real time. 6Hz still reads as live, ~40% lighter.
const UI_HZ = 6;

const TRICK_COLORS = {
	ollie: "#4CAF50",
	kickflip: "#2196F3",
	heelflip: "#FF9800",
	pop_shuvit: ACCENT,
};
const COACHING_TIPS = {
	ollie: "Stay over the board on landing",
	kickflip: "Flick harder off the pocket",
	heelflip: "Kick out more with your heel",
	pop_shuvit: "Scoop the tail around and stay over the board",
};
const TRICK_STATE_LABELS = {
	waiting: "Waiting",
	pop: "Loading...",
	airtime: "In the air!",
	landing: "Landing",
	ollie: "Landed!",
};
const TRICK_STATE_COLORS = {
	waiting: TEXT.t3,
	pop: "#FF9800",
	airtime: "#2196F3",
	landing: "#FF5722",
	ollie: "#4CAF50",
};
const SCORE_COLORS = {
	Clean: "#4CAF50",
	Solid: "#3DD8F4",
	Shaky: "#FFB020",
	"Needs work": "#FF4438",
};
function formatDuration(s) {
	return `${Math.floor(s / 60)
		.toString()
		.padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
function formatTime(ts) {
	return new Date(ts).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}
// Convert accel (m/s²) → pitch/roll in degrees
function scoreColor(label) {
	return SCORE_COLORS[label] || ACCENT;
}
function normalizeTrick(trick) {
	if (trick === "bs_shuv" || trick === "fs_shuv") return "pop_shuvit";
	return trick;
}
function trickLabel(trick) {
	const normalized = normalizeTrick(trick);
	if (normalized === "pop_shuvit") return "POP SHUVIT";
	return normalized.toUpperCase();
}
function formatAngle(value) {
	return `${value > 0 ? "+" : ""}${value.toFixed(1)}°`;
}
function fsrPercent(raw) {
	return Math.min(100, Math.max(0, Math.round((raw || 0) / 40.95)));
}
function clamp01(value) {
	return Math.max(0, Math.min(1, value));
}
function calcPitchRoll(ax, ay, az) {
	return {
		pitch: Math.atan2(ay, Math.sqrt(ax * ax + az * az)) * (180 / Math.PI),
		roll: Math.atan2(-ax, az) * (180 / Math.PI),
	};
}

export default function DashboardScreen({ navigation }) {
	const {
		connectedDevice,
		sensorData,
		setSensorData,
		calibration,
		setCalibration,
		disconnect,
	} = useBleStore();
	const { isActive, tricks, startSession, addTrick, stopSession } =
		useSessionStore();
	// FlatList compares `data` by reference — building a fresh reversed array every
	// render (10x/sec while a session streams) made it re-diff the whole feed each tick.
	// Memoizing on `tricks` means it only recomputes when a trick is actually logged.
	const feedData = useMemo(() => [...tricks].reverse(), [tricks]);
	const scoredTricks = useMemo(
		() => tricks.filter((t) => typeof t.cleanScore === "number"),
		[tricks],
	);
	const avgScore = scoredTricks.length
		? Math.round(
				scoredTricks.reduce((sum, t) => sum + t.cleanScore, 0) /
					scoredTricks.length,
			)
		: null;
	const bestAttempt = scoredTricks.length
		? scoredTricks.reduce(
				(best, t) => (t.cleanScore > best.cleanScore ? t : best),
				scoredTricks[0],
			)
		: null;
	const isFocused = useIsFocused();

	const prevTrickRef = useRef("none");
	const lastUiRef = useRef(0);
	const trickMetaRef = useRef({}); // live sensor context during airtime
	const aiTipRequestRef = useRef(0);
	// Real boards report noisy `trick` values that can flicker none→ollie→none→ollie
	// many times per second — each flicker looked like a fresh trick and fired addTrick,
	// the banner animation AND a network call to the AI coach, flooding the JS thread
	// and freezing the whole app. A human can't physically land two tricks within 600ms,
	// so anything faster than that is sensor noise, not a new attempt — ignore it.
	const lastTrickFireRef = useRef(0);
	const TRICK_COOLDOWN_MS = 600;
	const [aiTip, setAiTip] = useState("");
	const [displayTrick, setDisplayTrick] = useState("none");
	// Native stack keeps Dashboard mounted underneath SessionSummary — without this guard
	// the BLE feed kept driving setState/WebView updates at 100Hz in the background the
	// instant the rider stopped a session, piling on top of the summary screen's own AI
	// call and freezing the whole app right at the stop→summary transition.
	const focusedRef = useRef(true);
	useEffect(() => {
		focusedRef.current = isFocused;
	}, [isFocused]);
	const handleIncomingDataRef = useRef(null);
	useEffect(() => {
		handleIncomingDataRef.current = handleIncomingData;
	});
	const isActiveRef = useRef(isActive);
	const trickStateRef = useRef("waiting");
	const maxImpactRef = useRef(0);
	// Mirror of bleStore.calibration in a ref so the BLE closure always sees the latest value
	// without a stale-closure re-subscribe; bleStore is the source of truth shared across screens.
	const calibRef = useRef(calibration);
	useEffect(() => {
		calibRef.current = calibration;
	}, [calibration]);

	const [elapsed, setElapsed] = useState(0);
	const [currentTip, setCurrentTip] = useState("");
	const [trickState, setTrickState] = useState("waiting");
	const [calibApplied, setCalibApplied] = useState(false);

	const timerRef = useRef(null);
	const tipTimerRef = useRef(null);
	const calibTimerRef = useRef(null);
	const stateResetTimerRef = useRef(null);
	const displayTrickTimerRef = useRef(null);
	const bannerScale = useRef(new Animated.Value(1)).current;
	const bannerOpacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		isActiveRef.current = isActive;
	}, [isActive]);

	// ── Compute live values from sensorData directly in render ──────────────
	const { ax, ay, az, f1 = 0, f2 = 0, f3 = 0, f4 = 0 } = sensorData;
	const raw = calcPitchRoll(ax, ay, az);
	const livePitch = raw.pitch - calibRef.current.pitch;
	const liveRoll = raw.roll - calibRef.current.roll;
	const liveImpact = Math.sqrt(ax * ax + ay * ay + az * az);
	// FSR: threshold 300 to ignore floating-pin noise on unconnected sensors
	const fsrNose = Math.max(0, f1 - 300);
	const fsrHeel = Math.max(0, f3 - 300);
	const fsrToe = Math.max(0, f2 - 300);
	const fsrTail = Math.max(0, f4 - 300);
	const anyFsr = fsrNose > 0 || fsrHeel > 0 || fsrToe > 0 || fsrTail > 0;
	const latestAttempt = tricks[tricks.length - 1];
	const tailPct = fsrPercent(f4);
	const telemetryCards = [
		{
			label: "PITCH",
			value: formatAngle(livePitch),
			sub: livePitch >= 0 ? "nose up" : "nose down",
			pct: clamp01(Math.abs(livePitch) / 45),
			color: Math.abs(livePitch) > 20 ? ACCENT : "#3DD8F4",
		},
		{
			label: "ROLL",
			value: formatAngle(liveRoll),
			sub: liveRoll >= 0 ? "toe lean" : "heel lean",
			pct: clamp01(Math.abs(liveRoll) / 45),
			color: Math.abs(liveRoll) > 20 ? ACCENT : "#2196F3",
		},
		{
			label: "TAIL",
			value: `${tailPct}%`,
			sub: f4 > 600 ? "loaded" : "light",
			pct: tailPct / 100,
			color: f4 > 600 ? ACCENT : "#4CAF50",
		},
		{
			label: "IMPACT",
			value: liveImpact.toFixed(1),
			sub: "m/s² load",
			pct: clamp01((liveImpact - 9.8) / 18),
			color: liveImpact > 15 ? "#FF4438" : "#FFB020",
		},
	];
	const pressureCells = [
		{ label: "NOSE", raw: f1, value: fsrNose, color: "#4CAF50" },
		{ label: "HEEL", raw: f3, value: fsrHeel, color: "#2196F3" },
		{ label: "TOE", raw: f2, value: fsrToe, color: "#FF9800" },
		{ label: "TAIL", raw: f4, value: fsrTail, color: ACCENT },
	];

	// ── Calibrate: store current orientation as zero — shared via bleStore so
	// Practice (and any future screen) benefits from the same "zero" without recalibrating ──
	const handleCalibrate = () => {
		const next = { pitch: raw.pitch, roll: raw.roll };
		calibRef.current = next;
		setCalibration(next);
		setCalibApplied(true);
		clearTimeout(calibTimerRef.current);
		calibTimerRef.current = setTimeout(() => setCalibApplied(false), 1500);
	};

	function triggerTrickAnimation(trick) {
		setDisplayTrick(trick);
		clearTimeout(displayTrickTimerRef.current);
		displayTrickTimerRef.current = setTimeout(
			() => setDisplayTrick("none"),
			1600,
		);
		setCurrentTip(COACHING_TIPS[trick] || "");
		bannerScale.setValue(1.25);
		bannerOpacity.setValue(1);
		Animated.spring(bannerScale, {
			toValue: 1,
			friction: 4,
			tension: 120,
			useNativeDriver: true,
		}).start();
		clearTimeout(tipTimerRef.current);
		tipTimerRef.current = setTimeout(() => {
			Animated.timing(bannerOpacity, {
				toValue: 0,
				duration: 400,
				useNativeDriver: true,
			}).start(() => setCurrentTip(""));
		}, 2500);
	}

	// ── Shared sensor feed — registers with bleStore's single subscription ───
	// Dashboard and Practice both used to open their own monitorCharacteristicForService
	// (or mock stream) on the same characteristic. Native-stack keeps screens mounted
	// across tabs, so starting a Learning lesson left this subscription running
	// alongside Practice's — doubling all 100Hz parsing/processing work and freezing
	// the JS thread. bleStore now owns the one true subscription; we just listen.
	useFocusEffect(
		useCallback(() => {
			focusedRef.current = true;
			const unsubscribe = useBleStore.getState().subscribeToRawData((data) => {
				handleIncomingDataRef.current?.(data);
			});
			return () => {
				focusedRef.current = false;
				aiTipRequestRef.current += 1;
				clearTimeout(calibTimerRef.current);
				clearTimeout(tipTimerRef.current);
				clearTimeout(displayTrickTimerRef.current);
				clearTimeout(stateResetTimerRef.current);
				unsubscribe();
			};
		}, []),
	);

	// handleIncomingData uses only refs + stable Zustand setters → no stale closure
	function handleIncomingData(data) {
		if (!focusedRef.current) return;


		// Track peak sensor values for AI coaching
		const m = trickMetaRef.current;
		if (Math.abs(data.gx || 0) > Math.abs(m.peakGx || 0)) m.peakGx = data.gx;
		if (Math.abs(data.gy || 0) > Math.abs(m.peakGy || 0)) m.peakGy = data.gy;
		if (Math.abs(data.gz || 0) > Math.abs(m.peakGz || 0)) m.peakGz = data.gz;
		m.tailFsr = Math.max(m.tailFsr || 0, data.f4 || 0);
		if (!m.airtimeStart && data.trick !== "none") m.airtimeStart = Date.now();
		if (m.airtimeStart && data.trick === "none") {
			m.airtime = Date.now() - m.airtimeStart;
			m.airtimeStart = null;
		}

		const impact = Math.sqrt(
			(data.ax || 0) ** 2 + (data.ay || 0) ** 2 + (data.az || 0) ** 2,
		);
		if (isActiveRef.current && impact > maxImpactRef.current)
			maxImpactRef.current = impact;

		// Existing trick detection (from ESP32 firmware)
		const firmwareTrick = data.trick;
		const trick = normalizeTrick(firmwareTrick);
		const trickNow = Date.now();
		if (
			isActiveRef.current &&
			trick !== "none" &&
			prevTrickRef.current === "none" &&
			trickNow - lastTrickFireRef.current >= TRICK_COOLDOWN_MS
		) {
			lastTrickFireRef.current = trickNow;
			const sessionTrick = trick;
			const meta = {
				peakGx: trickMetaRef.current.peakGx || 0,
				peakGy: trickMetaRef.current.peakGy || 0,
				peakGz: trickMetaRef.current.peakGz || 0,
				airtime: trickMetaRef.current.airtime || 0,
				tailFsr: trickMetaRef.current.tailFsr || 0,
				landingImpact: maxImpactRef.current,
			};
			trickMetaRef.current = {};


			addTrick(sessionTrick, meta);
			triggerTrickAnimation(sessionTrick);

			const requestId = ++aiTipRequestRef.current;
			getTrickTip({ trick: sessionTrick, ...meta })
				.then((tip) => {
					if (
						requestId === aiTipRequestRef.current &&
						focusedRef.current &&
						isActiveRef.current &&
						tip
					) {
						setAiTip(tip);
					}
				})
				.catch(() => {});
		}
		prevTrickRef.current = trick;

		// App-side trick state machine (more granular than ESP32 firmware)
		// Trick state — driven by ESP32 firmware output + FSR tail for pop hint
		const tailRaw = data.f4 || 0;
		const tailActive = tailRaw > 600; // FSR tail pressed (low threshold)
		const prev = trickStateRef.current;
		let next = prev;

		if (trick !== "none") {
			// ESP32 detected active airtime/landing phase
			next =
				trick === "ollie"
					? "airtime"
					: trick === "kickflip"
						? "airtime"
						: trick === "heelflip"
							? "airtime"
							: "airtime";
		} else if (prev === "airtime") {
			// Just completed trick — show result briefly
			next = "ollie";
			clearTimeout(stateResetTimerRef.current);
			stateResetTimerRef.current = setTimeout(() => {
				trickStateRef.current = "waiting";
				setTrickState("waiting");
			}, 1500);
		} else if (tailActive) {
			next = "pop"; // tail FSR pressed = loading pop
		} else if (prev === "pop" && !tailActive) {
			next = "waiting"; // released tail without airtime = just standing
		}

		if (next !== prev) {
			trickStateRef.current = next;
			setTrickState(next);
		}

		// Throttled UI update — updates sensorData in bleStore → triggers re-render
		// pitch/roll/impact are then computed from fresh sensorData in the render above
		const now = Date.now();
		if (now - lastUiRef.current >= 1000 / UI_HZ) {
			lastUiRef.current = now;
			setSensorData(data); // ← bleStore update → component re-renders → livePitch/liveRoll update
		}
	}

	// Session timer
	useEffect(() => {
		if (isActive) {
			setElapsed(0);
			timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
		} else clearInterval(timerRef.current);
		return () => clearInterval(timerRef.current);
	}, [isActive]);

	const handleStartStop = useCallback(() => {
		aiTipRequestRef.current += 1;
		setAiTip("");
		if (!isActive) {
			maxImpactRef.current = 0;
			setDisplayTrick("none");
			startSession();
		} else {
			const session = stopSession();
			session.maxImpact = maxImpactRef.current;
			navigation.navigate("SessionSummary", { session });
		}
	}, [isActive, navigation, startSession, stopSession]);

	const doDisconnect = () => {
		clearInterval(timerRef.current);
		clearTimeout(calibTimerRef.current);
		clearTimeout(tipTimerRef.current);
		clearTimeout(displayTrickTimerRef.current);
		clearTimeout(stateResetTimerRef.current);
		if (!IS_WEB) connectedDevice?.cancelConnection();
		disconnect();
		navigation.navigate("Home");
	};

	// Leaving mid-session would silently throw away the run in progress — confirm first
	// so a stray tap on EXIT can't wipe out a session the rider hasn't ended yet.
	const handleDisconnect = () => {
		if (isActive) {
			Alert.alert(
				"End session and leave?",
				"Your session is still recording. Leaving now will stop it without saving a summary.",
				[
					{ text: "Keep riding", style: "cancel" },
					{ text: "Leave anyway", style: "destructive", onPress: doDisconnect },
				],
			);
			return;
		}
		doDisconnect();
	};

	const activeTrick = displayTrick;
	const trickActive = activeTrick !== "none";

	return (
		<View style={styles.container}>
			<V3Grid />
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Top bar */}
				<View style={styles.topBar}>
					<TouchableOpacity onPress={handleCalibrate} style={styles.calibBtn}>
						<Text
							style={[styles.calibText, calibApplied && { color: "#4CAF50" }]}
						>
							{calibApplied ? "✓ CALIBRATED" : "◎ CALIBRATE"}
						</Text>
					</TouchableOpacity>
					{IS_WEB && <V3Chip label="DEMO" variant="live" />}
					{isActive && <V3Chip label="REC · ACTIVE" variant="live" />}
					<TouchableOpacity onPress={handleDisconnect} style={styles.exitBtn}>
						<Text style={styles.exitText}>← LEAVE</Text>
					</TouchableOpacity>
				</View>

				{/* Board link status — web demo always streams a mock feed; native reflects the real BLE link */}
				<View style={{ marginBottom: 12 }}>
					<BoardLinkCard
						live={IS_WEB || !!connectedDevice}
						deviceName={
							connectedDevice?.name || (IS_WEB ? "SK8Sense ESP32 (Demo)" : null)
						}
						simulated={IS_WEB}
						onPressConnect={() =>
							navigation.getParent()?.navigate("Board", {
								screen: "Connect",
								params: { returnTo: { stack: "Board", screen: "Dashboard" } },
							})
						}
						onPressDisconnect={handleDisconnect}
					/>
				</View>

				{/* Session time hero */}
				<View
					style={[styles.sessionPanel, isActive && styles.sessionPanelActive]}
				>
					<Text style={styles.timeLabel}>· SESSION TIME ·</Text>
					<View style={styles.sessionPanelHead}>
						<Text style={styles.sessionMode}>
							{isActive ? "RECORDING RUN" : "STANDBY"}
						</Text>
						<View style={[styles.recPill, isActive && styles.recPillActive]}>
							<View style={[styles.recLed, isActive && styles.recLedActive]} />
							<Text
								style={[
									styles.recPillText,
									isActive && styles.recPillTextActive,
								]}
							>
								{isActive ? "REC ACTIVE" : "READY"}
							</Text>
						</View>
					</View>
					<Text style={styles.timerBig}>{formatDuration(elapsed)}</Text>
					<View style={styles.sessionStatsRow}>
						<View style={styles.sessionStat}>
							<Text style={styles.sessionStatValue}>{tricks.length}</Text>
							<Text style={styles.sessionStatLabel}>DETECTIONS</Text>
						</View>
						<View style={styles.sessionStat}>
							<Text style={styles.sessionStatValue}>{avgScore ?? "--"}</Text>
							<Text style={styles.sessionStatLabel}>AVG CLEAN</Text>
						</View>
						<View style={styles.sessionStat}>
							<Text
								style={[
									styles.sessionStatValue,
									bestAttempt && { color: scoreColor(bestAttempt.cleanLabel) },
								]}
							>
								{bestAttempt?.cleanScore ?? "--"}
							</Text>
							<Text style={styles.sessionStatLabel}>BEST</Text>
						</View>
						<View style={styles.sessionStatWide}>
							<Text style={styles.sessionStatValue}>
								{latestAttempt ? trickLabel(latestAttempt.trick) : "NONE"}
							</Text>
							<Text style={styles.sessionStatLabel}>LAST TRICK</Text>
						</View>
					</View>
				</View>

				{/* Detection banner */}
				{trickActive ? (
					<Animated.View
						style={[
							styles.detectionBanner,
							{ transform: [{ scale: bannerScale }], opacity: bannerOpacity },
						]}
					>
						<View>
							<Text style={styles.detectionCode}>› DETECTION · CODE</Text>
							<Text style={styles.detectionTrick}>
								{trickLabel(activeTrick)}
							</Text>
						</View>
						<Text style={styles.detectionScore}>
							{typeof tricks[tricks.length - 1]?.cleanScore === "number"
								? tricks[tricks.length - 1].cleanScore
								: "···"}
						</Text>
					</Animated.View>
				) : (
					<View style={styles.listeningBanner}>
						<Text style={styles.listeningText}>// LISTENING FOR MOVEMENT</Text>
						<View
							style={[
								styles.stateChip,
								{ borderColor: TRICK_STATE_COLORS[trickState] + "55" },
							]}
						>
							<Text
								style={[
									styles.stateChipText,
									{ color: TRICK_STATE_COLORS[trickState] },
								]}
							>
								{TRICK_STATE_LABELS[trickState]}
							</Text>
						</View>
					</View>
				)}

				<View style={styles.telemetryHeaderRow}>
					<Text style={styles.telemetryTitle}>LIVE TELEMETRY</Text>
					<Text style={[styles.telemetryState, anyFsr && { color: ACCENT }]}>
						{anyFsr ? "PRESSURE ON DECK" : "FREE ROLL"}
					</Text>
				</View>

				{/* IMU strip */}
				<View style={styles.imuStrip}>
					{[
						{
							label: "PITCH",
							value: `${livePitch.toFixed(1)}°`,
							hot: Math.abs(livePitch) > 20,
						},
						{
							label: "ROLL",
							value: `${liveRoll.toFixed(1)}°`,
							hot: Math.abs(liveRoll) > 20,
						},
						{
							label: "TAIL",
							value: `${Math.round((sensorData.f4 || 0) / 40.95)}%`,
							hot: (sensorData.f4 || 0) > 1800,
						},
						{
							label: "IMPACT",
							value: `${liveImpact.toFixed(1)}`,
							hot: liveImpact > 15,
						},
					].map(({ label, value, hot }, i) => (
						<View
							key={label}
							style={[styles.imuCell, i === 3 && styles.imuCellLast]}
						>
							<Text style={[styles.imuLabel, hot && { color: ACCENT }]}>
								{label}
							</Text>
							<Text style={[styles.imuValue, hot && { color: ACCENT }]}>
								{value}
							</Text>
						</View>
					))}
				</View>

				{/* FSR bars */}
				<View style={styles.fsrRow}>
					{[
						{ label: "NOSE", value: fsrNose, color: "#4CAF50" },
						{ label: "HEEL", value: fsrHeel, color: "#2196F3" },
						{ label: "TOE", value: fsrToe, color: "#FF9800" },
						{ label: "TAIL", value: fsrTail, color: ACCENT },
					].map(({ label, value, color }) => {
						const pct = Math.min(value / 1800, 1);
						const pctLabel = Math.round(pct * 100);
						return (
							<View key={label} style={styles.fsrCell}>
								<View style={styles.fsrMeta}>
									<Text
										style={[
											styles.fsrLabel,
											{ color: pct > 0.1 ? color : TEXT.t4 },
										]}
									>
										{label}
									</Text>
									<Text style={styles.fsrPct}>{pctLabel}%</Text>
								</View>
								<View style={styles.fsrBarBg}>
									<View
										style={[
											styles.fsrBarFill,
											{
												width: `${Math.round(pct * 100)}%`,
												backgroundColor: color,
											},
										]}
									/>
								</View>
							</View>
						);
					})}
				</View>

				{/* AI tip */}
				{(aiTip || currentTip) && <V3MotionTip text={aiTip || currentTip} />}

				{/* Feed */}
				<V3SectionHead
					num="/·"
					label="DETECTION FEED"
					right={`${tricks.length} LOGGED`}
				/>
				<View style={styles.feed}>
					{feedData.length === 0 ? (
						<View style={styles.feedEmptyBox}>
							<Text style={styles.feedEmptyTitle}>
								{isActive ? "ARMED FOR FIRST TRICK" : "SESSION READY"}
							</Text>
							<Text style={styles.feedEmpty}>
								{isActive
									? "// waiting for movement..."
									: "Press START SESSION"}
							</Text>
						</View>
					) : (
						feedData.slice(0, 12).map((item, index) => (
							<View key={`${item.time}-${index}`} style={styles.feedItem}>
								<Text style={styles.feedIndex}>
									#{String(tricks.length - index).padStart(2, "0")}
								</Text>
								<View
									style={[
										styles.feedDot,
										{
											backgroundColor:
												TRICK_COLORS[normalizeTrick(item.trick)] || ACCENT,
										},
									]}
								/>
								<View style={styles.feedMain}>
									<Text style={styles.feedTrick}>{trickLabel(item.trick)}</Text>
									<Text style={styles.feedMeta}>
										{formatTime(item.time)} //{" "}
										{item.landed === false
											? "BAILED"
											: item.cleanLabel || "READ"}
									</Text>
								</View>
								<View
									style={[
										styles.feedScoreBadge,
										item.cleanLabel && {
											borderColor: `${scoreColor(item.cleanLabel)}66`,
										},
									]}
								>
									<Text
										style={[
											styles.feedScore,
											item.cleanLabel && { color: scoreColor(item.cleanLabel) },
										]}
									>
										{typeof item.cleanScore === "number"
											? item.cleanScore
											: "--"}
									</Text>
								</View>
							</View>
						))
					)}
				</View>
			</ScrollView>

			{/* Start/Stop */}
			<TouchableOpacity
				style={[styles.sessionBtn, isActive && styles.sessionBtnStop]}
				onPress={handleStartStop}
			>
				<Ionicons name={isActive ? "stop" : "play"} size={15} color="#0A0A0B" />
				<Text style={styles.sessionBtnText}>
					{isActive ? "■ END SESSION" : "▶ START SESSION"}
				</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: BG.base },
	scroll: { flex: 1 },
	scrollContent: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12 },

	topBar: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
		gap: 8,
	},
	calibBtn: { ...PANEL.base, paddingHorizontal: 9, paddingVertical: 4 },
	calibText: {
		color: ACCENT,
		fontSize: 9,
		fontFamily: FONT.mono,
		letterSpacing: 1,
	},
	exitBtn: { marginLeft: "auto" },
	exitText: {
		color: TEXT.t2,
		fontSize: 10,
		fontFamily: FONT.mono,
		letterSpacing: 0.5,
	},

	sessionPanel: { ...PANEL.raised, padding: 13, marginBottom: 10, gap: 8 },
	sessionPanelActive: { borderColor: `${ACCENT}59`, backgroundColor: BG.b2 },
	sessionPanelHead: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
	},
	sessionMode: {
		fontFamily: FONT.display,
		fontSize: 15,
		color: TEXT.t1,
		letterSpacing: -0.2,
		textTransform: "uppercase",
	},
	recPill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderWidth: 1,
		borderColor: LINE.mid,
		borderRadius: R,
		paddingHorizontal: 8,
		paddingVertical: 4,
		backgroundColor: BG.b1,
	},
	recPillActive: { borderColor: `${ACCENT}66`, backgroundColor: `${ACCENT}14` },
	recLed: { width: 7, height: 7, borderRadius: 4, backgroundColor: TEXT.t4 },
	recLedActive: { backgroundColor: ACCENT },
	recPillText: {
		fontFamily: FONT.mono,
		fontSize: 8,
		color: TEXT.t3,
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	recPillTextActive: { color: ACCENT },
	timeHero: { marginBottom: 10, gap: 3 },
	timeLabel: {
		fontFamily: FONT.mono,
		fontSize: 9,
		color: TEXT.t3,
		letterSpacing: 2,
		textTransform: "uppercase",
	},
	timerBig: {
		fontFamily: FONT.display,
		fontSize: 60,
		color: TEXT.t1,
		letterSpacing: -2,
		lineHeight: 60,
	},
	sessionStatsRow: { flexDirection: "row", gap: 6 },
	sessionStat: {
		flex: 1,
		backgroundColor: BG.b1,
		borderWidth: 1,
		borderColor: LINE.dim,
		borderRadius: R,
		paddingVertical: 8,
		paddingHorizontal: 7,
		minHeight: 50,
	},
	sessionStatWide: {
		flex: 1.4,
		backgroundColor: BG.b1,
		borderWidth: 1,
		borderColor: LINE.dim,
		borderRadius: R,
		paddingVertical: 8,
		paddingHorizontal: 7,
		minHeight: 50,
	},
	sessionStatValue: {
		fontFamily: FONT.display,
		fontSize: 16,
		color: TEXT.t1,
		letterSpacing: -0.4,
		textTransform: "uppercase",
	},
	sessionStatLabel: {
		fontFamily: FONT.mono,
		fontSize: 7,
		color: TEXT.t3,
		letterSpacing: 0.8,
		textTransform: "uppercase",
		marginTop: 2,
	},
	detectRow: { flexDirection: "row", alignItems: "center", gap: 10 },
	detectCount: {
		fontFamily: FONT.display,
		fontSize: 20,
		color: ACCENT,
		letterSpacing: -0.5,
	},
	detectLabel: {
		fontFamily: FONT.mono,
		fontSize: 9,
		color: TEXT.t3,
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	detectDivider: { width: 1, height: 12, backgroundColor: LINE.dim },
	detectHz: { fontFamily: FONT.mono, fontSize: 9, color: TEXT.t3 },

	detectionBanner: {
		backgroundColor: ACCENT,
		borderRadius: R,
		paddingVertical: 12,
		paddingHorizontal: 16,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	detectionCode: {
		fontFamily: FONT.mono,
		fontSize: 9,
		color: "rgba(10,10,11,0.6)",
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	detectionTrick: {
		fontFamily: FONT.display,
		fontSize: 26,
		color: "#0A0A0B",
		letterSpacing: -0.5,
	},
	detectionScore: {
		fontFamily: FONT.display,
		fontSize: 38,
		color: "#0A0A0B",
		letterSpacing: -1,
	},

	listeningBanner: {
		...PANEL.base,
		paddingVertical: 12,
		paddingHorizontal: 14,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
		height: 52,
	},
	listeningText: {
		fontFamily: FONT.mono,
		fontSize: 9,
		color: TEXT.t3,
		letterSpacing: 2,
		textTransform: "uppercase",
	},
	stateChip: {
		borderWidth: 1,
		borderRadius: R,
		paddingHorizontal: 8,
		paddingVertical: 3,
	},
	stateChipText: {
		fontFamily: FONT.mono,
		fontSize: 9,
		letterSpacing: 1,
		textTransform: "uppercase",
	},

	telemetryHeaderRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 7,
	},
	telemetryTitle: {
		fontFamily: FONT.mono,
		fontSize: 9,
		color: TEXT.t2,
		letterSpacing: 1.5,
		textTransform: "uppercase",
	},
	telemetryState: {
		fontFamily: FONT.mono,
		fontSize: 8,
		color: TEXT.t4,
		letterSpacing: 1,
		textTransform: "uppercase",
	},

	imuStrip: {
		flexDirection: "row",
		flexWrap: "wrap",
		borderWidth: 1,
		borderColor: LINE.dim,
		borderRadius: R,
		overflow: "hidden",
		marginBottom: 8,
	},
	imuCell: {
		width: "50%",
		padding: 12,
		minHeight: 62,
		backgroundColor: BG.b2,
		borderRightWidth: 1,
		borderBottomWidth: 1,
		borderRightColor: LINE.dim,
		borderBottomColor: LINE.dim,
	},
	imuCellLast: { borderRightWidth: 0 },
	imuLabel: {
		fontFamily: FONT.mono,
		fontSize: 8,
		color: ACCENT,
		letterSpacing: 0.9,
		textTransform: "uppercase",
	},
	imuValue: {
		fontFamily: FONT.display,
		fontSize: 24,
		color: TEXT.t1,
		marginTop: 4,
		letterSpacing: -0.8,
	},

	sessionBtn: {
		...BTN.base,
		...BTN.primary,
		justifyContent: "center",
		marginHorizontal: 16,
		marginTop: 8,
		marginBottom: 8,
	},
	sessionBtnStop: {
		...BTN.base,
		backgroundColor: "#FF4438",
		borderWidth: 0,
		justifyContent: "center",
		marginHorizontal: 16,
		marginTop: 8,
		marginBottom: 8,
	},
	sessionBtnText: { ...BTN.primaryText },

	feedIndex: { color: TEXT.t4, fontSize: 9, fontFamily: FONT.mono, width: 24 },
	feedScore: {
		color: ACCENT,
		fontSize: 14,
		fontFamily: FONT.display,
		letterSpacing: -0.5,
	},

	debugCell: { flex: 1, ...PANEL.base, padding: 7, alignItems: "center" },
	debugLabel: {
		color: T.CYAN,
		fontSize: 9,
		fontFamily: FONT.mono,
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	debugValue: { color: TEXT.t1, fontSize: 13, fontFamily: FONT.bodySb },
	stateCell: {
		flex: 2,
		borderRadius: R,
		padding: 7,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
	},
	stateText: { fontSize: 11, fontFamily: FONT.bodySb },
	trickBanner: {
		borderRadius: R,
		paddingVertical: 10,
		paddingHorizontal: 16,
		alignItems: "center",
		marginBottom: 6,
	},
	trickText: {
		color: T.ACCENT_INK,
		fontSize: 22,
		fontFamily: FONT.display,
		letterSpacing: -0.5,
		textTransform: "uppercase",
	},
	tipBox: {
		...PANEL.base,
		paddingVertical: 7,
		paddingHorizontal: 12,
		marginBottom: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	tipLabel: {
		color: T.AMBER,
		fontSize: 10,
		fontFamily: FONT.mono,
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	tipText: { color: TEXT.t1, fontSize: 12, fontFamily: FONT.body, flex: 1 },
	fsrRow: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 9,
		...PANEL.base,
		padding: 10,
	},
	fsrCell: { flex: 1, gap: 5 },
	fsrMeta: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	fsrLabel: {
		fontSize: 8,
		fontFamily: FONT.mono,
		letterSpacing: 1,
		textTransform: "uppercase",
	},
	fsrPct: { fontSize: 8, fontFamily: FONT.mono, color: TEXT.t3 },
	fsrBarBg: {
		height: 7,
		backgroundColor: BG.b4,
		borderRadius: 4,
		overflow: "hidden",
	},
	fsrBarFill: { height: "100%", borderRadius: 3 },
	feed: { minHeight: 0 },
	feedEmptyBox: {
		...PANEL.inset,
		padding: 16,
		alignItems: "center",
		marginTop: 6,
	},
	feedEmptyTitle: {
		fontFamily: FONT.mono,
		fontSize: 9,
		color: ACCENT,
		letterSpacing: 1.4,
		textTransform: "uppercase",
		marginBottom: 5,
	},
	feedEmpty: {
		color: TEXT.t3,
		fontFamily: FONT.body,
		textAlign: "center",
		fontSize: 12,
	},
	feedItem: {
		flexDirection: "row",
		alignItems: "center",
		...PANEL.base,
		borderRadius: R,
		padding: 10,
		marginBottom: 6,
		gap: 9,
	},
	feedDot: { width: 8, height: 8, borderRadius: 4 },
	feedMain: { flex: 1 },
	feedTrick: {
		color: TEXT.t1,
		fontFamily: FONT.bodySb,
		fontSize: 13,
		textTransform: "uppercase",
	},
	feedMeta: {
		color: TEXT.t3,
		fontFamily: FONT.mono,
		fontSize: 8,
		letterSpacing: 0.6,
		marginTop: 2,
	},
	feedScoreBadge: {
		minWidth: 42,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: LINE.dim,
		borderRadius: R,
		paddingVertical: 5,
		paddingHorizontal: 7,
		backgroundColor: BG.b1,
	},
});
