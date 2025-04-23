import {
	DynamicText,
	addChorusAtom,
	fontSizeAtom,
	settingsOpenAtom,
	showChordsAtom,
} from "@/components";
import { MinusIcon, PlusIcon } from "@heroicons/react/16/solid";
import { useAtom, useSetAtom } from "jotai";
import {
	DropLeadButton,
	TakeLeadButton,
} from "../../../Contexts/LeaderButtons";
import { ResetIcon } from "./ResetIcon";
import { SidePanel } from "../../SidePanel";
import { useState } from "react";
import { leaderAtom } from "@/components/Contexts/LeaderContext";
import { getLeaderPositionsQuery } from "@/utils/supabase";

function SettingsSidePanel({
	tonality,
	setTonality,
}: {
	tonality?: number;
	setTonality?: (newT: number) => void;
}) {
	const setFontSize = useSetAtom(fontSizeAtom);
	const [showChords, setShowChords] = useAtom(showChordsAtom);
	const [addChorus, setAddChorus] = useAtom(addChorusAtom);
	const [open, setOpen] = useAtom(settingsOpenAtom);
	const [username, setUsername] = useState<string>("");
	const [leader, setLeader] = useAtom(leaderAtom);
	const [leaderList, setLeaderList] = useState<string[]>([]);

	const updateLeaderList = async () => {
		getLeaderPositionsQuery().then(({ data }) => {
			if (data) setLeaderList(data.map((leader) => leader.leader_id));
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
			<div className="flex flex-col gap-4 border border-jubilateBlue-300 bg-jubilateBlue-300 bg-opacity-30 px-4 py-2 rounded-md">
				<div className="flex md:gap-4 gap-2 items-baseline justify-between">
					<h1 className="font-flame text-2xl text-jubilateBlue-500 dark:text-jubilateBlue-400">
						Pseudo
					</h1>
					<input
						id="username"
						type="text"
						onChange={(e) => {
							setUsername(e.target.value);
						}}
						value={username}
						className="rounded-2xl px-4 py-1 mr-4 text-black dark:text-white accent-jubilateBlue-500 dark:accent-jubilateBlue-400 w-full dark:bg-slate-700 bg-jubilateBlue-100"
					/>
				</div>
				<div className="flex gap-4 items-center justify-center">
					<div className="flex md:gap-4 gap-2 items-center">
						<p className="text-jubilateBlue-500 dark:text-jubilateBlue-400 text-sm md:text-base">
							Partager
						</p>
						<TakeLeadButton username={username} />
					</div>
					<div className="flex md:gap-4 gap-2 items-center">
						<p className="text-jubilateRed text-sm md:text-base">Stopper</p>
						<DropLeadButton />
					</div>
				</div>
				{leader && (
					<div className="flex gap-4 items-center justify-center">
						<p className="text-jubilateBlue-500 dark:text-jubilateBlue-400 text-sm md:text-base">
							{leader.leading ? "Leader" : "Follower"}
						</p>
						<DynamicText
							text={leader.id}
							className="dark:text-white text-black text-center"
						/>
					</div>
				)}
				<div className="flex gap-4 flex-col items-center justify-center">
					<p className="text-jubilateBlue-500 dark:text-jubilateBlue-400 font-flame">
						Leaders disponibles
					</p>
					{leaderList.map((leader) => (
						<button
							key={leader}
							type="button"
							className="text-jubilateBlue-500 dark:text-jubilateBlue-400 font-flame"
							onClick={() => {
								setLeader({ id: leader, leading: false });
							}}
						>
							{leader}
						</button>
					))}
					<button type="button" onClick={updateLeaderList}>
						Rafraîchir
					</button>
				</div>
			</div>
		</SidePanel>
	);
}

export { SettingsSidePanel };
