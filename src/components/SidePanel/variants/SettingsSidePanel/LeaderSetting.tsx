import { leaderAtom, useLeader } from "@/components/Contexts/LeaderContext";
import {
	type LeaderPositions,
	getLeaderPositionsQuery,
} from "@/utils/supabase";
import clsx from "clsx";
import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResetIcon } from "./ResetIcon";
import { ACCENT_FILL, SettingRow } from "./SettingsControls";

const usernameAtom = atomWithStorage<string>(
	"username",
	"",
	createJSONStorage(() => localStorage),
);

type OpenPanel = "lead" | "follow" | null;

function PickButton({
	expanded,
	onClick,
	children,
}: { expanded: boolean; onClick: () => void; children: string }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-expanded={expanded}
			className={clsx(
				"rounded-full border px-3 py-1 text-[13px] transition-colors",
				expanded
					? "border-jubilateBlue-500 dark:border-jubilateBlue-400 bg-white dark:bg-gray-800 text-jubilateBlue-500 dark:text-jubilateBlue-400"
					: "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400",
			)}
		>
			{children}
		</button>
	);
}

/**
 * Collapsed until asked: the pseudo field and the device list only appear once
 * someone picks Diriger or Suivre, and both give way to a single status row as
 * soon as a lead is taken or followed.
 */
function LeaderSetting() {
	const [leader, setLeader] = useAtom(leaderAtom);
	const [username, setUsername] = useAtom(usernameAtom);
	const [leaderList, setLeaderList] = useState<LeaderPositions>([]);
	const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
	const navigate = useNavigate();
	const { takeLead } = useLeader();

	const refreshLeaderList = () => {
		getLeaderPositionsQuery().then(({ data }) => {
			if (data) setLeaderList(data);
		});
	};

	const togglePanel = (panel: Exclude<OpenPanel, null>) => {
		setOpenPanel((current) => (current === panel ? null : panel));
		if (panel === "follow") refreshLeaderList();
	};

	if (leader) {
		return (
			<SettingRow
				ariaLabel="leader status"
				name={
					<>
						<span
							aria-hidden="true"
							className="size-2 shrink-0 rounded-full bg-jubilateGreen-500 ring-4 ring-jubilateGreen-500/25"
						/>
						{leader.leading
							? `Vous partagez (${leader.id})`
							: `Vous suivez ${leader.id}`}
					</>
				}
			>
				<button
					type="button"
					onClick={() => setLeader(null)}
					className="shrink-0 rounded-full border border-jubilateRed-400 px-3 py-1 text-[13px] text-jubilateRed-400 transition-colors hover:bg-jubilateRed-400/10"
				>
					Arrêter
				</button>
			</SettingRow>
		);
	}

	return (
		<>
			<SettingRow ariaLabel="leader choice" name="Leader de chant">
				<div className="flex shrink-0 gap-2">
					<PickButton
						expanded={openPanel === "lead"}
						onClick={() => togglePanel("lead")}
					>
						Diriger
					</PickButton>
					<PickButton
						expanded={openPanel === "follow"}
						onClick={() => togglePanel("follow")}
					>
						Suivre
					</PickButton>
				</div>
			</SettingRow>

			{openPanel === "lead" && (
				<form
					className="flex flex-col gap-2.5 p-3.5"
					onSubmit={(e) => {
						e.preventDefault();
						// Stored and published as one value, or the field and the id
						// people see next to your name would drift apart.
						const id = username.trim();
						setUsername(id);
						takeLead(id);
					}}
				>
					<input
						type="text"
						value={username}
						aria-label="Votre pseudo"
						placeholder="Votre pseudo"
						onChange={(e) => setUsername(e.target.value)}
						className="w-full rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-1.5 text-sm text-black dark:text-white outline-jubilateBlue-500 dark:outline-jubilateBlue-400"
					/>
					<button
						type="submit"
						disabled={username.trim() === ""}
						className="self-start rounded-full bg-jubilateBlue-500 dark:bg-jubilateBlue-400 px-4 py-1.5 text-[13px] font-medium text-white dark:text-gray-900 transition-opacity disabled:opacity-50"
					>
						Partager mon chant
					</button>
				</form>
			)}

			{openPanel === "follow" && (
				<div className="flex flex-col gap-2.5 p-3.5">
					<div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
						<span>Appareils qui partagent</span>
						<button
							type="button"
							onClick={refreshLeaderList}
							aria-label="Actualiser la liste"
						>
							<ResetIcon className={clsx("w-3.5", ACCENT_FILL)} />
						</button>
					</div>
					{leaderList.length === 0 ? (
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Personne ne partage son chant pour l'instant.
						</p>
					) : (
						<div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600 divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
							{leaderList.map((position) => (
								<button
									key={position.leader_id}
									type="button"
									className="px-3 py-2 text-left text-sm transition-colors hover:bg-jubilateBlue-100 dark:hover:bg-slate-700"
									onClick={() => {
										setLeader({ id: position.leader_id, leading: false });
										if (position.song !== null)
											navigate(`/songs/${position.song}`);
									}}
								>
									{position.leader_id}
								</button>
							))}
						</div>
					)}
				</div>
			)}
		</>
	);
}

export { LeaderSetting };
