import { preloadHandlebarsTemplates } from "./scripts/templates/templates.js";

import ActorSheetCharacter from './scripts/sheets/character.js';
import ItemSheetResource from './scripts/sheets/resource.js';
import ItemSheetPerk from './scripts/sheets/perk.js';
import ActorEntity from './scripts/entities/actor.js';
import ItemEntity from './scripts/entities/item.js';
import TokenDocumentEntity from './scripts/entities/token.js';

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
	console.log(`Giffyglyph's Quick Quest | Initialising`);

	game.boilerplate = {
		ActorEntity,
		ItemEntity,
		TokenDocumentEntity,
		rollItemMacro
	};

	CONFIG.Actor.documentClass  = ActorEntity;
  	CONFIG.Item.documentClass  = ItemEntity;
	CONFIG.Token.documentClass  = TokenDocumentEntity;

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("gqq", ActorSheetCharacter, {
		types: ["character"],
		makeDefault: true,
		label: "sheet.character.label"
	});
	Items.unregisterSheet("core", ItemSheet);
	Items.registerSheet("gqq", ItemSheetResource, {
		types: ['resource'],
		makeDefault: true,
		label: "sheet.resource.label"
	});
	Items.registerSheet("gqq", ItemSheetPerk, {
		types: ['perk'],
		makeDefault: true,
		label: "sheet.perk.label"
	});

	// Register handlebars helpers
	Handlebars.registerHelper('concat', function(...args) {
		return args.slice(0, -1).join('');
	});
	Handlebars.registerHelper('strlen', function(str) {
		return String(str).length;
	});

	console.log(`Giffyglyph's Quick Quest | Initialised`);

	return preloadHandlebarsTemplates();
});

Hooks.once("ready", async function() {
	// Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
	Hooks.on("hotbarDrop", (bar, data, slot) => createQuickQuestMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
 async function createQuickQuestMacro(data, slot) {
	if (data.type !== "Item") return;
	if (!data.data.data.canBeRolled) return ui.notifications.warn("You can only create macro buttons for rollable items");
	if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
	const item = data.data;
  
	// Create the macro command with an event
	const command = `game.boilerplate.rollItemMacro("${item.name}", event);`;
	let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
	if (!macro) {
	  macro = await Macro.create({
		name: item.name,
		type: "script",
		img: item.img,
		command: command,
		flags: { "boilerplate.itemMacro": true }
	  });
	}
	game.user.assignHotbarMacro(macro, slot);
	return false;
  }
  
  /**
   * Create a Macro from an Item drop.
   * Get an existing item macro if one exists, otherwise create a new one.
   * @param {string} itemName
   * @param {Event} event
   * @return {Promise}
   */
  function rollItemMacro(itemName, event) {
	  // Check if isRollable is true
	const speaker = ChatMessage.getSpeaker();
	let actor;
	if (speaker.token) actor = game.actors.tokens[speaker.token];
	if (!actor) actor = game.actors.get(speaker.actor);
	const item = actor ? actor.items.find(i => i.name === itemName) : null;
	if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);
	if (!item.data.data.canBeRolled) return ui.notifications.warn(`The item "${itemName}" is no longer rollable, make it rollable before using the macro again`);
  
	return item.roll(event);
  }