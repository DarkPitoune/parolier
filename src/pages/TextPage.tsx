import { PageHeader } from "@/components";
import { type Text, textQuery } from "@/utils/supabase";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function TextPage() {
	const { textId } = useParams();
	const [text, setText] = useState<Text>();
	const navigate = useNavigate();
	const tapCount = useRef(0);
	const tapTimer = useRef<ReturnType<typeof setTimeout>>();

	const handleTitleTap = () => {
		tapCount.current += 1;
		clearTimeout(tapTimer.current);
		if (tapCount.current >= 3) {
			tapCount.current = 0;
			navigate(`/texts/${text?.id}/edit`);
			return;
		}
		tapTimer.current = setTimeout(() => {
			tapCount.current = 0;
		}, 500);
	};

	useEffect(() => {
		if (textId) {
			textQuery(Number(textId)).then(({ data }) => {
				if (data) setText(data);
			});
		}
	}, [textId]);

	if (!text) return null;

	return (
		<div>
			<PageHeader
				variant="detail"
				title={
					// biome-ignore lint/a11y/useKeyWithClickEvents: hidden triple-tap shortcut; a key handler would announce the title as a button
					<h1
						className="font-flame text-xl lg:text-3xl text-jubilateBlue-500 dark:text-jubilateBlue-400 select-none"
						onClick={handleTitleTap}
					>
						{text.id}. {text.title}
					</h1>
				}
			/>
			<div className="p-6">
				<div className="max-w-4xl mx-auto">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
							{text.title}
						</h2>
						<div className="whitespace-pre-wrap text-black dark:text-white leading-relaxed">
							{text.content}
						</div>
						<div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
							Créé le{" "}
							{new Date(text.created_at).toLocaleDateString("fr-FR", {
								year: "numeric",
								month: "long",
								day: "numeric",
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export { TextPage };
