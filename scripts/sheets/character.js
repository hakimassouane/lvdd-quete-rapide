import CharacterRollDialog from "../dialogs/character-roll.js";

export default class ActorSheetCharacter extends ActorSheet {

	constructor(actor, options = {}){
		super(actor, options)
		this.orderNameAsc = true;
	}

	/** @override */
	static get defaultOptions() {
		return mergeObject(
			super.defaultOptions,
			{
				classes: ["window-gqq"],
				height: 642,
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
			html.find('.item__action--order-by-name').click(this._onItemOrderByName.bind(this));
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

	async _onMakeRollStats(event) {
		event.preventDefault();
		let preselectedAttribute = event.currentTarget.closest(".attribute") ? event.currentTarget.closest(".attribute").getAttribute("data-attribute") : null;
		try {
			const form = await CharacterRollDialog.characterRollDialog({preselectedAttribute: preselectedAttribute});
			const formInfos = game.boilerplate.generateRollBonusInfo(this.actor, form)
			const roll = await new Roll("1d100").roll();
			let toBeat = formInfos.bonusAmount
			let contentDices = []

			toBeat += this.actor.data.data.attributes[form.attribute]
			? this.actor.data.data.attributes[form.attribute].total
			: 0

			toBeat += this.actor.data.data.archetypes[form.archetype]
			? this.actor.data.data.archetypes[form.archetype].total
			: 0

			toBeat += formInfos.consumeInspiration && this.actor.data.data.inspiration > 0
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
				speaker: ChatMessage.getSpeaker({ actor: this.actor }),
				roll,
				content: `
				<div>
					<div style="display: flex; align-items:center; margin-bottom: 0.5rem;">
						<img src="${this.actor.img}" width="36" height="36">
						<h2 class="item-name" style="margin: 0.5rem 0.3rem;">
							<b>Jet de ${form.attribute ? game.i18n.format(`common.${form.attribute}.name`) : ""} ${form.archetype ? game.i18n.format(`common.${form.archetype}.name`) : ""}</b>
						</h2>
					</div>
					<p class="item-name" style="margin: 0.5rem 0.3rem;">
						<i>${game.boilerplate.generateStatsToRollString(this.actor, form)}</i><br>
						${formInfos.finalString}
						<i>Taux de réussite : ${toBeat}%</i>
					</p>
					<div class="dice-roll">
						<div class="dice-result">
						<div class="dice-formula" style="${game.boilerplate.styleGenerator(roll, toBeat)}">${game.boilerplate.successOrMiss(roll, toBeat)}</div>
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
						<h4 class="dice-total" style="${game.boilerplate.styleGenerator(roll, toBeat)}">${roll.total}</h4>
					</div>
				</div>
				`
			});
			if (formInfos.consumeInspiration && this.actor.data.data.inspiration > 0) {
				this.actor.update({ 'data.inspiration': this.actor.data.data.inspiration -= 1 });
			}
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
				<div class="form-group">
					<input type="checkbox" id="inspiration" name="inspiration">
					<label for="inspiration">Utiliser un point d'inspiration ?</label>
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
								formInfos.rollType = "Accessible"
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
							formInfos.consumeInspiration = html.find('[name="inspiration"]')[0].checked;
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

	async _onItemOrderByName(event) {
		event.preventDefault();
		const itemArray = [...this.actor.items]
		let i = 0

		itemArray.sort((a, b) => a.name.localeCompare(b.name))
		if (!this.orderNameAsc) {
			itemArray.reverse()
		} 
		
		itemArray.forEach(item => {
			item.data.sort = i;
			i++
		})

		const updates = itemArray.map((item) => { 
			return {_id: item.id, 'sort': item.data.sort} 
		});

		this.orderNameAsc = !this.orderNameAsc
		await this.actor.updateEmbeddedDocuments('Item', updates);
	}
}
