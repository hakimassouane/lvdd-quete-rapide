import { preloadHandlebarsTemplates } from "./scripts/templates/templates.js";

import ActorSheetCharacter from './scripts/sheets/character.js';
import ItemSheetResource from './scripts/sheets/resource.js';
import ItemSheetPerk from './scripts/sheets/perk.js';
import ItemSheetSkill from './scripts/sheets/skill.js';
import ActorEntity from './scripts/entities/actor.js';
import ItemEntity from './scripts/entities/item.js';
import CharacterRollDialog from "./scripts/dialogs/character-roll.js";
import { TokenDocumentQueteRapide, TokenQueteRapide } from './scripts/entities/token.js';
import { _getInitiativeFormula } from "./scripts/helpers/combat.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
	console.log(`LVDD Quête Rapide | Initialising`);

	game.boilerplate = {
		ActorEntity,
		ItemEntity,
		TokenDocumentQueteRapide,
		TokenQueteRapide,
		rollItem,
		successOrMiss,
		styleGenerator,
		generateRollBonusInfo,
		generateStatsToRollString,
		generateRollForm,
		generateRollTypeAndBonusAmount,
		handleTargets,
		handleStatRoll
	};

	CONFIG.Actor.documentClass  = ActorEntity;
  	CONFIG.Item.documentClass  = ItemEntity;
	CONFIG.Token.documentClass  = TokenDocumentQueteRapide;
	CONFIG.Token.objectClass = TokenQueteRapide;

	CONFIG.locationMap = {
		'arachnid': { camelCasedName: 'arachnid', tableName: 'Localisation arachnides' },
		'tailed-arachnid': { camelCasedName: 'tailedArachnid', tableName: 'Localisation arachnides à queue' },
		'tailed-biped': { camelCasedName: 'tailedBiped', tableName: 'Localisation bipède à queue' },
		'winged-biped': { camelCasedName: 'wingedBiped', tableName: 'Localisation bipède ailé' },
		'centaurid': { camelCasedName: 'centaurid', tableName: 'Localisation centauridés' },
		'aquatic-creature': { camelCasedName: 'aquaticCreature', tableName: 'Localisation créature aquatique' },
		'draconic': { camelCasedName: 'draconic', tableName: 'Localisation draconique' },
		'humanoid': { camelCasedName: 'humanoid', tableName: 'Localisation humanoïde' },
		'insectoid': { camelCasedName: 'insectoid', tableName: 'Localisation insectoïde' },
		'winged-insectoid': { camelCasedName: 'wingedInsectoid', tableName: 'Localisation insectoïde ailé' },
		'pachyderm': { camelCasedName: 'pachyderm', tableName: 'Localisation pachyderme' },
		'tailed-quadruped': { camelCasedName: 'tailedQuadruped', tableName: 'Localisation quadrupède à queue' },
		'winged-quadruped': { camelCasedName: 'wingedQuadruped', tableName: 'Localisation quadrupède ailé' },
		'serpentine': { camelCasedName: 'serpentine', tableName: 'Localisation serpentes' },
	}

	Combatant.prototype._getInitiativeFormula = _getInitiativeFormula;

	// Register sheet application classes
	Actors.unregisterSheet("core", ActorSheet);
	Actors.registerSheet("gqq", ActorSheetCharacter, {
		types: ["character", "npc", "creature"],
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
	socket.on('system.lvdd-quete-rapide', ({ type, targetUserId, payload }) => {
		switch (type) {
			case 'request-roll-player': {
				if (!!targetUserId && game.userId !== targetUserId) return;
				let applyChanges = false;
				new Dialog({
					title: 'Choisir comment réagir à l\'attaque',
					content: generateRollForm(true, payload.actor),
					buttons: {
						yes: {
							icon: "<i class='fas fa-check'></i>",
							label: 'Faire un jet',
							callback: () => applyChanges = true
						},
						no: {
							icon: "<i class='fas fa-times'></i>",
							label: 'Annuler',
							callback: () => applyChanges = false
						},
					},
					default: "yes",
					close: html => {
						if (applyChanges) {
							let rollType = html.find('[name="roll-type"]')[0].value || "normal";
							let itemName = html.find('[name="roll-todo"]')[0].value || "Athlétisme";
							let formInfos = generateRollTypeAndBonusAmount(rollType)
							
							formInfos.consumeInspiration = html.find('[name="inspiration"]')[0].checked;
							formInfos.isContestRoll = true;
							formInfos.actor = new ActorEntity(payload.actor);
							
							for (const [key, item] of payload.actor.items.entries()) {
								if (item.name === itemName) {
									const newItem = new ItemEntity(item)
									return newItem.roll(formInfos);
								}
							}
						}
					}
				}).render(true);
				break;
			}
			case 'request-roll-gm': {
				if (!game.user.isGM) return;
				let applyChanges = false;
				new Dialog({
					title: `Choisir comment réagir à l\'attaque pour ${payload.actor.name}`,
					content: generateRollForm(true, payload.actor),
					buttons: {
						yes: {
							icon: "<i class='fas fa-check'></i>",
							label: 'Faire un jet',
							callback: () => applyChanges = true
						},
						no: {
							icon: "<i class='fas fa-times'></i>",
							label: 'Annuler',
							callback: () => applyChanges = false
						},
					},
					default: "yes",
					close: html => {
						if (applyChanges) {
							let rollType = html.find('[name="roll-type"]')[0].value || "normal";
							let itemName = html.find('[name="roll-todo"]')[0].value || "Athlétisme";
							let formInfos = generateRollTypeAndBonusAmount(rollType)

							formInfos.consumeInspiration = html.find('[name="inspiration"]')[0].checked;
							formInfos.isContestRoll = true;
							formInfos.actor = new ActorEntity(payload.actor);
							formInfos.token = formInfos.actor.getActiveTokens().find(token => token.id === payload.tokenId)

							for (const [key, item] of payload.actor.items.entries()) {
								if (item.name === itemName) {
									const newItem = new ItemEntity(item)
									return newItem.roll(formInfos)
								}
							}
						}
					}
				}).render(true);
				break;
			}
			default:
			  throw new Error(`Unknown socket event type : ${type}`);
		  }
	})
});

