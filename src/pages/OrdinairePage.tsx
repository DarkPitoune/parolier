import { PageHeader, SettingsSidePanel, useLeader } from "@/components";
import { NavigationSidePanel } from "@/components/SidePanel/variants/NavigationSidePanel";
import { DynamicText } from "@/components/DynamicText";
import { useOrdinaireDetail } from "@/hooks/queries/useSongQueries";
import { queryKeys } from "@/utils/queryKeys";
import {
	type OrdinaireDetail,
	newOrdinaireSongMutation,
	supabaseUrl,
} from "@/utils/supabase";
import { transposeLine } from "@/utils/tonalManipulation";
import {
	addChorusAtom,
	showChordsAtom,
} from "@/components/Contexts/SettingsContext";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/16/solid";
import { useAtomValue } from "jotai";
import { Fragment, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import toast from "react-hot-toast";

const ROLE_ORDER = [
	"kyrie",
	"gloria",
	"alleluia",
	"sanctus",
	"anamnese",
	"agnus",
] as const;
const ROLE_LABELS: Record<string, string> = {
	kyrie: "Kyrie",
	gloria: "Gloria",
	alleluia: "Alleluia",
	sanctus: "Sanctus",
	anamnese: "Anamnèse",
	agnus: "Agnus Dei",
};

type OrdinaireSong = OrdinaireDetail["songs"][number];

function sortByRole(songs: OrdinaireSong[]) {
	return [...songs].sort(
		(a, b) =>
			ROLE_ORDER.indexOf(a.ordinaire_role as (typeof ROLE_ORDER)[number]) -
			ROLE_ORDER.indexOf(b.ordinaire_role as (typeof ROLE_ORDER)[number]),
	);
}

function SongSection({
	song,
	tonality,
	showChords,
	addChorus,
}: {
	song: OrdinaireSong;
	tonality: number;
	showChords: boolean;
	addChorus: boolean;
}) {
	const strophes = addChorus
		? song.strophes
		: song.strophes?.filter(
				(strophe: { type?: string; repetition?: boolean }) =>
					strophe.type === "section" || !strophe.repetition,
			);

	return (
		<div className="flex flex-col gap-4">
			{(strophes as Array<{ type?: string; content: unknown }>)?.map(
				(strophe, index) =>
					strophe.type !== "section" ? (
						<div
							data-type={strophe.type}
							className="whitespace-pre-wrap data-[type=chorus]:font-bold data-[type=bridge]:italic data-[type=bridge]:font-semibold grid gap-x-2"
							style={{
								gridTemplateColumns: showChords ? "1fr 3fr" : "1fr",
							}}
							// biome-ignore lint/suspicious/noArrayIndexKey: strophes are ordered
							key={index}
						>
							{(
								strophe.content as Array<{ text: string; chords: string }>
							)?.map((line, lineIndex) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: lines are ordered
								<Fragment key={lineIndex}>
									{showChords && (
										<DynamicText
											className="bg-jubilateBlue-100 dark:bg-slate-600 outline-8 border-jubilateBlue-100 dark:border-slate-600 border-4 px-2 text-black dark:text-white first:rounded-t-md [&:nth-last-child(2)]:rounded-b-md"
											text={transposeLine(line.chords, tonality)}
										/>
									)}
									<DynamicText
										className="text-black dark:text-white"
										text={line.text}
									/>
								</Fragment>
							))}
						</div>
					) : (
						<div className="sticky top-0" key={strophe.content as string}>
							{strophe.content as string}
						</div>
					),
			)}
		</div>
	);
}

