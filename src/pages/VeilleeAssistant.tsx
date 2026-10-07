import { PageHeader } from "@/components";
import { isDarkAtom } from "@/components/Contexts/SettingsContext";
import { useSetlistHistory } from "@/hooks/queries/useSetlistQueries";
import { useAllTaggedSongs } from "@/hooks/queries/useSongQueries";
import { useVeilleeSuggestion } from "@/hooks/useVeilleeSuggestion";
import { queryKeys } from "@/utils/queryKeys";
import { newVeilleeSetlistMutation } from "@/utils/supabase";
import {
	type DraftItem,
	SILENCE_TEXT,
	type SilenceAmount,
	type SlotKind,
	type VeilleeBrief,
	type VeilleeDraft,
	type VeilleeDuration,
	compactVeilleeSongs,
	estimateDuration,
	usageHints,
} from "@/utils/veillee";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
	ArrowPathIcon,
	ArrowsRightLeftIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	PaperAirplaneIcon,
	PencilIcon,
	SparklesIcon,
	XMarkIcon,
} from "@heroicons/react/16/solid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type Answers = Partial<VeilleeBrief>;
type QuestionId = keyof VeilleeBrief;

interface Choice<T> {
	value: T;
	label: string;
}

const DURATIONS: Choice<VeilleeDuration>[] = [
	{ value: 30, label: "30 min" },
	{ value: 45, label: "45 min" },
	{ value: 60, label: "1 h" },
	{ value: 90, label: "1 h 30" },
];
const YES_NO: Choice<boolean>[] = [
	{ value: true, label: "Oui" },
	{ value: false, label: "Non" },
];
const SILENCES: Choice<SilenceAmount>[] = [
	{ value: "none", label: "Aucun" },
	{ value: "few", label: "Un peu" },
	{ value: "many", label: "Beaucoup" },
];

const QUESTIONS: { id: QuestionId; prompt: string }[] = [
	{ id: "theme", prompt: "Quel est le thème de la veillée ?" },
	{ id: "durationMin", prompt: "Combien de temps dure-t-elle ?" },
	{ id: "adoration", prompt: "Y aura-t-il un temps d'adoration ?" },
	{ id: "silences", prompt: "Des silences pendant l'adoration ?" },
	{ id: "marie", prompt: "Terminer par un chant à Marie ?" },
];

const SLOT_STYLES: Record<SlotKind, { label: string; className: string }> = {
	louange: { label: "Louange", className: "bg-jubilateYellow-500 text-black" },
	esprit: { label: "Esprit Saint", className: "bg-jubilateRed-500 text-white" },
	adoration: {
		label: "Adoration",
		className: "bg-jubilatePurple-500 text-white",
	},
	marie: { label: "Marie", className: "bg-jubilateCyan-500 text-black" },
	silence: {
		label: "Silence",
		className: "bg-gray-300 text-black dark:bg-gray-600 dark:text-white",
	},
};

const isAsked = (id: QuestionId, answers: Answers) =>
	id !== "silences" || answers.adoration === true;

const toBrief = (answers: Answers): VeilleeBrief | null => {
	const { theme, durationMin, adoration, marie } = answers;
	if (!theme || !durationMin || adoration === undefined) return null;
	if (marie === undefined) return null;
	const silences = adoration ? answers.silences : "none";
	if (!silences) return null;
	return { theme, durationMin, adoration, silences, marie };
};

const sameBrief = (a: VeilleeBrief | null, b: VeilleeBrief | null) =>
	JSON.stringify(a) === JSON.stringify(b);

const answerLabel = (id: QuestionId, answers: Answers): string => {
	switch (id) {
		case "theme":
			return answers.theme ?? "";
		case "durationMin":
			return (
				DURATIONS.find((c) => c.value === answers.durationMin)?.label ?? ""
			);
		case "silences":
			return SILENCES.find((c) => c.value === answers.silences)?.label ?? "";
		default:
			return answers[id] ? "Oui" : "Non";
	}
};

const AssistantBubble = ({ children }: { children: ReactNode }) => (
	<div className="self-start max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-700 px-4 py-2">
		{children}
	</div>
);

