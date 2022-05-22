import { preloadHandlebarsTemplates } from "./scripts/templates/templates.js";

import ActorSheetCharacter from './scripts/sheets/character.js';
import ItemSheetResource from './scripts/sheets/resource.js';
import ItemSheetPerk from './scripts/sheets/perk.js';
import ItemSheetSkill from './scripts/sheets/skill.js';
import ActorEntity from './scripts/entities/actor.js';
import ItemEntity from './scripts/entities/item.js';
import TokenDocumentEntity from './scripts/entities/token.js';
import CharacterRollDialog from "./scripts/dialogs/character-roll.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
	console.log(`LVDD Quête Rapide | Initialising`);

	game.boilerplate = {
		ActorEntity,
		ItemEntity,
		TokenDocumentEntity,
		rollItemMacro,
		handleTokenActionHudItems,
		handleTokenActionHudStats
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

		const rollTypeSelectorForm = `
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
					content: \`${rollTypeSelectorForm}\`,
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
		* Roll the item using informations from the macro
	 	* @param {string} itemName The name of the item to roll (Either an inventory or a skill Item)
	 	* @param {object} formInfos Informations about the roll taken from the form that pops up (Bonus % or Penalty %)
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

	/**
		* Handles the Token Action Hud module call before passing it to the rollItemMacro method
		* @param {object} event The html event object to check for context and keys
		* @param {string} itemName The name of the Item object to roll (Either an inventory or a skill Item)
		* @return {void}
	*/
   	function handleTokenActionHudItems(event, itemName) {
		const rollTypeSelectorForm = `
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


		if (event.altKey) {
			game.boilerplate.rollItemMacro(itemName, {});
		} else {
			let applyChanges = false;
			new Dialog({
				title: 'Faire un jet',
				content: rollTypeSelectorForm,
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
						let formInfos = {};
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
						game.boilerplate.rollItemMacro(itemName, formInfos);
					}
				}
			}).render(true);
		}
  	}

  
 	function styleGenerator(roll, toBeat) {
		if (roll.total <= 5) {
			return "color: green"
		} else if (roll.total >= 95) {
			return "color: red"
		}

		return roll.total <= toBeat ? "color: darkgreen" : "color: darkred";
	}

	function successOrMiss(roll, toBeat) {
		if (roll.total <= 5) {
			return "Succès critique !"
		} else if (roll.total >= 95) {
			return "Échec critique !"
		}

		return roll.total <= toBeat ? "Succès" : "Échec";
	}

	function generateStatsToRollString(actor, form) {
		let generatedString = `Stats : ${form.attribute ? game.i18n.format(`common.${form.attribute}.name`) + " " + actor.data.data.attributes[form.attribute].total + "% + " : ""} ${form.archetype ? game.i18n.format(`common.${form.archetype}.name`) + " " + actor.data.data.archetypes[form.archetype].total + "% + " : ""}`

		return generatedString.slice(0, -3)
	}

	function generateRollBonusInfo(form) {
		let rollType = ""
		let bonusAmount = 0

		switch (form.bonus) {
			case "beni":
				rollType = "Béni"
				bonusAmount = 40
				break;
			case "tres-facile":
				rollType = "Très facile"
				bonusAmount = 30
				break;
			case "facile":
				rollType = "Facile"
				bonusAmount = 20
				break;
			case "accessible":
				rollType = "Accecssible"
				bonusAmount = 10
				break;
			case "normal":
				rollType = "Normal"
				bonusAmount = 0
				break;
			case "complexe":
				rollType = "Complexe"
				bonusAmount = -10
				break;
			case "difficile":
				rollType = "Difficile"
				bonusAmount = -20
				break;
			case "tres-difficile":
				rollType = "Très difficile"
				bonusAmount = -30
				break;
			case "maudit":
				rollType = "Maudit"
				bonusAmount = -40
				break;
			default:
				rollType = "Normal"
				bonusAmount = 0
			}

		return {
			bonusAmount,
			rollType,
			finalString: bonusAmount !== 0 ? `<i>${rollType} : ${bonusAmount}%</i><br>` : ""
		}
	}

  	/**
   		* Handles the Token Action Hud module call for Attributes and Archetypes
   		* @param {object} event The html event object to check for context and keys
   		* @param {string} preSelectedStatName The name of the stat (Attribute or Archetype) that should be preselected in the dialog
   		* @return {void}
   	*/
   	async function handleTokenActionHudStats(actor, preSelectedStatName) {
		try {
			const form = await CharacterRollDialog.characterRollDialog({preselectedAttribute: preSelectedStatName});
			const formInfos = generateRollBonusInfo(form)
			const roll = await new Roll("1d100").roll();
			let toBeat = formInfos.bonusAmount
			let contentDices = []

			if (actor.data.data.attributes[form.attribute]) {
				toBeat += actor.data.data.attributes[form.attribute].total
			}
			if (actor.data.data.archetypes[form.archetype]) {
				toBeat += actor.data.data.archetypes[form.archetype].total
			}

			if (toBeat > 100) {
				toBeat = 100
			} else if (toBeat < 0) {
				toBeat = 0
			}
			
			// Faire un roll automatique sur la table de succès ou ecehc critique selon le resultat de ce dés
			contentDices.push(`<ol class="dice-rolls">`)
			contentDices.push(`<li class="roll die d10 ${roll.dice[0].results[0].result <= 5 ? "max" : ""} ${roll.dice[0].results[0].result >= 95 ? "min" : ""}">${roll.dice[0].results[0].result}</li>`)
			contentDices.push(`</ol>`)
			ChatMessage.create({
				type: CONST.CHAT_MESSAGE_TYPES.ROLL,
				speaker: ChatMessage.getSpeaker({ actor: actor }),
				roll,
				content: `
				<div>
					<div style="display: flex; align-items:center; margin-bottom: 0.5rem;">
						<img src="${ChatMessage.getSpeakerActor(ChatMessage.getSpeaker()).img}" width="36" height="36">
						<h2 class="item-name" style="margin: 0.5rem 0.3rem;">
							<b>Jet de ${form.attribute ? game.i18n.format(`common.${form.attribute}.name`) : ""} ${form.archetype ? game.i18n.format(`common.${form.archetype}.name`) : ""}</b>
						</h2>
					</div>
					<p class="item-name" style="margin: 0.5rem 0.3rem;">
						<i>${generateStatsToRollString(actor, form)}</i><br>
						${formInfos.finalString}
						<i>Taux de réussite : ${toBeat}%</i>
					</p>
					<div class="dice-roll">
						<div class="dice-result">
						<div class="dice-formula" style="${styleGenerator(roll, toBeat)}">${successOrMiss(roll, toBeat)}</div>
							<div class="dice-tooltip">
								<section class="tooltip-part">
									<div class="dice">
										<header class="part-header flexrow">
											<span class="part-formula">${roll.formula.substring(0, roll.formula.indexOf("20") + 2)}</span>
											<span class="part-total">${roll.total}</span>
										</header>
										${contentDices.join("")}
									</div>
								</section>
							</div>
						<h4 class="dice-total" style="${styleGenerator(roll, toBeat)}">${roll.total}</h4>
					</div>
				</div>
				`
			});
		} catch(err) {
			console.log(err);
			return;
		}
  	}