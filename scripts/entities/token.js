/**
 * Extend the base TokenDocument class to implement additional system-specific logic.
 */
export default class TokenDocumentEntity extends TokenDocument {
    getBarAttribute(barName, {alternative}={}) {
        const data = super.getBarAttribute(barName, {alternative});
        const attr = alternative || this.data[barName]?.attribute;
        if ( !data || !attr || !this.actor ) return data;
        const current = foundry.utils.getProperty(this.actor.data.data, attr);
        if ( current?.dtype === "Resource" ) data.min = parseInt(current.min || 0);
        data.editable = true;
        data.type = "bar";
        data.max = this.actor.data.data.resolve.maximum.total
        data.min = 0;
        return data;
    }
 
}