const Chips = <T,>({
	choices,
	selected,
	onPick,
}: {
	choices: Choice<T>[];
	selected: T | undefined;
	onPick: (value: T) => void;
}) => (
	<div className="flex flex-wrap gap-2 self-end justify-end">
		{choices.map((choice) => (
			<button
				key={choice.label}
				type="button"
				onClick={() => onPick(choice.value)}
				className={clsx(
					"px-4 py-1.5 rounded-full border border-jubilateBlue-500 dark:border-jubilateBlue-400 transition",
					choice.value === selected
						? "bg-jubilateBlue-500 text-white"
						: "text-jubilateBlue-500 dark:text-jubilateBlue-300 hover:bg-jubilateBlue-100 dark:hover:bg-gray-700",
				)}
			>
				{choice.label}
			</button>
		))}
	</div>
);

const ThemeInput = ({
	initial,
	onSubmit,
}: {
	initial: string;
	onSubmit: (theme: string) => void;
}) => {
	const [value, setValue] = useState(initial);
	return (
		<form
			className="flex gap-2 self-stretch"
			onSubmit={(e) => {
				e.preventDefault();
				if (value.trim()) onSubmit(value.trim());
			}}
		>
			<input
				type="text"
				autoFocus
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder="La confiance, le désert, la joie…"
				className="grow px-3 py-2 rounded-full border border-jubilateBlue-100 dark:border-slate-500 bg-transparent outline-hidden focus:border-jubilateBlue-500 dark:focus:border-jubilateBlue-400"
			/>
			<button
				type="submit"
				disabled={!value.trim()}
				aria-label="Valider le thème"
				className="p-2.5 rounded-full bg-jubilateBlue-500 hover:bg-jubilateBlue-600 disabled:opacity-50 text-white"
			>
				<PaperAirplaneIcon className="size-5" />
			</button>
		</form>
	);
};

const IconButton = ({
	label,
	onClick,
	disabled,
	children,
}: {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	children: ReactNode;
}) => (
	<button
		type="button"
		aria-label={label}
		title={label}
		onClick={onClick}
		disabled={disabled}
		className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
	>
		{children}
	</button>
);

const DraftRow = ({
	item,
	index,
	count,
	titleOf,
	swapChoices,
	onMove,
	onRemove,
	onSwap,
}: {
	item: DraftItem;
	index: number;
	count: number;
	titleOf: (id: number) => string;
	swapChoices: number[];
	onMove: (delta: -1 | 1) => void;
	onRemove: () => void;
	onSwap: (songId: number) => void;
}) => {
	const darkMode = useAtomValue(isDarkAtom);
	const slot = SLOT_STYLES[item.slot];
	return (
		<li className="flex items-start gap-2 py-3">
			<span
				className={clsx(
					"shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
					slot.className,
				)}
			>
				{slot.label}
			</span>
			<div className="flex flex-col grow min-w-0">
				{item.songId === null ? (
					<span className="italic text-gray-500 dark:text-gray-400">
						{SILENCE_TEXT}
					</span>
				) : (
					<>
						<span className="font-medium">{titleOf(item.songId)}</span>
						{item.reasoning && (
							<span className="text-sm text-gray-500 dark:text-gray-400">
								{item.reasoning}
							</span>
						)}
					</>
				)}
			</div>
			<div className="flex shrink-0">
				<IconButton
					label="Monter"
					onClick={() => onMove(-1)}
					disabled={index === 0}
				>
					<ChevronUpIcon className="size-4" />
				</IconButton>
				<IconButton
					label="Descendre"
					onClick={() => onMove(1)}
					disabled={index === count - 1}
				>
					<ChevronDownIcon className="size-4" />
				</IconButton>
				{swapChoices.length > 0 && (
					<Menu>
						<MenuButton
							aria-label="Remplacer"
							title="Remplacer"
							className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
						>
							<ArrowsRightLeftIcon className="size-4" />
						</MenuButton>
						<MenuItems
							anchor="bottom end"
							className={clsx(
								"z-30 flex flex-col rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white shadow-xl border border-gray-200 dark:border-gray-600 py-1",
								darkMode && "dark",
							)}
						>
							{swapChoices.map((id) => (
								<MenuItem key={id}>
									<button
										type="button"
										onClick={() => onSwap(id)}
										className="text-left px-4 py-2 data-focus:bg-jubilateBlue-100 dark:data-focus:bg-gray-700"
									>
										{titleOf(id)}
									</button>
								</MenuItem>
							))}
						</MenuItems>
					</Menu>
				)}
				<IconButton label="Retirer" onClick={onRemove}>
					<XMarkIcon className="size-4" />
				</IconButton>
			</div>
		</li>
	);
};

