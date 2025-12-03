/**
 * Internationalization (i18n) system for multi-language support.
 * Supports English (en) and Chinese (zh).
 */

export type Language = "en" | "zh";

export interface TranslationSet {
  // Title screen
  title_game: string;
  title_subtitle: string;
  menu_new_game: string;
  menu_continue: string;
  menu_settings: string;
  controls_navigate: string;
  controls_select: string;

  // Pause menu
  pause_title: string;
  pause_resume: string;
  pause_save: string;
  pause_load: string;
  pause_settings: string;
  pause_main_menu: string;
  pause_controls: string;

  // Settings
  settings_title: string;
  settings_music_volume: string;
  settings_sfx_volume: string;
  settings_text_speed: string;
  settings_language: string;
  settings_show_hints: string;
  settings_auto_save: string;
  settings_replay_tutorial: string;
  settings_controls: string;
  speed_slow: string;
  speed_normal: string;
  speed_fast: string;

  // Save/Load
  save_title: string;
  load_title: string;
  save_slot: string;
  save_empty: string;
  save_confirm: string;
  load_confirm: string;
  save_success: string;
  load_success: string;
  save_failed: string;
  load_failed: string;
  no_save_found: string;

  // Tutorial
  tutorial_welcome_title: string;
  tutorial_welcome_msg: string;
  tutorial_movement_title: string;
  tutorial_movement_msg: string;
  tutorial_talk_title: string;
  tutorial_talk_msg: string;
  tutorial_dialogue_title: string;
  tutorial_dialogue_msg: string;
  tutorial_scene_title: string;
  tutorial_scene_msg: string;
  tutorial_pause_title: string;
  tutorial_pause_msg: string;
  tutorial_quest_title: string;
  tutorial_quest_msg: string;
  tutorial_stats_title: string;
  tutorial_stats_msg: string;
  tutorial_complete_title: string;
  tutorial_complete_msg: string;
  tutorial_skip: string;
  tutorial_continue: string;
  tutorial_press_key: string;
  tutorial_restarted: string;

  // Exploration
  explore_press_e: string;
  explore_press_n: string;
  explore_no_npcs: string;

  // Dialogue
  dialogue_loading: string;
  dialogue_error: string;

  // Common
  confirm_yes: string;
  confirm_no: string;
  on: string;
  off: string;
  back: string;

  // Quests
  quest_active: string;
  quest_completed: string;
  quest_available: string;
}

