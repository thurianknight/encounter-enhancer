Hooks.once("init", () => {
    console.log("Encounter Enhancer | Initializing module");

    game.settings.register("encounter-enhancer", "openaiApiKey", {
        name: "OpenAI API Key",
        hint: "Enter your personal OpenAI API key. Required to enable enhanced encounters.",
        scope: "world",
        config: true,
        type: String,
        default: "sk-...",
        ...(foundry?.utils?.hasProperty ? { isSecret: true } : {})
    });
    game.settings.register("encounter-enhancer", "openaiModel", {
        name: "OpenAI Model",
        hint: "Model to use with the OpenAI API (e.g., gpt-3.5-turbo, gpt-4o-mini, gpt-4.1-nano)",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "gpt-3.5-turbo": "gpt-3.5-turbo (Fast, Low Cost)",
            "gpt-4o-mini": "gpt-4o-mini (Faster GPT-4, Recommended)",
            "gpt-4.1-nano": "gpt-4.1 (Fastest, most cost-effective GPT-4.1 model)"
        },
        default: "gpt-3.5-turbo"
    });
    game.settings.register("encounter-enhancer", "showWelcomeMessage", {
        name: "Show Welcome Message on World Load",
        hint: "Show a quick-start guide in the chat log each time the world loads.",
        scope: "client",
        config: true,
        default: true,
        type: Boolean
    });

    game.settings.register("encounter-enhancer", "promptTemplate", {
        name: "Encounter Prompt Template",
        hint: "Customize the prompt sent to OpenAI. Use {{encounter}} as a placeholder.",
        scope: "world",
        config: true,
        type: String,
        default: "Summarize the following RPG encounter scene in 1 to 3 sentences. Stay focused and do not add any extra elements: {{encounter}}"
    });

    game.settings.register("encounter-enhancer", "genrePreset", {
        name: "Default Genre Preset",
        hint: "Genre tone to guide the encounter description.",
        scope: "world",
        config: true,
        type: String,
        choices: {
            sword_sorcery: "Sword & Sorcery",
            high_fantasy: "High Fantasy",
            grimdark: "Grimdark",
            noble_bright: "Noblebright",
            weird_fantasy: "Weird Fantasy",
            science_fantasy: "Science Fantasy",
            custom: "Custom / Manual"
        },
        default: "sword_sorcery"
    });
    game.settings.register("encounter-enhancer", "worldContext", {
        name: "World / Region Lore",
        hint: "Optional world or regional lore that provides context for the encounter.",
        scope: "world",
        config: true,
        type: String,
        default: "",
        multiline: true
    });

});

Hooks.once("ready", () => {
    if (!game.user.isGM) return;
    // Show welcome message in chat, if enabled
    const shouldShow = game.settings.get("encounter-enhancer", "showWelcomeMessage");
    if (!shouldShow) return;

    const content = `
        <h2>📜 Narrative Encounter Enhancer</h2>
        <p><strong>Configuration:</strong><br>
        In <em>Module Settings</em>, you can:
        <ul>
        <li>Set your OpenAI API key.</li>
        <li>Choose which model to use (e.g., <code>gpt-3.5-turbo</code>, <code>gpt-4o-mini</code>).</li>
        <li>Customize the encounter template, set genre, and optional lore describing your setting.</li>
        </ul></p>`

    ChatMessage.create({
        user: game.user.id,
        whisper: [game.user.id],
        content: content
    });

});

Hooks.on("createChatMessage", async (message, options, userId) => {
    const tableId = message?.flags?.core?.RollTable;
    console.log("Encounter Enhancer | Checking message:", message);
    console.log("Encounter Enhancer | table ID:", tableId);
    if (!tableId) return;

    // Construct full UUID
    const uuid = `RollTable.${tableId}`;
    const table = await fromUuid(uuid);

    if (!table || !(table instanceof RollTable)) {
        console.warn("Encounter Enhancer | Could not resolve RollTable from UUID:", uuid);
        return;
    }

    // Recursively walk up the folder tree
    let folder = table.folder;
    let isEncounter = false;
    while (folder) {
        console.log(`Encounter Enhancer | Folder:`, folder);
        if (folder.name?.toLowerCase().includes("encounter")) {
            isEncounter = true;
            break;
        }
        folder = folder.folder;
    }

    if (!isEncounter) return;

    console.log("Encounter Enhancer | Detected roll from encounter table");
    console.log("→ Table:", table.name);
    console.log("→ Folder:", table.folder?.name);
    console.log("→ Chat content:", message.content);
    await message.update({
        "flags.encounter-enhancer.isEncounter": true
    });

});

