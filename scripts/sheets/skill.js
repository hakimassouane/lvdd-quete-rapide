import EditSkillDialog from "../dialogs/edit-skill.js";

export default class ItemSheetSkill extends ItemSheet {

	/** @override */
	static get defaultOptions() {
		return mergeObject(
			super.defaultOptions,
			{
				classes: ["window-gqq"],
				height: 601,
				width: 350,
				template: 'systems/lvdd-quete-rapide/templates/sheets/skill.html',
				resizable: false,
				tabs: [{navSelector: ".card__tabs__nav", contentSelector: ".card__tabs__body", initial: "front"}]
			}
		);
	}

	/** @override */
    getData() {
        const data = super.getData();
        return data;
    }

	activateListeners(html) {
		html.find('button[data-action="edit"]').click(this._onSkillEdit.bind(this));
		super.activateListeners(html);
	}

	async _onSkillEdit(event) {
		event.preventDefault();
		try {
			let form = await EditSkillDialog.editSkillDialog({item: this.item.data});
			await this.item.update(form);
		} catch(err) {
			return;
		}
	}
}
