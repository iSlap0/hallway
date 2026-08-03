// =====================================================================
// tailwind-config.js
// -----------------------------------------------------------------
// Loaded via <script> AFTER the Tailwind CDN script tag on every page.
// Registers the iSlap brand palette + fonts as Tailwind utilities, e.g.
//   bg-islap-yellow, text-islap-purple, border-islap-black, font-display
// =====================================================================
tailwind.config = {
  theme: {
    extend: {
      colors: {
        "islap-yellow": "#FFD700",
        "islap-black": "#111111",
        "islap-purple": "#6A0DAD",
      },
      fontFamily: {
        display: ['"Baloo 2"', "sans-serif"],
        body: ['"Inter"', "sans-serif"],
      },
      boxShadow: {
        "islap-hard": "6px 6px 0px 0px rgba(17,17,17,1)",
        "islap-hard-yellow": "6px 6px 0px 0px rgba(255,215,0,1)",
      },
    },
  },
};
