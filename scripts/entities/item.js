/**
 * Extend the base Item class to implement additional system-specific logic.
 */
export default class ItemEntity extends Item {

    /** @override */
	prepareData() {
		super.prepareData();
        const item = this.data;
        switch (item.type) {
            case "resource":
                if (item.data.canHaveBulk && !item.data.bulk) {
                    item.data.bulk = 0;
                }
                if (item.data.canHaveValue && !item.data.value) {
                    item.data.value = 0;
                }
                if (item.data.canHaveCharges && !item.data.charges) {
                    item.data.charges = 0;
                }
                break;
        }
	}

    /**
     * Handle clickable rolls.
     * @param {Event} event   The originating click event
     * @private
     */
    async roll(event) {
        const token = this.actor.token;
        const item = this.data;
        const actorData = this.actor ? this.actor.data.data : {};
        const itemData = item.data;
        let contentDices = []
        let rollFormula = ""
        let rolledStats = []

        if (event.altKey) {
            rollFormula = "2d20kh"
        } else if (event.ctrlKey) {
            rollFormula = "2d20kl"
        } else {
            rollFormula = "d20"
        }
        
        item.data.rollStats.forEach((rollStat) => {
            rolledStats.push(game.i18n.localize(`common.${rollStat.type}.name`))
            if (actorData.attributes[rollStat.type]) {
                rollFormula = rollFormula + ` + ${actorData.attributes[rollStat.type].total}`
            } else {
                rollFormula = rollFormula + ` + ${actorData.archetypes[rollStat.type].total}`
            }
        })

        const roll = await new Roll(rollFormula, actorData).roll();
		for(let i = 0; i < roll.dice[0].number; i++) {
			if (i === 0) contentDices.push(`<ol class="dice-rolls">`)
			contentDices.push(`<li class="roll die d20 ${roll.dice[0].results[i].result === 1 ? "min" : ""} ${roll.dice[0].results[i].result === 20 ? "max" : ""} ${roll.dice[0].results[i].discarded ? "discarded" : ""}">${roll.dice[0].results[i].result}</li>`)
		}
		contentDices.push(`</ol>`)
        ChatMessage.create({
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            roll,
            content: `
            <div>
                <div style="display: flex; align-items:center; margin-bottom: 0.5rem;">
                    <img src="${item.img}" width="36" height="36">
                    <p class="item-name" style="margin: 0.5rem 0.3rem;">
						${item.name} (${rolledStats.join(' | ')}${event.altKey ? " | Avantage" : event.ctrlKey ? " | Désavantage" : ""}) 
					</p>
                </div>
                <div class="dice-roll">
                    <div class="dice-result">
                    <div class="dice-formula">${roll.formula}</div>
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
                    <h4 class="dice-total" style="${roll.result.substr(0, roll.result.indexOf(' ')) === "1" ? "color: red" : ""} ${roll.result.substr(0, roll.result.indexOf(' ')) === "20" ? "color: green" : ""}">${roll.total}</h4>
                </div>
            </div>
            `
        });
    }
}
