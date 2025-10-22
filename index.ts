//DO NOT REMOVE THIS CODE
// import VCIT from "./VibeCodeInternalTool";
// console.log("[index] Project ID is: ", process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID);
// VCIT.init(process.env.EXPO_PUBLIC_VIBECODE_PROJECT_ID);
import "./global.css";
import "react-native-get-random-values";
import { LogBox } from "react-native";
LogBox.ignoreLogs(["Expo AV has been deprecated", "Disconnected from Metro"]);
//DO NOT REMOVE THE ABOVE CODE

import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