export function OrdinairePage() {
	const { ordinaireId } = useParams<{ ordinaireId: string }>();
	const id = ordinaireId ? Number(ordinaireId) : undefined;
	const { data: ordinaire } = useOrdinaireDetail(id);
	const addChorus = useAtomValue(addChorusAtom);
	const showChords = useAtomValue(showChordsAtom);
	const [tonality, setTonality] = useState(0);
	const [isNavigationPanelOpen, setIsNavigationPanelOpen] = useState(false);
	const { leader } = useLeader();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	if (!ordinaire) return null;

	const songs = sortByRole(ordinaire.songs);

	const addPiece = async () => {
		const availableRoles = ROLE_ORDER.filter(
			(role) => !songs.some((s) => s.ordinaire_role === role),
		);
		if (availableRoles.length === 0) {
			toast.error("Tous les rôles sont déjà attribués");
			return;
		}

		const roleChoice = prompt(
			`Rôle du chant ?\nChoix possibles: ${availableRoles.map((r) => ROLE_LABELS[r]).join(", ")}`,
		);
		if (!roleChoice) return;

		const role = availableRoles.find(
			(r) =>
				ROLE_LABELS[r].toLowerCase() === roleChoice.toLowerCase() ||
				r === roleChoice.toLowerCase(),
		);
		if (!role) {
			toast.error("Rôle invalide");
			return;
		}

		const title = prompt(`Titre du ${ROLE_LABELS[role]}`) ?? ROLE_LABELS[role];

		const { error, data } = await newOrdinaireSongMutation(
			title,
			ordinaire.id,
			role,
		);
		if (error) {
			toast.error(`Erreur: ${error.message}`);
		} else {
			queryClient.invalidateQueries({
				queryKey: queryKeys.ordinaires.detail(ordinaire.id),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.songs.ordinaireList(),
			});
			toast.success("Chant ajouté");
			navigate(`/songs/${data.id}/edit`);
		}
	};

	return (
		<div className="bg-white dark:bg-gray-800 min-h-screen">
			<SettingsSidePanel tonality={tonality} setTonality={setTonality} />
			<NavigationSidePanel
				open={isNavigationPanelOpen}
				setOpen={setIsNavigationPanelOpen}
			/>
			<div
				className={clsx(
					"transition-all sticky bg-white dark:bg-gray-800 print:hidden z-10",
					leader ? "top-6" : "top-0",
				)}
			>
				<PageHeader
					variant="detail"
					left={
						<div className="flex items-center gap-2">
							<Link
								to="/ordinaires"
								className="text-jubilateBlue-500 dark:text-jubilateBlue-400 hover:underline"
							>
								Ordinaires
							</Link>
							<span className="text-gray-400">/</span>
							<h1 className="font-flame text-xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
								{ordinaire.name}
							</h1>
						</div>
					}
					right={
						<button
							type="button"
							onClick={() => setIsNavigationPanelOpen(true)}
						>
							<img className="h-12" src="/svg/logo.svg" alt="Logo" />
						</button>
					}
				/>
			</div>
			<div className="flex flex-col gap-2 lg:gap-4 p-4">
				{ordinaire.sheet_music_url && (
					<Link
						to={`${supabaseUrl}/storage/v1/object/public${ordinaire.sheet_music_url}`}
						className="ml-auto px-4 py-2 bg-jubilateBlue-500 dark:bg-jubilateBlue-400 hover:bg-jubilateBlue-600 dark:hover:bg-jubilateBlue-300 text-white rounded-full transition-colors duration-200 flex items-center gap-2"
						title="Voir la partition"
					>
						<DocumentTextIcon className="size-6" />
					</Link>
				)}
				{songs.map((song) => (
					<div key={song.id} className="flex flex-col gap-2">
						<Link
							to={`/songs/${song.id}`}
							className="flex items-center gap-2 font-flame text-lg text-jubilateBlue-500 dark:text-jubilateBlue-400 hover:underline"
						>
							<span className="text-sm font-medium bg-jubilateBlue-100 dark:bg-gray-600 px-2 py-0.5 rounded">
								{ROLE_LABELS[song.ordinaire_role ?? ""] ?? song.ordinaire_role}
							</span>
							{song.title}
						</Link>
						<SongSection
							song={song}
							tonality={tonality}
							showChords={showChords}
							addChorus={addChorus}
						/>
						<hr className="border-jubilateBlue-200 dark:border-gray-600 my-2" />
					</div>
				))}
				{songs.length === 0 && (
					<p className="text-center text-gray-500 dark:text-gray-400 py-8">
						Aucun chant dans cet ordinaire
					</p>
				)}
				<div className="flex justify-center py-4">
					<button
						className="flex items-center gap-2 px-4 py-2 bg-jubilateBlue-500 text-white rounded-full hover:bg-jubilateBlue-600 transition"
						type="button"
						onClick={addPiece}
					>
						<PlusIcon className="w-4 h-4" />
						Ajouter un chant
					</button>
				</div>
			</div>
		</div>
	);
}
