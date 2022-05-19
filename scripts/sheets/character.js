import CharacterRollDialog from "../dialogs/character-roll.js";

export default class ActorSheetCharacter extends ActorSheet {

	/** @override */
	static get defaultOptions() {
		return mergeObject(
			super.defaultOptions,
			{
				classes: ["window-gqq"],
				height: 602,
				width: 948,
				template: 'systems/lvdd-quete-rapide/templates/sheets/character.html',
				resizable: false,
				tabs: [{navSelector: ".tabs__nav", contentSelector: ".tabs__body", initial: "attributes"}]
			}
		);
	}

	activeListeners() {
		// Drag events for macros.
		if (this.actor.owner) {
			let handler = ev => this._onDragStart(ev);
			// Find all items on the character sheet.
			html.find('li.item').each((i, li) => {
			// Ignore for the header row.
			if (li.classList.contains("item-header")) return;
			// Add draggable attribute and dragstart listener.
			li.setAttribute("draggable", true);
			li.addEventListener("dragstart", handler, false);
			});
		}
	}

	activateListeners(html) {
		if (this.isEditable) {   
			html.find('.character__resources .item__action--add').click(this._onResourceAdd.bind(this));
			html.find('.character__perks .item__action--add').click(this._onPerkAdd.bind(this));
			html.find('.character__skills .item__action--add').click(this._onSkillAdd.bind(this));
			html.find('.resource__action--toggle-equipped').click(this._onResourceToggleEquipped.bind(this));
			html.find('.item__action--roll').click(this._onMakeRollItem.bind(this));
			html.find('.item__action--toggle-hidden').click(this._onItemToggleHidden.bind(this));
			html.find('.item .item__icon img, .item__action--open').click(this._onItemOpen.bind(this));
			html.find('.item .item__title input, .resource .resource__bulk input, .resource .resource__value input, .resource .resource__charges input').change(this._onItemChange.bind(this));
			html.find('.item__action--delete').click(this._onItemDelete.bind(this));
			html.find('.character-action--roll, .attributes .attribute__tag').click(this._onMakeRollStats.bind(this));
		}
		super.activateListeners(html);
	}

	_onResourceAdd(event) {
		event.preventDefault();
		const resourceData = {
			name: game.i18n.format("new.resource.title"),
			img: "icons/svg/item-bag.svg",
			type: "resource",
			data: duplicate(event.currentTarget.dataset)
		};
		delete resourceData.data["type"];

		const toReturn = this.actor.createEmbeddedDocuments("Item", [resourceData]);
		return toReturn
	}

	_onPerkAdd(event) {
		event.preventDefault();
		const resourceData = {
			name: game.i18n.format("new.perk.title"),
			img: "icons/svg/aura.svg",
			type: "perk",
			data: duplicate(event.currentTarget.dataset)
		};
		delete resourceData.data["type"];
		return this.actor.createEmbeddedDocuments("Item", [resourceData]);
	}

	_onSkillAdd(event) {
		event.preventDefault();
		const resourceData = {
			name: game.i18n.format("new.skill.title"),
			img: "icons/svg/book.svg",
			type: "skill",
			data: duplicate(event.currentTarget.dataset)
		};
		delete resourceData.data["type"];

		resourceData.data.canBeRolled = true
		return this.actor.createEmbeddedDocuments("Item", [resourceData]);
	}

	_onResourceToggleEquipped(event) {
		event.preventDefault();
		const li = event.currentTarget.closest(".resource");
		const resource = this.actor.getEmbeddedDocument("Item", li.dataset.itemId);
		resource.update({
			"data.isEquipped": !resource.data.data.isEquipped
		});
	}

	_onItemToggleHidden(event) {
		event.preventDefault();
		const li = event.currentTarget.closest(".item");
		const item = this.actor.getEmbeddedDocument("Item", li.dataset.itemId);
		item.update({
			"data.isHidden": !item.data.data.isHidden
		});
	}

