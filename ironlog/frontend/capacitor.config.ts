import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.ironlog.local",
  appName: "IronLog录铁",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
