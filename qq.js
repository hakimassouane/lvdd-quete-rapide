import { preloadHandlebarsTemplates } from "./scripts/templates/templates.js";

import ActorSheetCharacter from './scripts/sheets/character.js';
import ItemSheetResource from './scripts/sheets/resource.js';
import ItemSheetPerk from './scripts/sheets/perk.js';
import ItemSheetSkill from './scripts/sheets/skill.js';
import ActorEntity from './scripts/entities/actor.js';
import ItemEntity from './scripts/entities/item.js';
import TokenDocumentEntity from './scripts/entities/token.js';

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
	console.log(`LVDD Quête Rapide | Initialising`);

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
	Items.registerSheet("gqq", ItemSheetSkill, {
		types: ['skill'],
		makeDefault: true,
		label: "sheet.skill.label"
	});

	// Register handlebars helpers
	Handlebars.registerHelper('concat', function(...args) {
		return args.slice(0, -1).join('');
	});
	Handlebars.registerHelper('strlen', function(str) {
		return String(str).length;
	});

	console.log(`LVDD Quête Rapide | Initialised`);

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
	const dialogContent = `
		<form>
			<div class="form-group">
				<label>Type de jet:</label>
				<select id="roll-type" name="roll-type">
				<option value="beni">Béni (+40%)</option>
				<option value="tres-facile">Très facile (+30%)</option>
				<option value="facile">Facile (+20%)</option>
				<option value="accessible">Accessible (+10%)</option>
				<option value="normal" selected="selected">Normal (+0%)</option>
				<option value="complexe">Complexe (-10%)</option>
				<option value="difficile">Difficile (-20%)</option>
				<option value="tres-difficile">Très difficile (-30%)</option>
				<option value="maudit">Maudit (-40%)</option>
				</select>
			</div>
		</form>
	`;
	const command = `
	    if (event.altKey) {
			game.boilerplate.rollItemMacro("${item.name}", {});
		} else {
			let applyChanges = false;
			let formInfos = {};
			new Dialog({
				title: 'Faire un jet',
				content: \`${dialogContent}\`,
				buttons: {
					yes: {
					icon: "<i class='fas fa-check'></i>",
					label: 'Faire un jet',
					callback: () => applyChanges = true
					},
					no: {
					icon: "<i class='fas fa-times'></i>",
					label: 'Annuler'
					},
				},
				default: "yes",
				close: html => {
					if (applyChanges) {
						let rollType = html.find('[name="roll-type"]')[0].value || "normal";
						// Get Vision Type Values
						switch (rollType) {
						case "beni":
							formInfos.rollType = "Béni"
							formInfos.bonusType = 40
							break;
						case "tres-facile":
							formInfos.rollType = "Très facile"
							formInfos.bonusType = 30
							break;
						case "facile":
							formInfos.rollType = "Facile"
							formInfos.bonusType = 20
							break;
						case "accessible":
							formInfos.rollType = "Accecssible"
							formInfos.bonusType = 10
							break;
						case "normal":
							formInfos.rollType = "Normal"
							formInfos.bonusType = 0
							break;
						case "complexe":
							formInfos.rollType = "Complexe"
							formInfos.bonusType = -10
							break;
						case "difficile":
							formInfos.rollType = "Difficile"
							formInfos.bonusType = -20
							break;
						case "tres-difficile":
							formInfos.rollType = "Très difficile"
							formInfos.bonusType = -30
							break;
						case "maudit":
							formInfos.rollType = "Maudit"
							formInfos.bonusType = -40
							break;
						default:
							formInfos.rollType = "Normal"
							formInfos.bonusType = 0
						}
						game.boilerplate.rollItemMacro("${item.name}", formInfos);
					}
				}
			}).render(true);
		}
	`;

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
   * @return {Promise}
   */
  function rollItemMacro(itemName, formInfos) {
	const speaker = ChatMessage.getSpeaker();
	let actor;
	if (speaker.token) actor = game.actors.tokens[speaker.token];
	if (!actor) actor = game.actors.get(speaker.actor);
	const item = actor ? actor.items.find(i => i.name === itemName) : null;
	if (!item) return ui.notifications.warn(`Le token selectionné ne possède pas d'équipement ou de compétence nommé "${itemName}".`);
	if (!item.data.data.canBeRolled) return ui.notifications.warn(`L'équipement ou la compétence"${itemName}" n'est plus rollable, rendez le / la rollable avant de refaire un roll.`);
	if (!item.data.data.rollStats || item.data.data.rollStats.length === 0) return ui.notifications.warn(`L'équipement ou la compétence "${itemName}" ne possède aucune statistiques de roll associé. Veuillez en ajouter une.`);
  
	return item.roll(formInfos);
  }