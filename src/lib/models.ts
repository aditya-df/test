// import { anthropic } from "@ai-sdk/anthropic";
// import { fireworks } from "@ai-sdk/fireworks";
// import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";

import {
  customProvider,
  // extractReasoningMiddleware,
  wrapLanguageModel,
  defaultSettingsMiddleware,
} from "ai";

// custom provider with different model settings:
export const myProvider = customProvider({
  languageModels: {
    "gemini-2.5-pro": wrapLanguageModel({
      middleware: defaultSettingsMiddleware({
        settings: {
          providerOptions: {
            google: {
              thinking: { type: "enabled", budgetTokens: 5000 },
            },
          },
        },
      }),
      model: google("gemini-2.5-pro"),
    }),
    "gemini-2.5-flash": wrapLanguageModel({
      middleware: defaultSettingsMiddleware({
        settings: {
          providerOptions: {
            google: {
              thinking: { type: "enabled", budgetTokens: 5000 },
            },
          },
        },
      }),
      model: google("gemini-2.5-flash"),
    }),

    "gemini-2.5-flash-lite": wrapLanguageModel({
      middleware: defaultSettingsMiddleware({
        settings: {
          providerOptions: {
            google: {
              thinking: { type: "enabled", budgetTokens: 5000 },
            },
          },
        },
      }),
      model: google("gemini-2.5-flash-lite"),
    }),
    // "gemini-2.5-pro-preview-06-05": wrapLanguageModel({
    //   middleware: defaultSettingsMiddleware({
    //     settings: {
    //       providerOptions: {
    //         google: {
    //           thinking: { type: "enabled", budgetTokens: 5000 },
    //         },
    //       },
    //     },
    //   }),
    //   model: google("gemini-2.5-pro-preview-06-05"),
    // }),
    // "gemini-2.5-flash-preview-05-20": wrapLanguageModel({
    //   middleware: defaultSettingsMiddleware({
    //     settings: {
    //       providerOptions: {
    //         google: {
    //           thinking: { type: "enabled", budgetTokens: 5000, },
    //         },
    //       },
    //     },
    //   }),
    //   model: google("gemini-2.5-flash-preview-05-20"),
    // }),
    // "gemini-2.5-pro-preview-03-25": wrapLanguageModel({
    //   middleware: defaultSettingsMiddleware({
    //     settings: {
    //       providerOptions: {
    //         google: {
    //           thinking: { type: "enabled", budgetTokens: 5000 },
    //         },
    //       },
    //     },
    //   }),
    //   model: google("gemini-2.5-pro-preview-03-25"),
    // }),
    // "gemini-2.0-flash": wrapLanguageModel({
    //   middleware: defaultSettingsMiddleware({
    //     settings: {
    //       providerOptions: {
    //         google: {
    //           thinking: { type: "disabled", budgetTokens: 5000 },
    //         },
    //       },
    //     },
    //   }),
    //   model: google("gemini-2.0-flash"),
    // }),
    "gemini-2.0-flash-exp": wrapLanguageModel({
      middleware: defaultSettingsMiddleware({
        settings: {
          providerOptions: {
            google: {
              thinking: { type: "disabled", budgetTokens: 5000 },
            },
          },
        },
      }),
      model: google("gemini-2.0-flash-exp"),
    }),
  },
});

export type modelID = Parameters<(typeof myProvider)["languageModel"]>["0"];

export const models: Record<modelID, string> = {
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-flash-lite": "Gemini 2.5 Flash-Lite",
  // "gemini-2.5-pro-preview-06-05": "Gemini 2.5 Pro Preview 06/05 (with Image Generation)",
  // "gemini-2.5-flash-preview-05-20": "Gemini 2.5 Flash Preview 05/20 (with Image Generation)",
  // "gemini-2.5-pro-preview-03-25": "Gemini 2.5 Pro Preview 03/25 (with Image Generation)",
  // "gemini-2.0-flash": "Gemini 2.0 Flash (with Image Generation)",
  "gemini-2.0-flash-exp": "Gemini 2.0 Flash Exp (Live)",
};