	_onItemChange(event) {
		event.preventDefault();
		const field = event.currentTarget.getAttribute("data-field");
		const value = event.currentTarget.value;
		const li = event.currentTarget.closest(".item");
		const item = this.actor.getEmbeddedDocument("Item", li.dataset.itemId);
		item.update({
			[field]: value
		});
	}

	_onItemOpen(event) {
		event.preventDefault();
		const li = event.currentTarget.closest(".item");
		const item = this.actor.getEmbeddedDocument("Item", li.dataset.itemId);
		item.sheet.render(true);
	}

	_onItemDelete(event) {
		event.preventDefault();
		const li = event.currentTarget.closest(".item");
		this.actor.deleteEmbeddedDocuments("Item", [li.dataset.itemId]);
	}

	styleGenerator(roll, toBeat) {
        if (roll.total <= 5) {
            return "color: green"
        } else if (roll.total >= 95) {
            return "color: red"
        }

        return roll.total <= toBeat ? "color: darkgreen" : "color: darkred";
    }

    successOrMiss(roll, toBeat) {
        if (roll.total <= 5) {
            return "Succès critique !"
        } else if (roll.total >= 95) {
            return "Échec critique !"
        }

        return roll.total <= toBeat ? "Succès" : "Échec";
    }

    generateStatsToRollString(form) {
        let generatedString = `Stats : ${form.attribute ? game.i18n.format(`common.${form.attribute}.name`) + " " + this.actor.data.data.attributes[form.attribute].total + "% + " : ""} ${form.archetype ? game.i18n.format(`common.${form.archetype}.name`) + " " + this.actor.data.data.archetypes[form.archetype].total + "% + " : ""}`

		console.log('generated string => ', generatedString)
        return generatedString.slice(0, -3)
    }

    generateRollBonusInfo(form) {
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

	async _onMakeRollStats(event) {
		event.preventDefault();
		let preselectedAttribute = event.currentTarget.closest(".attribute") ? event.currentTarget.closest(".attribute").getAttribute("data-attribute") : null;
		try {
			const form = await CharacterRollDialog.characterRollDialog({preselectedAttribute: preselectedAttribute});
			const formInfos = this.generateRollBonusInfo(form)
			const roll = await new Roll("1d100").roll();
			let toBeat = formInfos.bonusAmount
			let contentDices = []

			if (this.actor.data.data.attributes[form.attribute]) {
				toBeat += this.actor.data.data.attributes[form.attribute].total
			}
			if (this.actor.data.data.archetypes[form.archetype]) {
				toBeat += this.actor.data.data.archetypes[form.archetype].total
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
				speaker: ChatMessage.getSpeaker({ actor: this.actor }),
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
						<i>${this.generateStatsToRollString(form)}</i><br>
						${formInfos.finalString}
						<i>Taux de réussite : ${toBeat}%</i>
					</p>
					<div class="dice-roll">
						<div class="dice-result">
						<div class="dice-formula" style="${this.styleGenerator(roll, toBeat)}">${this.successOrMiss(roll, toBeat)}</div>
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
						<h4 class="dice-total" style="${this.styleGenerator(roll, toBeat)}">${roll.total}</h4>
					</div>
				</div>
				`
			});
		} catch(err) {
			console.log(err);
			return;
		}
	}

	async _onMakeRollItem(event) {
		event.preventDefault();
		const itemName = event.currentTarget.parentNode.parentNode.childNodes[3].firstElementChild.getAttribute("value")
		try {
			if (event.altKey) {
				game.boilerplate.rollItemMacro(itemName, {});
			} else {
				let applyChanges = false;
				let formInfos = {};
				new Dialog({
					title: 'Faire un jet',
					content: `
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
		`,
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
							game.boilerplate.rollItemMacro(itemName, formInfos);
						}
					}
				}).render(true);
			}
		} catch(err) {
			console.log(err);
			return;
		}
	}
}