function generateContestRollForm(actor) {
	const rollableItems = actor.items.filter(item => (item.type === "skill" && item.data.canBeRolled && item.data.rollStats && item.data.rollStats.length > 0) || (item.type === "resource" && item.data.canBeRolled && item.data.rollStats && item.data.rollStats.length > 0))
	let finalString = `
	<div class="form-group">
		<label>Jet à effectuer:</label>
		<select id="roll-todo" name="roll-todo">
	`

	for (let i = 0; i < rollableItems.length; i++) {
		finalString += `<option value="${rollableItems[i].name}" ${i === 0 ? 'selected="selected"' : '' }>${rollableItems[i].name}</option>`
	}

	finalString += `
		</select>
	</div>
	`

	return finalString
}

function generateRollForm(isContestRoll = false, actor = null) {
	return `
		<form>
			${isContestRoll ? generateContestRollForm(actor) : ``}
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
			<div class="form-group">
				<input type="checkbox" id="inspiration" name="inspiration">
				<label for="inspiration">Utiliser un point d'inspiration ?</label>
			</div>
		</form>
	`
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

function generateStatsToRollString(actor, form, item = null) {
	let generatedString = "Stats : "
	if (item) {
		form.forEach(stat => {
			generatedString = generatedString + stat.name + " " + stat.total + "% + " 
		})
	} else {
		generatedString = `${generatedString}${form.attribute ? game.i18n.format(`common.${form.attribute}.name`) + " " + actor.data.data.attributes[form.attribute].total + "% + " : ""} ${form.archetype ? game.i18n.format(`common.${form.archetype}.name`) + " " + actor.data.data.archetypes[form.archetype].total + "% + " : ""}`
	}
	
	return generatedString.slice(0, -3)
}

function generateRollTypeAndBonusAmount(rollType) {
	switch (rollType) {
		case "beni":
			return {
				rollType: "Béni",
				bonusAmount: 40
			}
		case "tres-facile":
			return {
				rollType: "Très facile",
				bonusAmount: 30
			}
		case "facile":
			return {
				rollType: "Facile",
				bonusAmount: 20
			}
		case "accessible":
			return {
				rollType: "Accessible",
				bonusAmount: 10
			}
		case "normal":
			return {
				rollType: "Normal",
				bonusAmount: 0
			}
		case "complexe":
			return {
				rollType: "Complexe",
				bonusAmount: -10
			}
		case "difficile":
			return {
				rollType: "Difficile",
				bonusAmount: -20
			}
		case "tres-difficile":
			return {
				rollType: "Très difficile",
				bonusAmount: -30
			}
		case "maudit":
			return {
				rollType: "Maudit",
				bonusAmount: -40
			}
		default:
			return {
				rollType: "Normal",
				bonusAmount: 0
			}
	}
}

function generateRollBonusInfo(actor, form, item = null) {
	let finalString = ""

	if (item && item.data.skillBonus != 0) {
		finalString += `<i>Bonus de compétence : ${item.data.skillBonus}% </i><br>`
	}

	if (form.bonusAmount !== 0) {
		finalString += `<i>${form.rollType} : ${form.bonusAmount}%</i><br>`
	}
	
	// ici linspiration est pas la bonne si jamais cest un token non linke car la data est celle de lactor pas celle du token
	if (form.consumeInspiration && actor.data.data.inspiration > 0) {
		finalString += `<i>Inspiration : 10%</i><br>`
	}

	return {
		bonusAmount: form.bonusAmount,
		rollType: form.rollType,
		consumeInspiration: form.consumeInspiration,
		finalString
	}
}

async function handleTargets(targets) {
	if (targets.length > 0) {
		const rollTablePack = game.packs.get('lvdd-quete-rapide.locationhittables');
		let targetString = '<hr><h3 style="margin-bottom: 0px; font-size: 1.35em;"><b>Cibles</b></h3><p style="margin: 0px;">'

		rollTablePack.getIndex();
		for (let i = 0; i < targets.length; i++) {
			let rollTableID = rollTablePack.index.find(t => t.name === CONFIG.locationMap[targets[i].actor.data.data.species].tableName)._id;
			let table = await rollTablePack.getDocument(rollTableID)
			let roll = await table.draw({displayChat: false})
			targetString += `<b>${targets[i].actor.data.name}</b> : ${roll.results[0].data.text} (${game.i18n.format(`common.speciesType.${CONFIG.locationMap[targets[i].actor.data.data.species].camelCasedName}`)})<br>`
		}

		targetString += '</p>'
		return targetString
	}

	return null
}

/**
	* Roll the item using informations from the macro
	* @param {string} itemName The name of the item to roll (Either an inventory or a skill Item)
	* @param {object} formInfos Informations about the roll taken from the form that pops up (Bonus % or Penalty %)
	* @return {Promise}
*/
function rollItem(itemName, event) {
	const speaker = ChatMessage.getSpeaker();
	let actor;
	
	if (speaker.token) actor = game.actors.tokens[speaker.token];
	if (!actor) actor = game.actors.get(speaker.actor);
	const item = actor ? actor.items.find(i => i.name === itemName) : null;
	if (!item) return ui.notifications.warn(`Le token selectionné ne possède pas d'équipement ou de compétence nommé "${itemName}".`);
	if (!item.data.data.canBeRolled) return ui.notifications.warn(`L'équipement ou la compétence"${itemName}" n'est plus rollable, rendez le / la rollable avant de refaire un roll.`);
	if (!item.data.data.rollStats || item.data.data.rollStats.length === 0) return ui.notifications.warn(`L'équipement ou la compétence "${itemName}" ne possède aucune statistiques de roll associé. Veuillez en ajouter une.`);

	if (!event.altKey) {
		let applyChanges = false;
		new Dialog({
			title: 'Faire un jet',
			content: generateRollForm(false),
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
					let formInfos = generateRollTypeAndBonusAmount(rollType)

					formInfos.consumeInspiration = html.find('[name="inspiration"]')[0].checked;
					return item.roll(formInfos);
				}
			}
		}).render(true);
	} else {
		return item.roll({});
	}
}

async function handleStatRoll(actor, preselectedAttribute) {
	try {
		const form = await CharacterRollDialog.characterRollDialog({preselectedAttribute});
		const formInfos = generateRollBonusInfo(actor, form)
		const targets = Array.from(game.user.targets.values())
		const roll = await new Roll("1d100").roll();
		let toBeat = formInfos.bonusAmount
		let contentDices = []

		toBeat += actor.data.data.attributes[form.attribute]
		? actor.data.data.attributes[form.attribute].total
		: 0

		toBeat += actor.data.data.archetypes[form.archetype]
		? actor.data.data.archetypes[form.archetype].total
		: 0

		toBeat += formInfos.consumeInspiration && actor.data.data.inspiration > 0
		? 10
		: 0

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
				<p class="item-name">
					<i>${generateStatsToRollString(actor, form)}</i><br>
					${formInfos.finalString}
					<i>Taux de réussite : ${toBeat}%</i>
					${await game.boilerplate.handleTargets(targets) || ""}
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
		if (formInfos.consumeInspiration && actor.data.data.inspiration > 0) {
			actor.update({ 'data.inspiration': actor.data.data.inspiration -= 1 });
		}
	} catch(err) {
		console.log(err);
		return;
	}
}