const translations: Record<Language, TranslationSet> = {
  en: {
    // Title screen
    title_game: "Starforge",
    title_subtitle: "AI Narrative Adventure",
    menu_new_game: "New Game",
    menu_continue: "Continue",
    menu_settings: "Settings",
    controls_navigate: "[Arrow Up/Down] Navigate",
    controls_select: "[Enter] Select",

    // Pause menu
    pause_title: "PAUSED",
    pause_resume: "Resume",
    pause_save: "Save Game",
    pause_load: "Load Game",
    pause_settings: "Settings",
    pause_main_menu: "Main Menu",
    pause_controls: "[Arrow Up/Down] Navigate  [Enter] Select  [Esc] Resume",

    // Settings
    settings_title: "Settings",
    settings_music_volume: "Music Volume",
    settings_sfx_volume: "Sound Effects",
    settings_text_speed: "Text Speed",
    settings_language: "Language",
    settings_show_hints: "Show Hints",
    settings_auto_save: "Auto Save",
    settings_replay_tutorial: "Replay Tutorial",
    settings_controls: "[Arrow Up/Down] Navigate  [Left/Right] Adjust  [Esc] Back",
    speed_slow: "Slow",
    speed_normal: "Normal",
    speed_fast: "Fast",

    // Save/Load
    save_title: "Save Game",
    load_title: "Load Game",
    save_slot: "Slot",
    save_empty: "Empty",
    save_confirm: "Save to this slot?",
    load_confirm: "Load this save? Current progress will be lost.",
    save_success: "Game saved!",
    load_success: "Game loaded!",
    save_failed: "Failed to save game",
    load_failed: "Failed to load game",
    no_save_found: "No save file found",

    // Tutorial
    tutorial_welcome_title: "Welcome to Starforge!",
    tutorial_welcome_msg: "This is an AI-powered narrative adventure. Let's learn the basics!",
    tutorial_movement_title: "Movement",
    tutorial_movement_msg: "Use the LEFT and RIGHT arrow keys to move your character.",
    tutorial_talk_title: "Talking to NPCs",
    tutorial_talk_msg: "Press E to see available NPCs in the current scene and start a conversation.",
    tutorial_dialogue_title: "Dialogue Choices",
    tutorial_dialogue_msg: "During conversations, use UP/DOWN arrows to select your response, then press ENTER.",
    tutorial_scene_title: "Changing Scenes",
    tutorial_scene_msg: "Press N to see connected locations and travel to different areas.",
    tutorial_pause_title: "Pause Menu",
    tutorial_pause_msg: "Press ESC anytime to pause the game, save your progress, or access settings.",
    tutorial_quest_title: "Quests & Goals",
    tutorial_quest_msg: "Check the quest panel on the right side to see your current objectives.",
    tutorial_stats_title: "Your Stats",
    tutorial_stats_msg: "Your Confidence, Empathy, Stress, and Reputation affect how NPCs respond to you.",
    tutorial_complete_title: "You're Ready!",
    tutorial_complete_msg: "That's everything! Remember: be kind, make friends, and don't be afraid to ask adults for help.",
    tutorial_skip: "[Esc] Skip Tutorial",
    tutorial_continue: "[Enter] Continue",
    tutorial_press_key: "Press the highlighted key to continue...",
    tutorial_restarted: "Tutorial restarted",

    // Exploration
    explore_press_e: "Press [E] to talk",
    explore_press_n: "Press [N] to travel",
    explore_no_npcs: "No one is here right now",

    // Dialogue
    dialogue_loading: "Thinking...",
    dialogue_error: "Something went wrong",

    // Common
    confirm_yes: "[Y] Yes",
    confirm_no: "[N] No",
    on: "ON",
    off: "OFF",
    back: "Back",

    // Quests
    quest_active: "Active",
    quest_completed: "Completed",
    quest_available: "Available",
  },

  zh: {
    // Title screen
    title_game: "\u661f\u7011",
    title_subtitle: "AI \u654d\u4e8b\u63a2\u7d22",
    menu_new_game: "\u65b0\u904a\u6232",
    menu_continue: "\u7e7c\u7e8c\u904a\u6232",
    menu_settings: "\u8a2d\u5b9a",
    controls_navigate: "[\u4e0a\u4e0b\u65b9\u5411\u9375] \u5c0e\u822a",
    controls_select: "[Enter] \u9078\u64c7",

    // Pause menu
    pause_title: "\u6682\u505c",
    pause_resume: "\u7e7c\u7e8c",
    pause_save: "\u5132\u5b58\u904a\u6232",
    pause_load: "\u8b80\u53d6\u5b58\u6a94",
    pause_settings: "\u8a2d\u5b9a",
    pause_main_menu: "\u4e3b\u9078\u55ae",
    pause_controls: "[\u4e0a\u4e0b] \u5c0e\u822a  [Enter] \u9078\u64c7  [Esc] \u7e7c\u7e8c",

    // Settings
    settings_title: "\u8a2d\u5b9a",
    settings_music_volume: "\u97f3\u6a02\u97f3\u91cf",
    settings_sfx_volume: "\u97f3\u6548\u97f3\u91cf",
    settings_text_speed: "\u6587\u5b57\u901f\u5ea6",
    settings_language: "\u8a9e\u8a00",
    settings_show_hints: "\u986f\u793a\u63d0\u793a",
    settings_auto_save: "\u81ea\u52d5\u5b58\u6a94",
    settings_replay_tutorial: "\u91cd\u65b0\u6559\u5b78",
    settings_controls: "[\u4e0a\u4e0b] \u5c0e\u822a  [\u5de6\u53f3] \u8abf\u6574  [Esc] \u8fd4\u56de",
    speed_slow: "\u6162",
    speed_normal: "\u6b63\u5e38",
    speed_fast: "\u5feb",

    // Save/Load
    save_title: "\u5132\u5b58\u904a\u6232",
    load_title: "\u8b80\u53d6\u5b58\u6a94",
    save_slot: "\u6a94\u4f4d",
    save_empty: "\u7a7a",
    save_confirm: "\u5132\u5b58\u5230\u6b64\u6a94\u4f4d\uff1f",
    load_confirm: "\u8b80\u53d6\u6b64\u5b58\u6a94\uff1f\u76ee\u524d\u9032\u5ea6\u5c07\u6703\u907a\u5931\u3002",
    save_success: "\u904a\u6232\u5df2\u5132\u5b58\uff01",
    load_success: "\u904a\u6232\u5df2\u8b80\u53d6\uff01",
    save_failed: "\u5132\u5b58\u5931\u6557",
    load_failed: "\u8b80\u53d6\u5931\u6557",
    no_save_found: "\u627e\u4e0d\u5230\u5b58\u6a94",

    // Tutorial
    tutorial_welcome_title: "\u6b61\u8fce\u4f86\u5230\u661f\u7011\uff01",
    tutorial_welcome_msg: "\u9019\u662f\u4e00\u500b AI \u9a45\u52d5\u7684\u654d\u4e8b\u63a2\u7d22\u904a\u6232\u3002\u8b93\u6211\u5011\u4f86\u5b78\u7fd2\u57fa\u672c\u64cd\u4f5c\uff01",
    tutorial_movement_title: "\u79fb\u52d5",
    tutorial_movement_msg: "\u4f7f\u7528\u5de6\u53f3\u65b9\u5411\u9375\u79fb\u52d5\u4f60\u7684\u89d2\u8272\u3002",
    tutorial_talk_title: "\u8207 NPC \u5c0d\u8a71",
    tutorial_talk_msg: "\u6309 E \u9375\u67e5\u770b\u76ee\u524d\u5834\u666f\u4e2d\u7684 NPC \u4e26\u958b\u59cb\u5c0d\u8a71\u3002",
    tutorial_dialogue_title: "\u5c0d\u8a71\u9078\u64c7",
    tutorial_dialogue_msg: "\u5c0d\u8a71\u4e2d\uff0c\u4f7f\u7528\u4e0a\u4e0b\u65b9\u5411\u9375\u9078\u64c7\u56de\u61c9\uff0c\u7136\u5f8c\u6309 Enter\u3002",
    tutorial_scene_title: "\u5207\u63db\u5834\u666f",
    tutorial_scene_msg: "\u6309 N \u9375\u67e5\u770b\u9023\u63a5\u7684\u5730\u9ede\u4e26\u524d\u5f80\u4e0d\u540c\u5340\u57df\u3002",
    tutorial_pause_title: "\u6682\u505c\u9078\u55ae",
    tutorial_pause_msg: "\u96a8\u6642\u6309 Esc \u6682\u505c\u904a\u6232\u3001\u5132\u5b58\u9032\u5ea6\u6216\u8a2a\u554f\u8a2d\u5b9a\u3002",
    tutorial_quest_title: "\u4efb\u52d9\u8207\u76ee\u6a19",
    tutorial_quest_msg: "\u67e5\u770b\u53f3\u5074\u7684\u4efb\u52d9\u9762\u677f\u4ee5\u4e86\u89e3\u76ee\u524d\u76ee\u6a19\u3002",
    tutorial_stats_title: "\u4f60\u7684\u5c6c\u6027",
    tutorial_stats_msg: "\u4f60\u7684\u4fe1\u5fc3\u3001\u540c\u7406\u5fc3\u3001\u58d3\u529b\u548c\u8072\u671b\u6703\u5f71\u97ff NPC \u5c0d\u4f60\u7684\u56de\u61c9\u3002",
    tutorial_complete_title: "\u4f60\u5df2\u6e96\u5099\u597d\u4e86\uff01",
    tutorial_complete_msg: "\u5c31\u9019\u6a23\uff01\u8a18\u4f4f\uff1a\u5584\u5f85\u4ed6\u4eba\u3001\u7d50\u4ea4\u670b\u53cb\uff0c\u4e0d\u8981\u5bb3\u6015\u5411\u5927\u4eba\u6c42\u52a9\u3002",
    tutorial_skip: "[Esc] \u8df3\u904e\u6559\u5b78",
    tutorial_continue: "[Enter] \u7e7c\u7e8c",
    tutorial_press_key: "\u6309\u4e0b\u9ad8\u4eae\u7684\u6309\u9375\u4ee5\u7e7c\u7e8c...",
    tutorial_restarted: "\u6559\u5b78\u5df2\u91cd\u65b0\u958b\u59cb",

    // Exploration
    explore_press_e: "\u6309 [E] \u5c0d\u8a71",
    explore_press_n: "\u6309 [N] \u79fb\u52d5",
    explore_no_npcs: "\u9019\u88e1\u73fe\u5728\u6c92\u6709\u4eba",

    // Dialogue
    dialogue_loading: "\u601d\u8003\u4e2d...",
    dialogue_error: "\u51fa\u4e86\u4e9b\u554f\u984c",

    // Common
    confirm_yes: "[Y] \u662f",
    confirm_no: "[N] \u5426",
    on: "\u958b",
    off: "\u95dc",
    back: "\u8fd4\u56de",

    // Quests
    quest_active: "\u9032\u884c\u4e2d",
    quest_completed: "\u5df2\u5b8c\u6210",
    quest_available: "\u53ef\u63a5\u53d6",
  },
};

let currentLanguage: Language = "en";

/**
 * Set the current language
 */
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

/**
 * Get the current language
 */
export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * Get a translated string
 */
export function t(key: keyof TranslationSet): string {
  return translations[currentLanguage][key] || translations.en[key] || key;
}

/**
 * Get all translations for the current language
 */
export function getTranslations(): TranslationSet {
  return translations[currentLanguage];
}

/**
 * Initialize language from saved settings
 */
export function initLanguageFromSettings(lang: Language): void {
  setLanguage(lang);
}
