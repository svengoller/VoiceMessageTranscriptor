import { InterruptionModeIOS } from "expo-av";

// Audio Mode
export const audio_mode = {
    playsInSilentModeIOS: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix  // pauses audio from other apps
}