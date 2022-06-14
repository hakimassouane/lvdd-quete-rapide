
/**
 * Override the default Initiative formula to customize special behaviors of the system.
 * Apply advantage, proficiency, or bonuses where appropriate
 * Apply the dexterity score as a decimal tiebreaker if requested
 * See Combat._getInitiativeFormula for more detail.
 * @returns {string}  Final initiative formula for the actor.
 */
 export const _getInitiativeFormula = function() {
    const actor = this.actor;
    if ( !actor ) return "1d100";
    const actorData = actor.data.data;
    const init = actorData.attributes.int.total;

    return `1d100 + ${init}`
  };

  