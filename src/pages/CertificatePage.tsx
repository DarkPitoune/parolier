const CertificatePage = () => {
	return (
		<div className="max-w-2xl mx-auto p-6 dark:text-white">
			<h1 className="text-2xl font-bold mb-6">
				Certificat MQTT — Installation
			</h1>
			<p className="mb-4 text-gray-600 dark:text-gray-400">
				La connexion au broker MQTT du routeur GL.iNet (192.168.8.1:9003)
				utilise un certificat auto-signé. Chaque appareil doit l'accepter pour
				que le mode présentateur fonctionne.
			</p>

			<section className="mb-6">
				<h2 className="text-lg font-semibold mb-2">
					Option 1 — Exception navigateur (rapide)
				</h2>
				<ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
					<li>
						Ouvrir{" "}
						<a
							href="https://192.168.8.1:9003"
							className="text-jubilateBlue underline"
						>
							https://192.168.8.1:9003
						</a>{" "}
						dans le navigateur
					</li>
					<li>Accepter l'avertissement de sécurité</li>
					<li>
						C'est tout — le navigateur fera confiance à ce certificat pour cette
						session
					</li>
				</ol>
			</section>

			<section className="mb-6">
				<h2 className="text-lg font-semibold mb-2">
					Option 2 — Installer le certificat (permanent)
				</h2>
				<p className="mb-2 text-gray-700 dark:text-gray-300">
					Télécharger{" "}
					<a href="/gl-inet.cert" className="text-jubilateBlue underline">
						gl-inet.cert
					</a>{" "}
					puis :
				</p>
				<ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
					<li>
						<strong>macOS :</strong> Ouvrir le fichier → Ajouter au trousseau →
						Marquer comme « Toujours approuver »
					</li>
					<li>
						<strong>iOS :</strong> Réglages → Général → VPN et gestion des
						appareils → Installer le profil, puis Réglages → Général → Infos →
						Réglages des certificats → Activer
					</li>
					<li>
						<strong>Android :</strong> Réglages → Sécurité → Installer des
						certificats
					</li>
					<li>
						<strong>Windows :</strong> Double-clic → Installer le certificat →
						Ordinateur local → Autorités de certification racines de confiance
					</li>
				</ul>
			</section>

			<p className="text-sm text-gray-500">
				Le certificat expire le 16 octobre 2026.
			</p>
		</div>
	);
};

export { CertificatePage };
