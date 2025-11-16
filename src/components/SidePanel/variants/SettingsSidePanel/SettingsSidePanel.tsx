import {
	DynamicText,
	addChorusAtom,
	fontSizeAtom,
	settingsOpenAtom,
	showChordsAtom,
} from "@/components";
import { leaderAtom, useLeader } from "@/components/Contexts/LeaderContext";
import {
	type LeaderPositions,
	getLeaderPositionsQuery,
	type TaggedSong,
} from "@/utils/supabase";
import { MinusIcon, PlusIcon } from "@heroicons/react/16/solid";
import { PencilIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useAtom, useSetAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	DropLeadButton,
	TakeLeadButton,
} from "../../../Contexts/LeaderButtons";
import { SidePanel } from "../../SidePanel";
import { ResetIcon } from "./ResetIcon";

const usernameAtom = atomWithStorage<string>(
	"username",
	"",
	createJSONStorage(() => localStorage),
);

function SettingsSidePanel({
	tonality,
	setTonality,
	song,
}: {
	tonality?: number;
	setTonality?: (newT: number) => void;
	song?: TaggedSong;
}) {
	const setFontSize = useSetAtom(fontSizeAtom);
	const [showChords, setShowChords] = useAtom(showChordsAtom);
	const [isLeaderPanelOpen, setIsLeaderPanelOpenInternal] = useState(true);
	const [addChorus, setAddChorus] = useAtom(addChorusAtom);
	const [open, setOpen] = useAtom(settingsOpenAtom);
	const [username, setUsername] = useAtom(usernameAtom);
	const [leader, setLeader] = useAtom(leaderAtom);
	const [leaderList, setLeaderList] = useState<LeaderPositions>([]);
	const navigate = useNavigate();

	const { takeLead } = useLeader();

	const updateLeaderList = async () => {
		getLeaderPositionsQuery().then(({ data }) => {
			if (data) setLeaderList(data);
		});
	};

	function handleFontChange(increment: number) {
		setFontSize((fontSize) => {
			if (increment === 0) return 2;
			if (fontSize + increment < 0) return 0;
			if (fontSize + increment > 9) return 9;
			return fontSize + increment;
		});
	}

	const setIsLeaderPanelOpen = (isLeader: boolean) => {
		setIsLeaderPanelOpenInternal(isLeader);
		if (!isLeader) updateLeaderList();
	};

	return (
		<SidePanel open={open} onClose={() => setOpen(false)} title="Préférences">
			<div className="flex flex-col gap-2" aria-label="font size choice">
				<div className="flex justify-between">
					<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
						Police
					</h1>
					<div className="flex gap-4">
						<button onClick={() => handleFontChange(-1)} type="button">
							<MinusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
						</button>
						<button onClick={() => handleFontChange(1)} type="button">
							<PlusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
						</button>
						<button onClick={() => handleFontChange(0)} type="button">
							<ResetIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
						</button>
					</div>
				</div>
				<DynamicText
					text="Amen de gloire"
					className="dark:text-white text-center"
				/>
			</div>

			<div className="flex justify-between gap-4" aria-label="chords choice">
				<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
					Accords
				</h1>

				<input
					id="chordsCheckbox"
					type="checkbox"
					checked={showChords}
					onChange={(e) => {
						setShowChords(e.target.checked);
					}}
					className="w-5 h-5 accent-jubilateBlue-500 dark:accent-jubilateBlue-400 rounded-2xl"
				/>
			</div>

			{tonality !== undefined && setTonality && (
				<div className="flex flex-col gap-2" aria-label="tonality choice">
					<div className="flex justify-between">
						<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
							Transposer
						</h1>
						<div className="flex gap-4">
							<button onClick={() => setTonality(tonality - 1)} type="button">
								<MinusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
							</button>
							<button onClick={() => setTonality(tonality + 1)} type="button">
								<PlusIcon className="w-8 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
							</button>
							<button
								onClick={() => {
									setTonality(0);
								}}
								type="button"
							>
								<ResetIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
							</button>
						</div>
					</div>
					<DynamicText
						text={tonality.toString()}
						className="dark:text-white text-black text-center"
					/>
				</div>
			)}

			<div
				className="flex items-center justify-between gap-4"
				aria-label="chorus choice"
			>
				<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
					Refrains
				</h1>

				<input
					id="chordsCheckbox"
					type="checkbox"
					checked={addChorus}
					onChange={(e) => {
						setAddChorus(e.target.checked);
					}}
					className="size-5 rounded-2xl accent-jubilateBlue-500 dark:accent-jubilateBlue-400"
				/>
			</div>

			<div className="flex flex-col gap-4 border border-jubilateBlue-300 bg-jubilateBlue-300 bg-opacity-30 px-4 py-2 rounded-md items-center">
				<h2 className="text-center font-flame text-jubilateBlue-500 dark:text-jubilateBlue-400 text-2xl">
					Leader de chant
				</h2>
				{leader ? (
					<>
						<p className="text-jubilateBlue-500 dark:text-jubilateBlue-400 text-sm md:text-base">
							{leader.leading
								? `Vous (${leader.id}) partagez votre chant`
								: `Vous suivez ${leader.id}`}
						</p>
						<button
							type="button"
							onClick={() => setLeader(null)}
							className="flex md:gap-4 gap-2 items-center"
						>
							<p className="text-jubilateRed text-sm md:text-base">Stopper</p>
							<DropLeadButton />
						</button>
					</>
				) : (
					<>
						<div className="flex gap-2 w-fit p-1 rounded-full bg-slate-300 dark:bg-slate-700">
							<button
								type="button"
								onClick={() => setIsLeaderPanelOpen(true)}
								className={clsx([
									"rounded-full px-2 transition-colors",
									isLeaderPanelOpen
										? "bg-white dark:bg-slate-800"
										: "bg-transparent",
								])}
							>
								Diriger
							</button>
							<button
								type="button"
								onClick={() => setIsLeaderPanelOpen(false)}
								className={clsx([
									"rounded-full px-2 py-1 transition-colors",
									!isLeaderPanelOpen
										? "bg-white dark:bg-slate-800"
										: "bg-transparent",
								])}
							>
								Suivre
							</button>
						</div>
						{!leader && isLeaderPanelOpen ? (
							<form
								className="flex flex-col gap-4 items-center"
								onSubmit={(e) => {
									e.preventDefault();
									takeLead(username);
								}}
							>
								<div className="flex md:gap-4 gap-2 items-baseline justify-between">
									<h1 className="font-flame text-xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
										Pseudo
									</h1>
									<input
										id="username"
										type="text"
										onChange={(e) => {
											setUsername(e.target.value);
										}}
										value={username}
										className="rounded-2xl px-4 py-1 mr-4 text-black dark:text-white outline outline-jubilateBlue-300 focus:outline-jubilateBlue-500 dark:accent-jubilateBlue-400 w-full dark:bg-slate-700 bg-jubilateBlue-100"
									/>
								</div>
								<button
									type="submit"
									className="flex md:gap-4 gap-2 items-center"
								>
									<p className="text-jubilateBlue-500 dark:text-jubilateBlue-400 text-sm md:text-base">
										Partager
									</p>
									<TakeLeadButton />
								</button>
							</form>
						) : (
							<>
								<div className="flex gap-4 flex-col w-full justify-center">
									<div className="flex items-center justify-between">
										<p className="text-jubilateBlue-500 dark:text-jubilateBlue-400 font-flame">
											Leaders disponibles
										</p>
										<button type="button" onClick={updateLeaderList}>
											<ResetIcon className="w-6 fill-jubilateBlue-500 dark:fill-jubilateBlue-400" />
										</button>
									</div>
									<div className="bg-slate-300 dark:bg-slate-700 rounded-lg flex flex-col items-stretch">
										{leaderList.map((leader) => (
											<button
												key={leader.leader_id}
												type="button"
												className="text-jubilateBlue-500 dark:text-jubilateBlue-400 font-flame"
												onClick={() => {
													setLeader({ id: leader.leader_id, leading: false });
													if (leader.song !== null)
														navigate(`/songs/${leader.song}`);
												}}
											>
												{leader.leader_id}
											</button>
										))}
									</div>
								</div>
							</>
						)}
					</>
				)}
			</div>
			{song && (
				<div className="flex flex-col gap-2 border border-jubilateBlue-300 bg-jubilateBlue-300 bg-opacity-30 px-4 py-2 rounded-md">
					<h2 className="text-center font-flame text-jubilateBlue-500 dark:text-jubilateBlue-400 text-2xl">
						Administration
					</h2>
					<Link
						to={`/songs/${song.id}/edit`}
						className="flex items-center justify-center gap-2 bg-jubilateBlue-500 hover:bg-jubilateBlue-600 dark:bg-jubilateBlue-400 dark:hover:bg-jubilateBlue-300 text-white px-4 py-2 rounded-md transition-colors"
					>
						<PencilIcon className="h-4 w-4" />
						<span className="text-sm font-medium">Modifier le chant</span>
					</Link>
				</div>
			)}
		</SidePanel>
	);
}

export { SettingsSidePanel };