Hooks.on("renderChatMessage", async (message, html, data) => {
    if (!game.user.isGM) return; // Only proceed if this user is the GM

    const isEncounter = message?.flags?.["encounter-enhancer"]?.isEncounter;
    if (!isEncounter) return;

    // Create a new button
    const button = $(
        `<button class="enhance-encounter-button" style="margin-left: 5px;">
        <i class="fas fa-wand-magic-sparkles"></i> Enhance Encounter
        </button>`
    );

    // Add a click handler
    button.on("click", async () => {
        console.log("Encounter Enhancer | Enhance Encounter clicked for message", message.id);
        // await enhanceEncounter(message); // <- make sure this function is defined
        const originalText = message.content;
        showEnhanceDialog(originalText, (formData) => {
            // Send request to OpenAI with formData
            enhanceEncounter(formData)
        });
    });

    // Append the button to the chat message
    const buttonContainer = html.find(".message-content");
    buttonContainer.append(button);
});

async function enhanceEncounter({ encounter, context, tone, notes }) {
    const apiKey = game.settings.get("encounter-enhancer", "openaiApiKey");
    const model = game.settings.get("encounter-enhancer", "openaiModel");
    const promptTemplate = game.settings.get("encounter-enhancer", "promptTemplate");

    // Construct final prompt
    let prompt = promptTemplate.replace("{{encounter}}", encounter.trim());
    if (context) prompt += ` Context: ${context.trim()}`;
    if (tone) prompt += ` Tone: ${tone}.`;
    if (notes) prompt += ` Notes: ${notes.trim()}`;

    console.log("Encounter Enhancer | Sending prompt:", prompt);

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: "You are a fantasy game assistant. Given a brief encounter prompt, you return a short, vivid but grounded scene description (1–3 sentences max). Do not add extra events or characters unless they are mentioned explicitly." },
                { role: "user", content: prompt },
            ],
            temperature: 0.8 // Adjust temperature for creativity
        })
    });

    if (!response.ok) {
        ui.notifications.error("Encounter Enhancer | OpenAI request failed.");
        return;
    }

    const json = await response.json();
    const reply = json.choices?.[0]?.message?.content?.trim();

    if (reply) {
        ChatMessage.create({
            content: `<div class="enhanced-encounter"><strong>Enhanced Encounter:</strong><br>${reply}</div>`,
            whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
            speaker: { alias: "Encounter Enhancer" }
        });
    }
}

function showEnhanceDialog(originalText, callback) {
    const genre = game.settings.get("encounter-enhancer", "genrePreset");
    const worldContext = game.settings.get("encounter-enhancer", "worldContext")?.trim();
    const genreLabelMap = {
        sword_sorcery: "Sword & Sorcery",
        high_fantasy: "High Fantasy",
        grimdark: "Grimdark",
        noble_bright: "Noblebright",
        weird_fantasy: "Weird Fantasy",
        science_fantasy: "Science Fantasy",
        custom: "Custom",
    };
    const presetNotes = `Genre: ${genreLabelMap[genre] || "Custom"}${worldContext ? `\nContext: ${worldContext}` : ""}`;

    new Dialog({
        title: "Enhance Encounter",
        content: `
            <form>
                <div class="form-group">
                <label>Scene Context (optional)</label>
                <textarea name="context" rows="2" placeholder="Where is this happening? What’s the weather, time of day, etc.?"></textarea>
                </div>
                <div class="form-group">
                <label>Mood/Tone</label>
                <select name="tone">
                    <option value="">None</option>
                    <option value="gritty">Gritty</option>
                    <option value="tense">Tense</option>
                    <option value="mysterious">Mysterious</option>
                    <option value="surreal">Surreal</option>
                    <option value="humorous">Humorous</option>
                    <option value="epic">Epic</option>
                </select>
                </div>
                <div class="form-group">
                <label>Other Notes (style, game system, etc.)</label>
                <textarea name="notes" rows="2">${presetNotes}</textarea>
                </div>
            </form>
            `,
        buttons: {
            enhance: {
                icon: '<i class="fas fa-magic"></i>',
                label: "Enhance",
                callback: html => {
                    const form = html[0].querySelector("form");
                    const data = new FormData(form);
                    callback({
                        encounter: originalText,
                        context: data.get("context"),
                        tone: data.get("tone"),
                        notes: data.get("notes")
                    });
                }
            },
            cancel: {
                label: "Cancel"
            }
        },
        default: "enhance"
    }).render(true);
}
