import { Catalogue } from "./catalogue";
import { loadConfig } from "./config";
import { startBot } from "./telegram";

const config = loadConfig();
const catalogue = new Catalogue(config.cataloguePath);
const bot = startBot(config, catalogue);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.once(signal, () => {
		void bot.stop().then(() => process.exit(0));
	});
}
