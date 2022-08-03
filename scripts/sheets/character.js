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
		let preselectedAttribute = event.currentTarget.closest(".attribute") ? event.currentTarget.closest(".attribute").getAttribute("data-attribute") : null;
		event.preventDefault();
		game.boilerplate.handleStatRoll(this.actor, preselectedAttribute)
	}

	async _onMakeRollItem(event) {
		const itemName = event.currentTarget.parentNode.parentNode.childNodes[3].firstElementChild.getAttribute("value")
		
		event.preventDefault();
		game.boilerplate.rollItem(itemName, event);
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
