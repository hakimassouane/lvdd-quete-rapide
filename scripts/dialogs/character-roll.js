export default class CharacterRollDialog extends Dialog {

	constructor(actor, dialogData = {}, options = {}) {
		super(dialogData, options);
        this.actor = actor;
	}

	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			template: "systems/lvdd-quete-rapide/templates/dialogs/character-roll.html",
			classes: ["window-gqq"],
			width: 450,
			height: 570,
			resizable: false
		});
	}

    /** @override */
	getData() {
		const data = super.getData();
		data.preselectStr = (this.data.preselectedAttribute == "str");
        data.preselectDex = (this.data.preselectedAttribute == "dex");
        data.preselectCon = (this.data.preselectedAttribute == "con");
        data.preselectInt = (this.data.preselectedAttribute == "int");
        data.preselectWis = (this.data.preselectedAttribute == "wis");
        data.preselectCha = (this.data.preselectedAttribute == "cha");
        data.preselectFig = (this.data.preselectedAttribute == "fig");
        data.preselectRog = (this.data.preselectedAttribute == "rog");
        data.preselectExp = (this.data.preselectedAttribute == "exp");
        data.preselectSag = (this.data.preselectedAttribute == "sag");
        data.preselectArt = (this.data.preselectedAttribute == "art");
        data.preselectDip = (this.data.preselectedAttribute == "dip");
		return data;
	}

    /** @override */
	activateListeners(html) {
		super.activateListeners(html);
		html.find('.attribute').click(ev => this._onClickAttribute(ev));
	}

    _onClickAttribute(e) {
        e.target.closest(".attributes").querySelectorAll(".attribute").forEach(el => el.classList.remove("active"));
        e.target.closest(".attribute").classList.add("active");
		e.target.closest(".attribute").querySelector("input[type='radio']").checked = true;
	}

	static async characterRollDialog({
		actor, preselectedAttribute
	} = {}) {
		function _getFormData(html, advantage) {
			let form = html.find("#character-roll")[0];
			return {
				"attribute": form.querySelector("[name='attribute']:checked") ? form.querySelector("[name='attribute']:checked").value : null,
				"archetype": form.querySelector("[name='archetype']:checked") ? form.querySelector("[name='archetype']:checked").value : null,
				"advantage": advantage,
				"rollType": form.querySelector("[name='roll-type']").value,
				"mode": form.querySelector("[name='mode']").value,
				"consumeInspiration": form.querySelector("[name='inspiration']").checked
			};
		}
		return new Promise((resolve, reject) => {
			const dlg = new this(actor, {
				title: `Faire un jet`,
                preselectedAttribute: preselectedAttribute,
				buttons: {
					roll: {
						icon: '<i class="fas fa-dice"></i>',
						label: game.i18n.format('common.roll'),
						class: "btn-primary btn-roll",
						callback: (html) => resolve(_getFormData(html, "normal"))
					},			
				},
				close: reject
			});
			dlg.render(true);
		});
		
	}
}