/**
 * Extend the base Actor class to implement additional system-specific logic.
 */
export default class ActorEntity extends Actor {

    /** @override */
	prepareData() {
		super.prepareData();
        const actor = this.data;

		// Process items
		this._validateItems(actor.items);

		// Get item categories
		actor.data.resources = this._getResources(actor.items.filter((x) => x.type == "resource"));
		actor.data.perks = this._getPerks(actor.items.filter((x) => x.type == "perk"));
		actor.data.skills = this._getSkills(actor.items.filter((x) => x.type == "skill"));

		// Get modifiers and apply to aspects
		let modifiers = this._getItemModifiers(actor.items);
		["str", "dex", "con", "int", "wis", "cha"].forEach((x) => this._applyAttributeModifier(actor, x, modifiers[x]));
		["fig", "rog", "exp", "sag", "art", "dip"].forEach((x) => this._applyArchetypeModifier(actor, x, modifiers[x]));
		this._applyResolveModifier(actor, modifiers["res"]);
	}

	/** @inheritdoc */
	async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
		if ( attribute === "resolve" ) {
			const hp = getProperty(this.data.data, attribute);
			const delta = isDelta ? (-1 * value) : (hp.value + hp.temp) - value;
			return this.applyDamage(delta);
		  }
		return super.modifyTokenAttribute(attribute, value, isDelta, isBar);
	}

	/**
   * Apply a certain amount of damage or healing to the health pool for Actor
   * @param {number} amount       An amount of damage (positive) or healing (negative) to sustain
   * @param {number} multiplier   A multiplier which allows for resistance, vulnerability, or healing
   * @returns {Promise<Actor5e>}  A Promise which resolves once the damage has been applied
   */
	async applyDamage(amount=0, multiplier=1) {
		amount = Math.floor(parseInt(amount) * multiplier);
		const hp = this.data.data.resolve;
	
		// Deduct damage from temp HP first
		const tmp = parseInt(hp.temp) || 0;
		const dt = amount > 0 ? Math.min(tmp, amount) : 0;
	
		// Remaining goes to health
		const tmpMax = parseInt(hp.tempmax) || 0;
		const dh = Math.clamped(hp.value - (amount - dt), 0, hp.max + tmpMax);
	
		// Update the Actor
		const updates = {
		  "data.resolve.temp": tmp - dt,
		  "data.resolve.value": dh
		};
	
		// Delegate damage application to a hook
		// TODO replace this in the future with a better modifyTokenAttribute function in the core
		const allowed = Hooks.call("modifyTokenAttribute", {
		  attribute: "resolve",
		  value: amount,
		  isDelta: false,
		  isBar: true
		}, updates);
		return allowed !== false ? this.update(updates, {dhp: -amount}) : this;
	}
	

	_getResources(items) {
		items.sort((a, b) => a.data.sort - b.data.sort)
		
		let resources = {
			items: items,
			totalVisible: 0,
			totalHidden: 0,
			totalEquipped: 0,
			totalBulk: 0,
			totalValue: 0
		};
		items.forEach(function(item) {
			if (item.data.data.isHidden) {
				resources.totalHidden++;
			} else {
				resources.totalVisible++;
				if (item.data.data.canBeEquipped && item.data.data.isEquipped) {
					resources.totalEquipped++;
				}
				if (item.data.data.canHaveBulk) {
					resources.totalBulk += Number(item.data.data.bulk);
				}
				if (item.data.data.canHaveValue) {
					resources.totalValue += Number(item.data.data.value);
				}
			}
		});
		return resources;
	}

	_getPerks(items) {
		items.sort((a, b) => a.data.sort - b.data.sort)

		let perks = {
			items: items,
			totalVisible: 0,
			totalHidden: 0
		};
		items.forEach(function(item) {
			if (item.data.data.isHidden) {
				perks.totalHidden++;
			} else {
				perks.totalVisible++;
			}
		});
		return perks;
	}

	_getSkills(items) {
		items.sort((a, b) => a.data.sort - b.data.sort)

		let skills = {
			items: items,
			totalVisible: 0,
			totalHidden: 0
		};
		items.forEach(function(item) {
			if (item.data.data.isHidden) {
				skills.totalHidden++;
			} else {
				skills.totalVisible++;
			}
		});
		return skills;
	}

	_validateItems(items) {
		items.forEach(function(item) {
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
		});
	}

	_getItemModifiers(items) {
		let modifiers = {};
		items.filter(x => !x.data.data.isHidden && (x.type != "resource" || x.type == "resource" && x.data.data.canBeEquipped && x.data.data.isEquipped)).forEach(function(item) {
			item.data.data.modifiers.forEach(function(modifier) {
				if (!modifiers[modifier.type]) {
					modifiers[modifier.type] = {
						total: 0,
						sources: []
					};
				}
				modifiers[modifier.type].total += Number(modifier.value);
				modifiers[modifier.type].sources.push({
					value: (modifier.value > 0 ? `+${modifier.value}` : modifier.value),
					source: item.name,
					name: game.i18n.localize(`common.${modifier.type}.code`)
				});
			});
		});
		return modifiers;
	}

	calculateMaxBulk(actor) {
		let calculation
		switch (actor.data.size) {
			case "tiny":
				calculation = 6 + actor.data.attributes["str"].total / 5
				return calculation < 5 ? 5 : calculation
			case "small":
				calculation = 14 + actor.data.attributes["str"].total / 5
				return calculation < 10 ? 10 : calculation
			case "medium":
				calculation = 18 + actor.data.attributes["str"].total / 5
				return calculation < 20 ? 20 : calculation
			case "large":
				calculation =  22 + (actor.data.attributes["str"].total / 5) * 2
				return calculation < 40 ? 40 : calculation
			case "huge":
				calculation = 30 + (actor.data.attributes["str"].total / 5) * 4
				return calculation < 80 ? 80 : calculation
			case "gargantuan":
				calculation = 46 + (actor.data.attributes["str"].total / 5) * 8
				return calculation < 160 ? 160 : calculation
			default:
				calculation = 18 + actor.data.attributes["str"].total / 5
				return calculation < 20 ? 20 : calculation
		}
	}

	_applyAttributeModifier(actor, attribute, modifier) {
		if (!actor.data.attributes[attribute].modifier) {
			actor.data.attributes[attribute].modifier = 0;
		}
		if (!actor.data.attributes[attribute].sources) {
			actor.data.attributes[attribute].sources = [{
				value: (actor.data.attributes[attribute].base > 0 ? `+${actor.data.attributes[attribute].base}` : actor.data.attributes[attribute].base),
				source: `base`
			}];
		}
		if (modifier) {
			actor.data.attributes[attribute].modifier = modifier.total;
			actor.data.attributes[attribute].sources = actor.data.attributes[attribute].sources.concat(modifier.sources);
		}
		actor.data.attributes[attribute].total = actor.data.attributes[attribute].base + actor.data.attributes[attribute].modifier;
		actor.data.attributes[attribute].class = (actor.data.attributes[attribute].modifier == 0) ? "neutral" : (actor.data.attributes[attribute].modifier > 0) ? "higher" : "lower";
		if (attribute === "str") {
			actor.data.resources.maxBulk = this.calculateMaxBulk(actor)
		}
	}

	_applyArchetypeModifier(actor, archetype, modifier) {
		if (!actor.data.archetypes[archetype].modifier) {
			actor.data.archetypes[archetype].modifier = 0;
		}
		if (!actor.data.archetypes[archetype].sources) {
			actor.data.archetypes[archetype].sources = [{
				value: (actor.data.archetypes[archetype].base > 0 ? `+${actor.data.archetypes[archetype].base}` : actor.data.archetypes[archetype].base),
				source: `base`
			}];
		}
		if (modifier) {
			actor.data.archetypes[archetype].modifier = modifier.total;
			actor.data.archetypes[archetype].sources = actor.data.archetypes[archetype].sources.concat(modifier.sources);
		}
		actor.data.archetypes[archetype].total = actor.data.archetypes[archetype].base + actor.data.archetypes[archetype].modifier;
		actor.data.archetypes[archetype].class = (actor.data.archetypes[archetype].modifier == 0) ? "neutral" : (actor.data.archetypes[archetype].modifier > 0) ? "higher" : "lower";
	}

	_applyResolveModifier(actor, modifier) {
		if (!actor.data.resolve.modifier) {
			actor.data.resolve.modifier = 0;
		}
		if (!actor.data.resolve.sources) {
			actor.data.resolve.sources = [{
				value: actor.data.resolve.base,
				source: `base`
			}];
		}
		if (modifier) {
			actor.data.resolve.modifier = modifier.total;
			actor.data.resolve.sources = actor.data.resolve.sources.concat(modifier.sources);
		}
		actor.data.resolve.max = actor.data.resolve.sources.reduce((a, b) => +a + +b.value, 0);
		actor.data.resolve.class = (actor.data.resolve.modifier == 0) ? "neutral" : (actor.data.resolve.modifier > 0) ? "higher" : "lower";
	}
}
