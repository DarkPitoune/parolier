/** @type {import('tailwindcss').Config} */
export default {
	darkMode: "class",
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		fontFamily: {
			flame: ["Flame", "ui-sans-serif", "system-ui", "sans-serif"],
		},
		extend: {
			colors: {
				jubilateBlue: {
					100: "#E9F1FF",
					200: "#D5E2FF",
					300: "#ABC7FF",
					400: "#7A9DF6",
					500: "#4030EC",
					700: "#2B1BD2",
				},
				jubilateRed: "#FF5A5A",
				jubilateGreen: "#00BC48",
				jubilateCyan: "#71D6F2",
				jubilateYellow: "#FFC852",
				jubilatePurple: "#BA7AFB",
			},
		},
	},
	plugins: [],
};
