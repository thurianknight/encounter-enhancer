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

    game.settings.register("encounter-enhancer", "promptTemplate", {
        name: "Encounter Prompt Template",
        hint: "Customize the prompt sent to OpenAI. Use {{encounter}} as a placeholder.",
        scope: "world",
        config: true,
        type: String,
        default: "Describe the following fantasy RPG encounter in vivid detail: {{encounter}}"
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
        await enhanceEncounter(message); // <- make sure this function is defined
    });

    // Append the button to the chat message
    const buttonContainer = html.find(".message-content");
    buttonContainer.append(button);
});


Hooks.on("getChatLogEntryContext", (html, options) => {
    options.push({
        name: "Enhance Encounter",
        icon: '<i class="fas fa-wand-magic-sparkles"></i>',
        condition: li => {
            const messageId = li.data("messageId");
            const message = game.messages.get(messageId);
            return message?.flags?.["encounter-enhancer"]?.isEncounter;
        },
        callback: li => {
            const messageId = li.data("messageId");
            const message = game.messages.get(messageId);
            enhanceEncounter(message);
        }
    });
});

async function enhanceEncounter(message) {
    const content = message.content;
    const promptTemplate = game.settings.get("encounter-enhancer", "promptTemplate");
    const apiKey = game.settings.get("encounter-enhancer", "openaiApiKey");
    const model = game.settings.get("encounter-enhancer", "openaiModel");

    const prompt = promptTemplate.replace("{{encounter}}", content);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        ui.notifications.error("OpenAI request failed.");
        return;
    }

    const json = await response.json();
    const reply = json.choices?.[0]?.message?.content?.trim();

    if (reply) {
        ChatMessage.create({
            content: `<div class="enhanced-encounter"><strong>Enhanced Encounter:</strong><br>${reply}</div>`,
            // whisper: message.whisper,
            // speaker: message.speaker
            whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
            speaker: ChatMessage.getSpeaker()
        });
    }
}