const VeilleeAssistant = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: allSongs } = useAllTaggedSongs();
	const { data: history = [], isPending: historyPending } = useSetlistHistory();
	const suggestion = useVeilleeSuggestion();

	const [answers, setAnswers] = useState<Answers>({});
	const [editing, setEditing] = useState<QuestionId | null>(null);
	const [draft, setDraft] = useState<VeilleeDraft | null>(null);
	const [draftBrief, setDraftBrief] = useState<VeilleeBrief | null>(null);

	useEffect(() => {
		document.title = "Préparer une veillée - Parolier";
	}, []);

	const songs = useMemo(
		() =>
			allSongs
				? compactVeilleeSongs(allSongs, usageHints(history, allSongs))
				: null,
		[allSongs, history],
	);
	const titles = useMemo(
		() => new Map(allSongs?.map((s) => [s.id, s.title])),
		[allSongs],
	);
	const titleOf = (id: number) => titles.get(id) ?? `#${id}`;

	const brief = toBrief(answers);
	const asked = QUESTIONS.filter((q) => isAsked(q.id, answers));
	const active =
		editing ?? asked.find((q) => answers[q.id] === undefined)?.id ?? null;
	const visible = active
		? asked.slice(0, asked.findIndex((q) => q.id === active) + 1)
		: asked;
	const ready = songs !== null && !historyPending;
	const stale = draft !== null && !sameBrief(brief, draftBrief);

	const generate = (forBrief: VeilleeBrief) => {
		if (!songs) return;
		suggestion.mutate(
			{ brief: forBrief, songs },
			{
				onSuccess: (result) => {
					setDraft(result);
					setDraftBrief(forBrief);
				},
			},
		);
	};

	const answer = <K extends QuestionId>(id: K, value: VeilleeBrief[K]) => {
		const next = { ...answers, [id]: value };
		setAnswers(next);
		setEditing(null);
		const nextBrief = toBrief(next);
		if (nextBrief && !draft && !suggestion.isPending && ready) {
			generate(nextBrief);
		}
	};

	const save = useMutation({
		mutationFn: (items: DraftItem[]) =>
			newVeilleeSetlistMutation(
				`Veillée — ${answers.theme} — ${new Date().toLocaleDateString("fr-FR")}`,
				items.map((item) =>
					item.songId === null
						? { text: SILENCE_TEXT }
						: { songId: item.songId },
				),
			),
		onSuccess: ({ data, error }) => {
			if (error || !data) {
				toast.error("Erreur lors de la création de la setlist");
				return;
			}
			queryClient.invalidateQueries({ queryKey: queryKeys.setlists.list() });
			queryClient.invalidateQueries({
				queryKey: queryKeys.setlists.history(),
			});
			navigate(`/setlists/${data.id}/edit`);
		},
		onError: () => toast.error("Erreur lors de la création de la setlist"),
	});

	const updateItems = (update: (items: DraftItem[]) => DraftItem[]) =>
		setDraft((current) =>
			current ? { ...current, items: update(current.items) } : current,
		);

	const move = (index: number, delta: -1 | 1) =>
		updateItems((items) => {
			const next = [...items];
			[next[index], next[index + delta]] = [next[index + delta], next[index]];
			return next;
		});

	const remove = (index: number) =>
		updateItems((items) => items.filter((_, i) => i !== index));

	const swap = (index: number, songId: number) =>
		updateItems((items) =>
			items.map((item, i) =>
				i === index && item.songId !== null
					? {
							...item,
							key: `song-${songId}`,
							songId,
							reasoning: undefined,
							alternatives: [
								item.songId,
								...(item.alternatives ?? []).filter((id) => id !== songId),
							],
						}
					: item,
			),
		);

	const inDraft = new Set(draft?.items.map((i) => i.songId));

	const renderInput = (id: QuestionId) => {
		switch (id) {
			case "theme":
				return (
					<ThemeInput
						initial={answers.theme ?? ""}
						onSubmit={(theme) => answer("theme", theme)}
					/>
				);
			case "durationMin":
				return (
					<Chips
						choices={DURATIONS}
						selected={answers.durationMin}
						onPick={(value) => answer("durationMin", value)}
					/>
				);
			case "silences":
				return (
					<Chips
						choices={SILENCES}
						selected={answers.silences}
						onPick={(value) => answer("silences", value)}
					/>
				);
			default:
				return (
					<Chips
						choices={YES_NO}
						selected={answers[id]}
						onPick={(value) => answer(id, value)}
					/>
				);
		}
	};

	return (
		<div className="min-h-screen bg-white dark:bg-gray-800 text-black dark:text-white">
			<PageHeader variant="detail" title="Préparer une veillée" />
			<div className="flex flex-col md:flex-row gap-6 p-4 md:p-6">
				<section className="flex flex-col gap-3 md:w-1/2">
					{visible.map((question) => (
						<div key={question.id} className="flex flex-col gap-3">
							<AssistantBubble>{question.prompt}</AssistantBubble>
							{question.id === active ? (
								renderInput(question.id)
							) : (
								<button
									type="button"
									onClick={() => setEditing(question.id)}
									className="self-end flex items-center gap-2 max-w-[85%] rounded-2xl rounded-tr-sm bg-jubilateBlue-500 text-white px-4 py-2 text-left"
								>
									{answerLabel(question.id, answers)}
									<PencilIcon className="size-3 shrink-0 opacity-70" />
								</button>
							)}
						</div>
					))}

					{!active && suggestion.isPending && (
						<AssistantBubble>
							<span className="flex items-center gap-2">
								<span className="inline-block animate-spin rounded-full size-4 border-b-2 border-jubilateBlue-500" />
								Je prépare une proposition…
							</span>
						</AssistantBubble>
					)}

					{!active && !suggestion.isPending && !ready && (
						<AssistantBubble>Je charge le répertoire…</AssistantBubble>
					)}

					{!active && suggestion.isError && (
						<div className="self-start flex flex-col gap-2 max-w-[85%] rounded-2xl rounded-tl-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-4 py-2">
							{suggestion.error.message}
							{brief && (
								<button
									type="button"
									onClick={() => generate(brief)}
									className="self-start flex items-center gap-1 underline"
								>
									<ArrowPathIcon className="size-4" />
									Réessayer
								</button>
							)}
						</div>
					)}

					{!active && brief && !draft && ready && suggestion.isIdle && (
						<button
							type="button"
							onClick={() => generate(brief)}
							className="self-center flex items-center gap-2 px-4 py-2 bg-jubilateBlue-500 hover:bg-jubilateBlue-600 text-white rounded-full font-medium"
						>
							<SparklesIcon className="size-5" />
							Proposer des chants
						</button>
					)}

					{draft && !suggestion.isPending && (
						<AssistantBubble>
							{draft.summary || "Voici une proposition. Ajuste-la à ta guise."}
						</AssistantBubble>
					)}

					{!active && stale && brief && !suggestion.isPending && (
						<button
							type="button"
							onClick={() => generate(brief)}
							className="self-center flex items-center gap-2 px-4 py-2 bg-jubilateBlue-500 hover:bg-jubilateBlue-600 text-white rounded-full font-medium"
						>
							<ArrowPathIcon className="size-5" />
							Refaire avec ces réponses
						</button>
					)}
				</section>

				{draft && (
					<section className="flex flex-col gap-3 md:w-1/2">
						<div className="flex items-baseline justify-between gap-2">
							<h2 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
								Proposition
							</h2>
							<span className="text-sm text-gray-500 dark:text-gray-400">
								≈ {estimateDuration(draft.items)} min
							</span>
						</div>
						<ul
							className={clsx(
								"flex flex-col divide-y divide-gray-200 dark:divide-gray-600",
								suggestion.isPending && "opacity-50",
							)}
						>
							{draft.items.map((item, index) => (
								<DraftRow
									key={item.key}
									item={item}
									index={index}
									count={draft.items.length}
									titleOf={titleOf}
									swapChoices={(item.alternatives ?? []).filter(
										(id) => !inDraft.has(id),
									)}
									onMove={(delta) => move(index, delta)}
									onRemove={() => remove(index)}
									onSwap={(songId) => swap(index, songId)}
								/>
							))}
						</ul>
						<div className="flex justify-between gap-2 pt-2">
							<button
								type="button"
								onClick={() => brief && generate(brief)}
								disabled={!brief || suggestion.isPending}
								className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
							>
								<ArrowPathIcon className="size-4" />
								Régénérer
							</button>
							<button
								type="button"
								onClick={() => save.mutate(draft.items)}
								disabled={
									save.isPending ||
									suggestion.isPending ||
									!draft.items.some((i) => i.songId !== null)
								}
								className="px-4 py-2 rounded-full bg-jubilateBlue-500 hover:bg-jubilateBlue-600 dark:bg-jubilateBlue-400 dark:hover:bg-jubilateBlue-300 disabled:opacity-50 text-white font-medium"
							>
								{save.isPending ? "Création..." : "Créer la setlist"}
							</button>
						</div>
					</section>
				)}
			</div>
		</div>
	);
};

export { VeilleeAssistant };
