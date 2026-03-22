import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.gamershub.app",
  appName: "Gamers Hub",
  webDir: "dist",
  server: {
    androidScheme: "https",
    // Point to local API during development:
    // url: "http://YOUR_LOCAL_IP:5173",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#080b12",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#080b12",
    },
  },
};

export default config;
