# Narrative Encounter Enhancer

**A Foundry VTT module that transforms mundane encounter rolls into vivid, flavorful narrative descriptions using the OpenAI API.**

---

## 🎯 What It Does

When a GM rolls on a rollable table (e.g., random encounter tables) located in a folder labeled *"Encounters"*, this module:
- Detects the roll automatically.
- Adds an **"Enhance Encounter"** button to the resulting chat message (GM only).
- On click, opens a dialog that lets the GM optionally provide additional context.
- Sends the result (plus optional context) to OpenAI and whispers a vivid, short encounter narrative back to the GM in the chat log.

---

## 🔧 Features

- 🧠 **AI-enhanced output** using OpenAI's GPT models.
- ✍️ **Customizable prompt** using a template with `{{encounter}}` placeholder.
- 🌍 **World / region context** support to reflect your campaign setting.
- 🧱 **Genre presets** like Sword & Sorcery, Grimdark, Noblebright, etc.
- 🧪 Only triggers for tables stored in folders with “encounter” in the name (including nested folders).
- 👁️ **GM-only visibility**: Only the GM sees the "Enhance Encounter" button and response.

---

## 🚀 Installation

1. Go to **Foundry VTT > Configuration > Add-on Modules > Install Module**.
2. ...OR, paste the following manifest URL: https://github.com/thurianknight/encounter-enhancer/releases/latest/download/module.json
3. Enable the module in your game.

---

## ⚙️ Setup

### 1. Configure OpenAI API
Go to **Game Settings > Configure Settings > Module Settings > Narrative Encounter Enhancer**, and set:

- `OpenAI API Key`: Your personal API key from [https://platform.openai.com](https://platform.openai.com)
- `OpenAI Model`: Choose from `gpt-3.5-turbo`, `gpt-4o-mini`, etc.
- `Prompt Template`: Customize how the AI is asked to describe the scene. Use `{{encounter}}` as a placeholder for the rolled result.
- `Genre Preset`: Select the tone of the narration.
- `World / Region Lore`: Optional lore to help OpenAI better reflect your setting (e.g. “This world is dark, dying, and filled with ruined hypertechnology.”)

---

## 🧪 Usage

1. Create a rollable table in a folder named **"Encounters"** (or any name containing "encounter").
2. Roll on the table as usual.
3. As GM, click the **"Enhance Encounter"** button that appears in the resulting chat message.
4. Add optional context and click **Enhance**.
5. A short, vivid narrative is whispered to you, enhancing your improvisation or narration.

---

## 🛡️ Privacy

- Your OpenAI API key is stored **locally** and **never shared**.
- You control the prompt sent to OpenAI.

---

## 🛠 Future Plans

- Temperature / creativity control
- Support for in-world NPC names or locations
- Export enhanced encounter to journal
- GM chat macros

---

## 📜 License

[GNU GENERAL PUBLIC LICENSE Version 3](./LICENSE)

Created by [ThurianKnight](https://github.com/thurianknight)

---
